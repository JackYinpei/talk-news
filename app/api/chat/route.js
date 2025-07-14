// app/api/chat/route.js
import { NextResponse } from 'next/server';

// This is a mock chat endpoint.
// In a real application, you would integrate the Gemini API.
const mockChat = (article, targetLang) => {
  const summary = `This article is about "${article.title}". It discusses the main points of the news.`;
  const questions = [
    `What do you think about this news in ${targetLang}?`,
    `Can you summarize this article in one sentence in ${targetLang}?`,
    `What is the most interesting part of this news for you?`,
  ];
  return {
    summary,
    questions,
  };
};

export async function POST(request) {
  try {
    const { article, targetLang } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY') {
        // Mock response if API key is not set
        const mockResponse = mockChat(article, targetLang);
        return NextResponse.json(mockResponse);
    }

    // Here you would add the actual Gemini API call
    // For now, we'll just return the mock response
    const response = mockChat(article, targetLang);

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json({ error: 'An unexpected error occurred during chat initiation.' }, { status: 500 });
  }
}
