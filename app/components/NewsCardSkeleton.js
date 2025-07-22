// app/components/NewsCardSkeleton.js
'use client';

export default function NewsCardSkeleton() {
  return (
    <div className="bg-white p-4 rounded-lg shadow-md mb-4 flow-root">
      <div className="w-24 h-24 bg-gray-200 rounded-md flex-shrink-0 float-left mr-4 mb-2"></div>
      <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
      <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </div>
  );
}

