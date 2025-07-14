'use client';

export default function ArticleDetail({ article }) {
  if (!article) {
    return (
      <div className="h-1/2 bg-gray-100 p-4 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">Select an article to read its details.</p>
      </div>
    );
  }

  return (
    <div className="h-1/2 bg-white p-6 rounded-lg overflow-y-auto shadow">
      <h2 className="text-2xl font-bold mb-3">{article.title}</h2>
      {article.author && <p className="text-sm text-gray-500 mb-1">By {article.author}</p>}
      {article.publishedAt && <p className="text-sm text-gray-500 mb-4">Published: {new Date(article.publishedAt).toLocaleDateString()}</p>}
      <p className="text-gray-700 leading-relaxed">{article.description}</p>
      <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline mt-4 inline-block">
        Read full story
      </a>
    </div>
  );
}
