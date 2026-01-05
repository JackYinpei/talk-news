
import fs from 'fs';

export function toWavBuffer(pcmData) {
    const channels = 1;
    const sampleRate = 24000;
    const bitDepth = 16;
    const dataLength = pcmData.length;

    const buffer = Buffer.alloc(44);
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataLength, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(channels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * channels * (bitDepth / 8), 28);
    buffer.writeUInt16LE(channels * (bitDepth / 8), 32);
    buffer.writeUInt16LE(bitDepth, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataLength, 40);

    return Buffer.concat([buffer, pcmData]);
}

export function cleanDescription(html) {
    if (!html) return '';
    let clean = html;
    clean = clean.replace(/<h3>Sources:?<\/h3>[\s\S]*/i, '');
    clean = clean.replace(/<img[^>]*>/g, '');
    clean = clean.replace(/<a[^>]*>([^<]+)<\/a>/g, '$1');
    clean = clean.replace(/<br\s*\/?>/gi, '\n');
    return clean.trim();
}

export async function backupAudioToDisk(filepath, buffer) {
    try {
        await fs.promises.writeFile(filepath, buffer);
        console.log("Async backup saved to:", filepath);
    } catch (err) {
        console.error("Failed to save backup audio:", err);
    }
}

export const GENERATION_PROMPTS = {
    script: (newsContext) => `
Role: You are the Lead Producer for "LingDaily News", a high-end bilingual education podcast.

Context Information:
${newsContext}

Task:
Generate a comprehensive news package based on the provided information, outputting strictly in JSON format.

Requirements:

1. **Title**: Create a catchy, click-worthy headline that blends Chinese and English (e.g., "Gelsenkirchen 大劫案...").

2. **Summary (Deep Dive Analysis)**:
   - Write a structured, professional analysis in Markdown.
   - **Constraint**: MUST be at least 1000 words.
   - **Expansion Strategy**: Since the source might be concise, you must expand by:
     - Detailed breakdown of each news event.
     - Background context (History, geography, or industry standards related to the news).
     - Potential global or local impact.
     - Expert perspectives or public reaction (based on the context or logical inference).
     - Use a professional, journalistic tone.

3. **Podcast Script (The Jaz Monologue)**:
   - Host: Jaz.
   - Tone: "The Morning Hype" style (High energy, enthusiastic, witty, and fast-paced).
   - Language Mix: **70% Chinese, 30% English**.
     - Use Chinese for the main narrative and logical flow.
     - Use English for key terms, headlines, punchlines, or to repeat important points for language learners.
     - Ensure the transition between languages is smooth and natural (bilingual "Chinglish" style for education).
   - **Strict Formatting**: The script must be a continuous flow of speech.
     - **DO NOT** include markers like "Jaz:", "Introduction:", "[Music]", "01.", or any cues.
     - It must be a single block of text ready to be read aloud from start to finish.
   - Content Flow: Jaz should introduce the news, explain 3-5 key English vocabulary words naturally within the storytelling, provide one or two witty comments after each news item, and wrap up with a "stay hyped" closing.

Output Format (JSON):
{
  "title": "...",
  "summary": "...",
  "script": "..."
}
`,
    tts: (script) => `
# AUDIO PROFILE: Jaz R.
## "The LingDaily Host"

## THE SCENE: The Studio
The content is news. Energetic, clear study vibe.

### DIRECTOR'S NOTES
Style:
* The "Vocal Smile": Bright, sunny, inviting.
* Bilingual: Fluent English with natural Chinese explanations or interjections.
* Pace: Energetic but clear.

#### TRANSCRIPT
${script}
`
};
