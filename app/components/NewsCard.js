'use client';

export default function NewsCard({ article, onClick }) {
  return (
    <div 
      className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer mb-4"
      onClick={onClick}
    >
      <h3 className="text-lg font-bold text-gray-800">{article.title}</h3>
      {article.translatedTitle && (
        <p className="text-sm text-gray-500 mt-1">{article.translatedTitle}</p>
      )}
    </div>
  );
}
