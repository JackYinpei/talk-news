"use client";

import { useEffect, useState, useCallback } from "react";
import { NewsCard } from "./NewsCard";

// 新闻分类数据，保留一些主要的英文分类
const categories = [
  { categoryId: 'world', categoryName: 'World', sourceLanguage: 'en' },
  { categoryId: 'ai', categoryName: 'AI', sourceLanguage: 'en' },
  { categoryId: 'tech', categoryName: 'Technology', sourceLanguage: 'en' },
  { categoryId: 'business', categoryName: 'Business', sourceLanguage: 'en' },
  { categoryId: 'science', categoryName: 'Science', sourceLanguage: 'en' },
];

export default function NewsFeed({ onArticleSelect, selectedNews = null, targetLanguage = 'zh-CN', nativeLanguage = 'zh-CN', isMobile = false }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory] = useState(categories[0].categoryId);

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
      
      const newArticles = Array.from(items).slice(0, 10).map((item, index) => {
        let description = item.querySelector('description')?.textContent || '';
        const sourcesIndex = description.indexOf('<h3>Sources:</h3>');
        if (sourcesIndex !== -1) {
          description = description.substring(0, sourcesIndex);
        }
        
        // 清理HTML标签和引用标记
        description = description.replace(/<[^>]*>/g, '').trim();
        // 清理各种引用标记格式: [site.com#1], [site.com], [#1], etc.
        description = description.replace(/\[[^\]]*(?:\.com|\.org|\.net|#\d+)[^\]]*\]/g, '').trim();
        // 清理多余的空白字符
        description = description.replace(/\s+/g, ' ').trim();
        
        const imgMatch = description.match(/<img src='([^']*)'/);
        const urlToImage = imgMatch ? imgMatch[1] : null;
        
        return {
          id: `${category}-${index}`,
          title: item.querySelector('title')?.textContent || 'Untitled',
          link: item.querySelector('link')?.textContent || '',
          description: description || 'No description available',
          urlToImage: urlToImage,
          category: categories.find(cat => cat.categoryId === category)?.categoryName || 'News',
          date: item.querySelector('pubDate')?.textContent || new Date().toISOString(),
        };
      });

      setArticles(newArticles);
      translateArticleTitles(newArticles);

    } catch (err) {
      console.error('Failed to fetch news:', err);
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

  if (loading) {
    return (
      <div className={isMobile ? "flex gap-3" : "space-y-4 px-2 py-2"}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className={`bg-card rounded-lg border p-4 ${isMobile ? "min-w-[280px]" : ""}`}>
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-full mb-1"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-red-500 bg-red-100 p-3 rounded-lg">
          Error loading news: {error}
        </div>
      </div>
    );
  }

  return (
    <div className={isMobile ? "flex gap-3" : "space-y-4 px-2 py-2"}>
      {articles.map((article) => {
        // 转换数据格式以匹配现有NewsCard组件
        const newsData = {
          id: article.id,
          title: article.translatedTitle || article.title,
          description: article.description,
          category: article.category,
          date: article.date,
          originalTitle: article.title,
          link: article.link
        };
        
        return (
          <NewsCard
            key={article.id}
            news={newsData}
            isSelected={selectedNews?.id === article.id}
            onSelect={() => onArticleSelect && onArticleSelect(newsData)}
            compact={isMobile}
          />
        );
      })}
    </div>
  );
}