// app/api/news/route.js
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const language = searchParams.get('language') || 'en';
  const apiKey = process.env.NEWS_API_KEY;

  if (!apiKey || apiKey === 'YOUR_NEWS_API_KEY') {
    return NextResponse.json(
      { error: 'News API key is not configured.' },
      { status: 500 }
    );
  }

  const url = `https://newsapi.org/v2/top-headlines?language=${language}&apiKey=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ error: errorData.message || 'Failed to fetch news' }, { status: response.status });
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching news:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
