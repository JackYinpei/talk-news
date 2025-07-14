// app/components/NewsCardSkeleton.js
export default function NewsCardSkeleton() {
  return (
    <div className="bg-white p-4 rounded-lg shadow-md mb-4 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </div>
  );
}
