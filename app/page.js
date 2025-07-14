'use client';

import { useState } from 'react';
import NewsFeed from './components/NewsFeed';
import ArticleDetail from './components/ArticleDetail';
import ChatWindow from './components/ChatWindow';
import LanguageSelectionModal from './components/LanguageSelectionModal';

export default function Home() {
  const [selectedArticle, setSelectedArticle] = useState(null);

  return (
    <>
      <LanguageSelectionModal />
      <main className="flex flex-col md:flex-row h-screen p-4 gap-4 bg-gray-50">
        {/* Left Panel: News Feed */}
        <div className="md:w-1/3 lg:w-1/4 h-full">
          <NewsFeed onArticleSelect={setSelectedArticle} />
        </div>

        {/* Right Panel: Article and Chat */}
        <div className="md:w-2/3 lg:w-3/4 h-full flex flex-col gap-4">
          <ArticleDetail article={selectedArticle} />
          <ChatWindow article={selectedArticle} />
        </div>
      </main>
    </>
  );
}
