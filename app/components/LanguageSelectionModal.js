'use client';

import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

// A simplified list of languages for the demo.
const languages = [
  { code: 'en', name: 'English' },
  { code: 'zh', name: '中文' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'ja', name: 'Japanese' },
];

export default function LanguageSelectionModal() {
  const { isLanguageModalOpen, handleLanguageSelection } = useLanguage();
  const [nativeLang, setNativeLang] = useState('English');
  const [targetLang, setTargetLang] = useState('French');

  if (!isLanguageModalOpen) {
    return null;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    handleLanguageSelection(nativeLang, targetLang);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Welcome to Talk News!</h2>
        <p className="text-center mb-6">First, let's set up your languages.</p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="native-lang" className="block text-lg font-medium mb-2">I speak...</label>
            <select
              id="native-lang"
              value={nativeLang}
              onChange={(e) => setNativeLang(e.target.value)}
              className="w-full p-3 border rounded-lg"
            >
              {languages.map(lang => (
                <option key={lang.code} value={lang.name}>{lang.name}</option>
              ))}
            </select>
          </div>
          <div className="mb-8">
            <label htmlFor="target-lang" className="block text-lg font-medium mb-2">I want to learn...</label>
            <select
              id="target-lang"
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="w-full p-3 border rounded-lg"
            >
              {languages.map(lang => (
                <option key={lang.code} value={lang.name}>{lang.name}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg text-lg hover:bg-blue-700 transition-colors">
            Start Learning
          </button>
        </form>
      </div>
    </div>
  );
}
