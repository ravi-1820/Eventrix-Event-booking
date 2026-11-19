import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { translations } from '../i18n/translations';
import { 
  translateEvent as translateEventHelper,
  translateCity as translateCityHelper,
  translateCategory as translateCategoryHelper,
  translateVenue as translateVenueHelper
} from '../i18n/eventTranslator';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English', short: 'EN' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिंदी', short: 'HI' },
  { code: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી', short: 'GU' },
];

const STORAGE_KEY = 'eventrix_language';

const LanguageContext = createContext({
  language: 'en',
  setLanguage: () => {},
  t: (key, fallback) => fallback || key,
  translateEvent: (e) => e,
  translateCity: (c) => c,
  translateCategory: (cat) => cat,
  translateVenue: (v) => v,
  languages: SUPPORTED_LANGUAGES,
  currentLanguageObj: SUPPORTED_LANGUAGES[0],
});

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && (saved === 'en' || saved === 'hi' || saved === 'gu')) {
        return saved;
      }
    } catch (e) {
      console.warn('Could not read language from localStorage:', e);
    }
    return 'en';
  });

  const setLanguage = useCallback((newLang) => {
    if (newLang === 'en' || newLang === 'hi' || newLang === 'gu') {
      setLanguageState(newLang);
      try {
        localStorage.setItem(STORAGE_KEY, newLang);
        document.documentElement.lang = newLang;
      } catch (e) {
        console.warn('Could not persist language to localStorage:', e);
      }
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback((key, fallback = '') => {
    const langDict = translations[language] || translations['en'];
    if (langDict && langDict[key] !== undefined) {
      return langDict[key];
    }
    // Fallback to English dictionary
    if (translations['en'] && translations['en'][key] !== undefined) {
      return translations['en'][key];
    }
    return fallback || key;
  }, [language]);

  const translateEvent = useCallback((event) => {
    return translateEventHelper(event, language);
  }, [language]);

  const translateCity = useCallback((cityName) => {
    return translateCityHelper(cityName, language);
  }, [language]);

  const translateCategory = useCallback((catName) => {
    return translateCategoryHelper(catName, language);
  }, [language]);

  const translateVenue = useCallback((venueName) => {
    return translateVenueHelper(venueName, language);
  }, [language]);

  const currentLanguageObj = useMemo(() => {
    return SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    t,
    translateEvent,
    translateCity,
    translateCategory,
    translateVenue,
    languages: SUPPORTED_LANGUAGES,
    currentLanguageObj,
  }), [language, setLanguage, t, translateEvent, translateCity, translateCategory, translateVenue, currentLanguageObj]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
