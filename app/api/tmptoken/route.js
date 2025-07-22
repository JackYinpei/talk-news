import { NextResponse } from 'next/server';

import { GoogleGenAI, Modality } from '@google/genai';

const client = new GoogleGenAI({});
const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();

async function createToken() {
  const token = await client.authTokens.create({
    config: {
      uses: 1, // The default
      expireTime: expireTime,
      liveConnectConstraints: {
        model: 'gemini-2.5-flash-preview-native-audio-dialog',
        config: {
          sessionResumption: {},
          temperature: 0.7,
          responseModalities: [Modality.AUDIO]
        }
      },
      httpOptions: {
        apiVersion: 'v1alpha'
      }
    }
  });
  console.log("What does the token looks like", token)
  return token.name
}

export async function GET() {
  try {
    const token = await createToken();
    return NextResponse.json(token);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
