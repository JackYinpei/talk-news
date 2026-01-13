import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import {
    initClients,
    fetchAllNews,
    generateContentWithGemini,
    generateAudioElevenLabs,
    generateAudioGemini,
    uploadToR2,
    estimateDuration
} from '@/app/lib/podcastWorkflow';

// Configuration
const CATEGORIES = ['world', 'tech', 'business', 'science', 'ai', 'crypto', 'gaming'];
export const maxDuration = 300;

// Initialize Clients
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// We init AI and S3 inside the helper or pass them in. 
// The helper `initClients` is available if we need to pass instances explicitly, 
// but the functions default to creating new ones if not passed. 
// For route handlers, it's fine to let them init or we can init once here.
const { ai, s3Client, elevenLabs } = initClients();

/**
 * ENTRY POINT
 */
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const date = searchParams.get('date');
        const force = searchParams.get('force') === 'true';

        const todayStr = new Date().toISOString().split('T')[0];
        const dateFolder = date || todayStr;

        // 1. Check if already running or completed
        const status = await checkStatus(dateFolder, 'daily_digest');
        if (status && !force) {
            if (status.status === 'in_progress') {
                return NextResponse.json({ status: 'in_progress', message: 'Generation already in progress.' });
            }
            if (status.status === 'completed') {
                return NextResponse.json({ status: 'completed', data: status });
            }
        }

        // 2. Lock / Check Resume
        // If status is 'script_generated' and not force, we can resume.
        // If status is 'failed', we can retry.
        // If 'in_progress', we block unless force.

        let existingState = null;
        if (status) {
            if (status.status === 'in_progress' && !force) {
                return NextResponse.json({ status: 'in_progress', message: 'Generation already in progress.' });
            }
            if (status.status === 'completed' && !force) {
                return NextResponse.json({ status: 'completed', data: status });
            }
            if ((status.status === 'script_generated' || (status.status === 'failed' && status.content)) && !force) {
                existingState = status;
                console.log("Resuming from saved state...");
            }
        }

        // Update status to in_progress (if not resuming, or even if resuming to show activity)
        await setStatus(dateFolder, 'daily_digest', 'in_progress');

        // 3. Execution Pipeline
        const result = await runGenerationPipeline(dateFolder, existingState);

        // 4. Update Success
        await updateResult(dateFolder, 'daily_digest', result);

        return NextResponse.json({ status: 'success', data: result });

    } catch (error) {
        console.error("Pipeline Error:", error);

        // Try to unlock or set failed
        const todayStr = new Date().toISOString().split('T')[0];
        const dateFolder = new URL(req.url).searchParams.get('date') || todayStr;
        await setStatus(dateFolder, 'daily_digest', 'failed', error.message);

        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * PIPELINE ORCHESTRATOR
 */
async function runGenerationPipeline(dateFolder, existingState = null) {
    let content;

    // STEP A & B: News & Script
    // If we have existing state with content, use it.
    if (existingState && existingState.content && existingState.script) {
        console.log(">>> [RESUME MODE] Skipping News Fetch & Script Generation.");
        console.log(`>>> Loaded script from DB (Length: ${existingState.script.length})`);

        content = {
            items: existingState.content,
            fullScript: existingState.script,
            title: existingState.title,
            summary: existingState.summary,
            allImages: existingState.image_url || []
        };
    } else {
        console.log(">>> [FRESH MODE] Starting fresh news fetch and script generation...");
        // A. Fetch all news
        const newsData = await fetchAllNews(CATEGORIES);

        // B. Generate Content (Script + Structure)
        content = await generateContentWithGemini(newsData, ai);

        // CHECKPOINT: Save script to DB immediately
        await setStatus(dateFolder, 'daily_digest', 'script_generated', null, content);
        console.log(">>> Checkpoint: Script saved to DB.");
    }

    // C. Generate Audio (Gemini or ElevenLabs)
    let audioBuffer;
    let contentType = 'audio/mpeg';
    let fileExtension = 'mp3';

    const ttsProvider = (process.env.TTS_PROVIDER || 'elevenlabs').toLowerCase(); // Default to ElevenLabs

    console.log(`>>> Starting Audio Generation using Provider: ${ttsProvider}...`);

    try {
        if (ttsProvider === 'gemini') {
            const audioResult = await generateAudioGemini(content.fullScript, ai);
            audioBuffer = audioResult.buffer;
            contentType = 'audio/wav';
            fileExtension = 'wav';
            if (!audioResult.isComplete) {
                console.warn(">>> WARNING: Gemini TTS Stream was interrupted. Saving partial audio.");
                console.log(">>> Full Script that was attempted:");
                console.log(content.fullScript);
            }
        } else {
            audioBuffer = await generateAudioElevenLabs(content.fullScript, elevenLabs);
            // Default is mp3, already set
        }
        console.log(`>>> Audio Generation Successful. Size: ${audioBuffer.length} bytes.`);
    } catch (err) {
        console.error(">>> Audio Generation Failed:", err);
        // If audio fails, we re-throw, but the outer loop will mark as failed.
        // Importantly, the script is already saved in 'script_generated' state (if we hit that checkpoint),
        // or effectively by the setStatus above. 
        // When the user retries, it will pick up the script.
        throw new Error(`Audio Generation Failed: ${err.message}`);
    }

    // D. Upload to R2
    const fileName = `${dateFolder}/daily_digest_${uuidv4()}.${fileExtension}`;

    // Pass s3Client and contentType
    const audioUrl = await uploadToR2(fileName, audioBuffer, s3Client, contentType);
    console.log(">>> Audio Uploaded to R2:", audioUrl);

    // E. Return structured data for DB
    return {
        ...content, // title, summary, script, images
        audioUrl,
        audioBytes: audioBuffer.length,
        audioDuration: estimateDuration(audioBuffer.length)
    };
}

/**
 * DB HELPERS
 */
async function checkStatus(dateFolder, category) {
    const { data } = await supabase
        .from('podcasts')
        .select('*')
        .eq('date_folder', dateFolder)
        .eq('category', category)
        .maybeSingle();
    return data;
}

async function setStatus(dateFolder, category, status, errorMessage = null, contentData = null) {
    const existing = await checkStatus(dateFolder, category);

    const payload = {
        category,
        date_folder: dateFolder,
        status,
        updated_at: new Date().toISOString(),
        error_message: errorMessage,

        // Preserve existing or update
        title: contentData?.title || existing?.title || 'Generative Podcast',
        summary: contentData?.summary || existing?.summary || 'Generating...',
        script: contentData?.fullScript || existing?.script || '',
        image_url: contentData?.allImages || existing?.image_url || [],
        content: contentData?.items || existing?.content || null
    };

    const { error } = await supabase
        .from('podcasts')
        .upsert(payload, { onConflict: 'category, date_folder' });

    if (error) throw new Error(`DB Error: ${error.message}`);
}

async function updateResult(dateFolder, category, result) {
    const { error } = await supabase
        .from('podcasts')
        .update({
            status: 'completed',
            title: result.title,
            summary: result.summary,
            script: result.fullScript,
            content: result.items,
            image_url: result.allImages,
            audio_url: result.audioUrl,
            audio_bytes: result.audioBytes,
            audio_duration_seconds: result.audioDuration
        })
        .eq('category', category)
        .eq('date_folder', dateFolder);

    if (error) throw new Error(`DB Update Error: ${error.message}`);
}
