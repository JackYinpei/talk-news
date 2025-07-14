// app/api/translate/route.js
import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions:{
    baseURL: process.env.GEMINI_BASE_URL
  }
});

export async function POST(request) {
  try {
    const { text, targetLang } = await request.json();

    if (!text || !targetLang) {
      return NextResponse.json({ error: 'Missing required parameters: text and targetLang' }, { status: 400 });
    }

    const prompt = `Translate the following text to ${targetLang}: ${text}`;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
    });

    const translatedText = response.text;

    return NextResponse.json({ translation: translatedText });
  } catch (error) {
    console.error('Error during translation:', error);
    return NextResponse.json({ error: 'An unexpected error occurred during translation.' }, { status: 500 });
  }
}