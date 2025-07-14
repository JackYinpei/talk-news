'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import NewsCard from './NewsCard';
import NewsCardSkeleton from './NewsCardSkeleton';

export default function NewsFeed({ onArticleSelect }) {
  const { targetLanguage, nativeLanguage } = useLanguage();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!targetLanguage || !nativeLanguage) {
      setLoading(false);
      return;
    }

    const fetchNews = async () => {
      setLoading(true);
      setError(null);
      try {
        // Simulate a longer loading time to see the skeleton
        await new Promise(resolve => setTimeout(resolve, 1000));

        const apiKey = process.env.NEXT_PUBLIC_NEWS_API_KEY;
        if (!apiKey || apiKey === 'YOUR_NEWS_API_KEY') {
          throw new Error('News API key is not configured. Please add NEXT_PUBLIC_NEWS_API_KEY to your .env.local file.');
        }
        const newsUrl = `https://newsapi.org/v2/top-headlines?language=${targetLanguage}&apiKey=${apiKey}`;
        const newsResponse = await fetch(newsUrl);

        if (!newsResponse.ok) {
          const errorData = await newsResponse.json();
          throw new Error(errorData.message || 'Failed to fetch news');
        }
        const newsData = await newsResponse.json();
        
        if (!newsData.articles) {
          setArticles([]);
          return;
        }

        const articlesWithTranslations = await Promise.all(
          newsData.articles.slice(0, 10).map(async (article) => {
            const transResponse = await fetch('/api/translate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: article.title, targetLang: nativeLanguage }),
            });
            const transData = await transResponse.json();
            return { ...article, translatedTitle: transData.translation };
          })
        );

        setArticles(articlesWithTranslations);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [targetLanguage, nativeLanguage]);

  return (
    <div className="h-full bg-gray-100 p-4 rounded-lg overflow-y-auto">
      <h2 className="text-xl font-bold mb-4 text-gray-800">News Feed</h2>
      {loading && (
        <div>
          {[...Array(5)].map((_, i) => <NewsCardSkeleton key={i} />)}
        </div>
      )}
      {error && <p className="text-red-500 bg-red-100 p-3 rounded-lg">{error}</p>}
      {!loading && !error && (
        <div>
          {articles.map((article) => (
            <NewsCard key={article.url} article={article} onClick={() => onArticleSelect(article)} />
          ))}
        </div>
      )}
    </div>
  );
}
