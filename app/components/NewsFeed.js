'use client';

import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import NewsCard from './NewsCard';
import NewsCardSkeleton from './NewsCardSkeleton';

const PAGE_SIZE = 10;

export default function NewsFeed({ onArticleSelect }) {
  const { targetLanguage, nativeLanguage } = useLanguage();
  const [articles, setArticles] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const translateArticleTitles = useCallback((newArticles) => {
    newArticles.forEach((article) => {
      if (!article.title) return;
      fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: article.title, targetLang: nativeLanguage }),
      })
      .then(res => res.ok ? res.json() : null)
      .then(transData => {
        if (transData && transData.translation) {
          setArticles(prevArticles =>
            prevArticles.map(prevArticle =>
              prevArticle.url === article.url
                ? { ...prevArticle, translatedTitle: transData.translation }
                : prevArticle
            )
          );
        }
      })
      .catch(err => {
        console.error(`Failed to translate article title: "${article.title}"`, err);
      });
    });
  }, [nativeLanguage]);

  const fetchNews = useCallback(async (currentPage) => {
    if (currentPage === 1) {
      setLoading(true);
      setArticles([]);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      const apiKey = process.env.NEXT_PUBLIC_NEWS_API_KEY;
      if (!apiKey || apiKey === 'YOUR_NEWS_API_KEY') {
        throw new Error('News API key is not configured. Please add NEXT_PUBLIC_NEWS_API_KEY to your .env.local file.');
      }
      const newsUrl = `https://newsapi.org/v2/top-headlines?language=${targetLanguage}&apiKey=${apiKey}&page=${currentPage}&pageSize=${PAGE_SIZE}`;
      const newsResponse = await fetch(newsUrl);

      if (!newsResponse.ok) {
        const errorData = await newsResponse.json();
        throw new Error(errorData.message || 'Failed to fetch news');
      }
      const newsData = await newsResponse.json();
      
      if (!newsData.articles || newsData.articles.length === 0) {
        setHasMore(false);
        return;
      }

      const newArticles = newsData.articles;
      setArticles(prev => [...prev, ...newArticles]);
      if (newArticles.length < PAGE_SIZE || (page * PAGE_SIZE >= newsData.totalResults)) {
        setHasMore(false);
      }
      
      translateArticleTitles(newArticles);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [targetLanguage, translateArticleTitles, page]);

  useEffect(() => {
    if (!targetLanguage || !nativeLanguage) {
      setLoading(false);
      return;
    }
    setPage(1);
    setHasMore(true);
    fetchNews(1);
  }, [targetLanguage, nativeLanguage, fetchNews]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNews(nextPage);
  };

  return (
    <div className="h-full bg-gray-100 p-4 rounded-lg overflow-y-auto">
      <h2 className="text-xl font-bold mb-4 text-gray-800">News Feed</h2>
      {loading && <>{[...Array(5)].map((_, i) => <NewsCardSkeleton key={i} />)}</>}
      {error && <p className="text-red-500 bg-red-100 p-3 rounded-lg">{error}</p>}
      
      {!loading && !error && (
        <div>
          {articles.map((article) => (
            <NewsCard key={article.url} article={article} onClick={() => onArticleSelect(article)} />
          ))}
        </div>
      )}

      {!loading && hasMore && (
        <div className="text-center mt-4">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full disabled:bg-gray-400"
          >
            {loadingMore ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}
