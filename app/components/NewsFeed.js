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
      
      const newArticles = Array.from(items).map((item, index) => {
        let description = item.querySelector('description')?.textContent || '';
        const sourcesIndex = description.indexOf('<h3>Sources:</h3>');
        if (sourcesIndex !== -1) {
          description = description.substring(0, sourcesIndex);
        }

        // 先提取图片URL（在清理HTML标签之前）
        const imgMatch = description.match(/<img src='([^']*)'/);
        const urlToImage = imgMatch ? imgMatch[1] : null;

        // 清理HTML标签
        description = description.replace(/<[^>]*>/g, '').trim();

        // 清理各种引用标记格式，包括但不限于: [lemonde.fr#1], [scmp.com#1], [site.com], [#1], etc.
        description = description.replace(/\[[^\]]*?(?:#\d+|\.[a-z]{2,4})[^\]]*?\]/gi, '').trim();

        // 清理多余的空白字符
        description = description.replace(/\s+/g, ' ').trim();
        
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
      // translateArticleTitles(newArticles);

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

  const CategorySelector = () => {
    const hasSelectedNews = isMobile && selectedNews;

    return (
      <div
        className={`transition-all duration-500 ease-in-out ${isMobile ? "px-2 sticky top-0 bg-background z-10" : "px-2"} ${
          hasSelectedNews
            ? 'max-h-0 opacity-0 pointer-events-none overflow-hidden'
            : 'max-h-20 opacity-100 pointer-events-auto mb-4'
        }`}
      >
        <div className="relative flex items-center min-h-0">
          <div
            className="flex overflow-x-auto gap-2 py-2"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#cbd5e1 #f1f5f9',
              touchAction: 'pan-x pinch-zoom',
              overscrollBehaviorX: 'contain',
              overscrollBehaviorY: 'none'
            }}
          >
            {categories.map((category) => (
              <button
                key={category.categoryId}
                onClick={() => setSelectedCategory(category.categoryId)}
                disabled={loading}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  selectedCategory === category.categoryId
                    ? "bg-primary text-primary-foreground shadow-md scale-105"
                    : "bg-secondary hover:bg-secondary/80 text-secondary-foreground hover:scale-102"
                } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {category.categoryName}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div>
        <CategorySelector />
        <div className={isMobile ? "flex gap-3" : "space-y-4 px-2 py-2"}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className={`bg-card rounded-lg border p-4 ${isMobile ? "min-w-[280px]" : ""}`}>
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-full mb-1"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <CategorySelector />
        <div className="p-4">
          <div className="text-red-500 bg-red-100 p-3 rounded-lg">
            Error loading news: {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <CategorySelector />
      <div 
        className={isMobile ? "flex gap-3 overflow-x-auto px-2" : "space-y-4 px-2 py-2"}
        style={isMobile ? {
          touchAction: 'pan-x pinch-zoom',
          scrollBehavior: 'smooth',
          overscrollBehaviorX: 'contain',
          overscrollBehaviorY: 'none'
        } : {}}
      >
        {articles.map((article) => {
        // 转换数据格式以匹配现有NewsCard组件
        const newsData = {
          id: article.id,
          title: article.translatedTitle || article.title,
          description: article.description,
          category: article.category,
          date: article.date,
          originalTitle: article.title,
          link: article.link,
          urlToImage: article.urlToImage
        };
        
        const isSelected = selectedNews?.id === article.id;
        
        return (
          <div 
            key={article.id}
            className={isMobile ? `flex-shrink-0 transition-all duration-300 w-[260px] h-48` : `transition-all duration-300 ${
              isSelected ? "h-96" : "h-48"
            }`}
          >
            <NewsCard
              news={newsData}
              isSelected={isSelected}
              onSelect={() => onArticleSelect && onArticleSelect(isSelected ? null : newsData)}
              compact={isMobile}
              expandedContent={isSelected && isMobile}
            />
          </div>
        );
      })}
      </div>
    </div>
  );
}
