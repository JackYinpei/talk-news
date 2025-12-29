
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from 'next/server';
import { auth } from "@/app/auth";

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

        // Token valid for 30 minutes
        const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();

        const token = await client.authTokens.create({
            config: {
                uses: 1, // One-time use per connection
                expireTime: expireTime,
                liveConnectConstraints: {
                    model: 'gemini-2.5-flash-native-audio-preview-12-2025',
                    config: {
                        sessionResumption: {},
                        temperature: 0.7,
                        responseModalities: ['AUDIO']
                    }
                },
                httpOptions: {
                    apiVersion: 'v1alpha'
                }
            }
        });

        // token.name is the actual token string needed by the client
        return NextResponse.json({ token: token.name });
    } catch (error) {
        console.error('Error creating Gemini token:', error);
        return NextResponse.json({ error: error.message || 'Failed to create token' }, { status: 500 });
    }
}
