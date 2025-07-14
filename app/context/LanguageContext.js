'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageProvider({ children }) {
  const [nativeLanguage, setNativeLanguage] = useState(null);
  const [targetLanguage, setTargetLanguage] = useState(null);
  const [isLanguageModalOpen, setLanguageModalOpen] = useState(false);

  useEffect(() => {
    const savedNative = localStorage.getItem('nativeLanguage');
    const savedTarget = localStorage.getItem('targetLanguage');

    if (savedNative && savedTarget) {
      setNativeLanguage(savedNative);
      setTargetLanguage(savedTarget);
    } else {
      setLanguageModalOpen(true);
    }
  }, []);

  const handleLanguageSelection = (nativeLang, targetLang) => {
    localStorage.setItem('nativeLanguage', nativeLang);
    localStorage.setItem('targetLanguage', targetLang);
    setNativeLanguage(nativeLang);
    setTargetLanguage(targetLang);
    setLanguageModalOpen(false);
  };

  const value = {
    nativeLanguage,
    targetLanguage,
    isLanguageModalOpen,
    handleLanguageSelection,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
