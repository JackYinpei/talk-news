
'use client';

export default function CategoryTabs({ categories, selectedCategory, onSelectCategory }) {
  return (
    <div className="mb-4 overflow-x-auto">
      <div className="flex space-x-4 border-b-2 border-gray-200">
        {categories.map((category) => (
          <button
            key={category.categoryId}
            onClick={() => onSelectCategory(category.categoryId)}
            className={`py-2 px-4 text-sm font-medium whitespace-nowrap ${
              selectedCategory === category.categoryId
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {category.categoryName}
          </button>
        ))}
      </div>
    </div>
  );
}
