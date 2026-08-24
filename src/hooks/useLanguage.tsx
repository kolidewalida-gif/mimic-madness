import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

/**
 * Cosmetic language preference — persisted like the theme, but the UI text
 * itself stays in French for now (no i18n dictionaries exist yet). Selecting
 * a language still has a real effect: it updates <html lang>, which is what
 * screen readers, voice assistants and browser auto-translate tools rely on
 * to pick the right pronunciation/translation engine.
 */
export type LanguageCode = 'fr' | 'en' | 'es' | 'de' | 'it' | 'pt';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  languages: LanguageCode[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const languages: LanguageCode[] = ['fr', 'en', 'es', 'de', 'it', 'pt'];

export const languageConfig: Record<LanguageCode, { name: string; flag: string }> = {
  fr: { name: 'Français', flag: '🇫🇷' },
  en: { name: 'English', flag: '🇬🇧' },
  es: { name: 'Español', flag: '🇪🇸' },
  de: { name: 'Deutsch', flag: '🇩🇪' },
  it: { name: 'Italiano', flag: '🇮🇹' },
  pt: { name: 'Português', flag: '🇵🇹' },
};

const isLanguageCode = (value: string | null): value is LanguageCode =>
  !!value && (languages as string[]).includes(value);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    const saved = localStorage.getItem('game-language');
    return isLanguageCode(saved) ? saved : 'fr';
  });

  const setLanguage = (next: LanguageCode) => {
    setLanguageState(next);
    localStorage.setItem('game-language', next);
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, languages }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
