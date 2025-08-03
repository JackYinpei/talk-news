'use client';

import { useState } from 'react';
import NewsFeed from '../components/NewsFeed';
import ArticleChatView from '../components/ArticleChatView';
import LanguageSelectionModal from '../components/LanguageSelectionModal';

export default function TalkPage() {
  const [selectedArticle, setSelectedArticle] = useState(null);

  const handleCloseArticle = () => {
    setSelectedArticle(null);
  };

  return (
    <>
      <LanguageSelectionModal />
      <main className="flex flex-col md:flex-row h-screen p-4 gap-4 bg-gray-50">
        {/* Left Panel: News Feed */}
        <div
          className={`h-full md:w-1/3 lg:w-1/4 ${
            selectedArticle ? 'hidden md:block' : 'block'
          }`}
        >
          <NewsFeed onArticleSelect={setSelectedArticle} />
        </div>

        {/* Right Panel: Article and Chat */}
        <div
          className={`h-full flex-col md:w-2/3 lg:w-3/4 ${
            selectedArticle ? 'flex' : 'hidden md:flex'
          }`}
        >
          <ArticleChatView
            article={selectedArticle}
            onClose={handleCloseArticle}
          />
        </div>
      </main>
    </>
  );
}