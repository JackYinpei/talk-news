'use client';

import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import NewsCard from './NewsCard';
import NewsCardSkeleton from './NewsCardSkeleton';
import CategoryTabs from './CategoryTabs';

const categories = [
  { categoryId: 'world', categoryName: 'World', sourceLanguage: 'en' },
  { categoryId: 'usa_|_vermont', categoryName: 'USA | Vermont', sourceLanguage: 'en' },
  { categoryId: 'bitcoin', categoryName: 'Bitcoin', sourceLanguage: 'en' },
  { categoryId: 'usa_|_virginia', categoryName: 'USA | Virginia', sourceLanguage: 'en' },
  { categoryId: 'economy', categoryName: 'Economy', sourceLanguage: 'en' },
  { categoryId: 'cybersecurity', categoryName: 'Cybersecurity', sourceLanguage: 'en' },
  { categoryId: 'colombia', categoryName: 'Colombia', sourceLanguage: 'es' },
  { categoryId: 'china', categoryName: 'China', sourceLanguage: 'zh-Hans' },
  { categoryId: 'japan', categoryName: 'Japan', sourceLanguage: 'ja' },
  { categoryId: 'ai', categoryName: 'AI', sourceLanguage: 'en' },
  { categoryId: 'taiwan', categoryName: 'Taiwan', sourceLanguage: 'zh-Hant' },
  { categoryId: 'linux_oss', categoryName: 'Linux & OSS', sourceLanguage: 'en' },
  { categoryId: 'estonia', categoryName: 'Estonia', sourceLanguage: 'et' },
  { categoryId: 'bay', categoryName: 'Bay', sourceLanguage: 'en' },
  { categoryId: 'switzerland_(de)', categoryName: 'Switzerland (DE)', sourceLanguage: 'de' },
  { categoryId: 'germany_|_hesse', categoryName: 'Germany | Hesse', sourceLanguage: 'de' },
  { categoryId: 'new_zealand', categoryName: 'New Zealand', sourceLanguage: 'en' },
  { categoryId: 'canada', categoryName: 'Canada', sourceLanguage: 'en' },
  { categoryId: 'science', categoryName: 'Science', sourceLanguage: 'en' },
  { categoryId: 'slovenia', categoryName: 'Slovenia', sourceLanguage: 'sl' },
  { categoryId: 'pakistan', categoryName: 'Pakistan', sourceLanguage: 'en' },
  { categoryId: 'portugal', categoryName: 'Portugal', sourceLanguage: 'pt' },
  { categoryId: 'apple', categoryName: 'Apple', sourceLanguage: 'en' },
  { categoryId: 'europe', categoryName: 'Europe', sourceLanguage: 'en' },
  { categoryId: 'finland', categoryName: 'Finland', sourceLanguage: 'fi' },
  { categoryId: 'south_korea', categoryName: 'South Korea', sourceLanguage: 'ko' },
  { categoryId: 'australia', categoryName: 'Australia', sourceLanguage: 'en' },
  { categoryId: 'business', categoryName: 'Business', sourceLanguage: 'en' },
  { categoryId: 'thailand', categoryName: 'Thailand', sourceLanguage: 'th' },
  { categoryId: 'poland', categoryName: 'Poland', sourceLanguage: 'pl' },
  { categoryId: 'usa', categoryName: 'USA', sourceLanguage: 'en' },
  { categoryId: 'gaming', categoryName: 'Gaming', sourceLanguage: 'en' },
  { categoryId: 'belgium', categoryName: 'Belgium', sourceLanguage: 'nl' },
  { categoryId: 'ireland', categoryName: 'Ireland', sourceLanguage: 'en' },
  { categoryId: 'ukraine', categoryName: 'Ukraine', sourceLanguage: 'uk' },
  { categoryId: 'israel', categoryName: 'Israel', sourceLanguage: 'he' },
  { categoryId: 'costa_rica', categoryName: 'Costa Rica', sourceLanguage: 'es' },
  { categoryId: 'the_netherlands', categoryName: 'The Netherlands', sourceLanguage: 'nl' },
  { categoryId: 'serbia', categoryName: 'Serbia', sourceLanguage: 'sr' },
  { categoryId: 'germany', categoryName: 'Germany', sourceLanguage: 'de' },
  { categoryId: 'brazil', categoryName: 'Brazil', sourceLanguage: 'pt' },
  { categoryId: 'cryptocurrency', categoryName: 'Cryptocurrency', sourceLanguage: 'en' },
  { categoryId: 'czech_republic', categoryName: 'Czech Republic', sourceLanguage: 'cs' },
  { categoryId: 'uk', categoryName: 'UK', sourceLanguage: 'en' },
  { categoryId: 'sweden', categoryName: 'Sweden', sourceLanguage: 'sv' },
  { categoryId: 'mexico', categoryName: 'Mexico', sourceLanguage: 'es' },
  { categoryId: 'romania', categoryName: 'Romania', sourceLanguage: 'ro' },
  { categoryId: 'sports', categoryName: 'Sports', sourceLanguage: 'en' },
  { categoryId: 'spain', categoryName: 'Spain', sourceLanguage: 'es' },
  { categoryId: 'tech', categoryName: 'Technology', sourceLanguage: 'en' },
  { categoryId: 'italy', categoryName: 'Italy', sourceLanguage: 'it' },
  { categoryId: 'india', categoryName: 'India', sourceLanguage: 'en' },
  { categoryId: 'france', categoryName: 'France', sourceLanguage: 'fr' },
];

export default function NewsFeed({ onArticleSelect }) {
  const { nativeLanguage } = useLanguage();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(categories[0].categoryId);

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
              prevArticle.link === article.link
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

  const fetchNews = useCallback(async (category) => {
    setLoading(true);
    setError(null);
    setArticles([]);

    try {
      const response = await fetch(`https://kite.kagi.com/${category}.xml`);
      if (!response.ok) {
        throw new Error(`Failed to fetch news for category: ${category}`);
      }
      const rssText = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(rssText, 'application/xml');
      const items = xmlDoc.querySelectorAll('item');
      
      const newArticles = Array.from(items).map(item => {
        let description = item.querySelector('description').textContent;
        const sourcesIndex = description.indexOf('<h3>Sources:</h3>');
        if (sourcesIndex !== -1) {
          description = description.substring(0, sourcesIndex);
        }
        const imgMatch = description.match(/<img src='([^']*)'/);
        const urlToImage = imgMatch ? imgMatch[1] : null;
        
        return {
          title: item.querySelector('title').textContent,
          link: item.querySelector('link').textContent,
          description: description,
          urlToImage: urlToImage,
        };
      });

      setArticles(newArticles);
      translateArticleTitles(newArticles);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [translateArticleTitles]);

  useEffect(() => {
    if (selectedCategory) {
      fetchNews(selectedCategory);
    }
  }, [selectedCategory, fetchNews]);

  return (
    <div className="h-full bg-gray-100 p-4 rounded-lg overflow-y-auto">
      <h2 className="text-xl font-bold mb-4 text-gray-800">News Feed</h2>
      <CategoryTabs
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />
      
      {loading && articles.length === 0 && (
        <>{[...Array(5)].map((_, i) => <NewsCardSkeleton key={i} />)}</>
      )}

      {error && <p className="text-red-500 bg-red-100 p-3 rounded-lg">{error}</p>}
      
      {!error && (
        <div>
          {articles.map((article) => (
            <NewsCard key={article.link} article={article} onClick={() => onArticleSelect(article)} />
          ))}
        </div>
      )}
    </div>
  );
}
