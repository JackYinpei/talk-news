
import { GoogleGenAI, Type, Behavior, Modality } from "@google/genai";
import { NextResponse } from 'next/server';
import { auth } from "@/app/auth";

export const extractUnfamiliarEnglishToolDecl = {
    name: "extract_unfamiliar_english",
    behavior: Behavior.NON_BLOCKING,
    description: "Aggressive MODE: Call this tool AGGRESSIVELY whenever the above history contains ANY English (full sentence, a single word, code comments, or CN-EN mixed). Even if the user does NOT explicitly ask about a word, scan for potentially unfamiliar vocabulary, phrases, collocations, idioms, phrasal verbs, or grammar patterns",
    parameters: {
        type: Type.OBJECT,
        properties: {
            userMessage: {
                type: Type.STRING,
                description: "The user's original message that was analyzed"
            },
            items: {
                type: Type.ARRAY,
                description: "List of unfamiliar or interesting elements identified from user input",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        text: {
                            type: Type.STRING,
                            description: "The exact word, phrase, or grammar pattern the user is unsure about or curious about"
                        },
                        type: {
                            type: Type.STRING,
                            enum: ["word", "phrase", "grammar", "other"],
                            description: "The category of the unfamiliar element"
                        }
                    },
                    required: ["text", "type"]
                }
            },
            context: {
                type: Type.STRING,
                description: "Additional context about the conversation or user level if known"
            }
        },
        required: ["userMessage", "items"]
    }
};

export async function POST() {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Prefer server-side keys
        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: 'Server API key not configured' }, { status: 500 });
        }

        const client = new GoogleGenAI({ apiKey });

        const toolsConfig = [{ functionDeclarations: [extractUnfamiliarEnglishToolDecl] }, { googleSearch: {} }];

        // Token valid for 30 minutes
        const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();

        const token = await client.authTokens.create({
            config: {
                uses: 1, // One-time use per connection
                expireTime: expireTime,
                liveConnectConstraints: {
                    model: 'gemini-2.5-flash-native-audio-preview-12-2025',
                    config: {
                        responseModalities: [Modality.AUDIO],
                        speechConfig: {
                            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
                        },
                        tools: toolsConfig,
                        outputAudioTranscription: {},
                        inputAudioTranscription: {},
                        thinkingConfig: {
                            thinkingBudget: 1024,
                        },
                    }
                },
                httpOptions: {
                    apiVersion: 'v1alpha'
                },
            }
        });

        // token.name is the actual token string needed by the client
        return NextResponse.json({ token: token.name });
    } catch (error) {
        console.error('Error creating Gemini token:', error);
        return NextResponse.json({ error: error.message || 'Failed to create token' }, { status: 500 });
    }
}
