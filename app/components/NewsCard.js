'use client';

export default function NewsCard({ article, onClick }) {
  return (
    <div
      className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer mb-4 flex items-start gap-4"
      onClick={onClick}
    >
      <div className="w-24 h-24 flex-shrink-0">
        {article.urlToImage ? (
          <img
            src={article.urlToImage}
            alt={article.title}
            className="w-full h-full object-cover rounded-md"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 rounded-md flex items-center justify-center">
            <span className="text-xs text-gray-500">No Image</span>
          </div>
        )}
      </div>
      <div className="flex-grow">
        <h3 className="text-lg font-bold text-gray-800">{article.title}</h3>
        {article.translatedTitle && (
          <p className="text-sm text-gray-500 mt-1">{article.translatedTitle}</p>
        )}
      </div>
    </div>
  );
}
