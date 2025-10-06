import { I18n } from 'i18n-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import translations
import en from './en.json';
import zh from './zh.json';
import ms from './ms.json';
import ta from './ta.json';

// Create i18n instance
const i18n = new I18n({
  en,
  zh,
  ms,
  ta,
});

i18n.defaultLocale = 'en';
i18n.locale = 'en';
i18n.enableFallback = true;

// ✅ Preserve TypeScript typing and safely wrap i18n.t
const originalTranslate = i18n.t.bind(i18n);

// Use `typeof i18n.t` to keep the same type
(i18n.t as typeof i18n.t) = ((key: any, options?: Record<string, any>) => {
  let result = originalTranslate(key, options);

  // Perform interpolation manually
  if (options && typeof result === 'string') {
    result = result.replace(/{(\w+)}/g, (_, variable) => {
      const value = options[variable];
      return value !== undefined ? String(value) : `{${variable}}`;
    });
  }

  return result;
}) as typeof i18n.t;

// Language storage key
const LANGUAGE_KEY = '@app_language';

// Get stored language
export const getStoredLanguage = async (): Promise<string> => {
  try {
    const language = await AsyncStorage.getItem(LANGUAGE_KEY);
    return language || 'en';
  } catch (error) {
    console.error('Error getting stored language:', error);
    return 'en';
  }
};

// Save selected language
export const setStoredLanguage = async (language: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
    i18n.locale = language;
  } catch (error) {
    console.error('Error saving language:', error);
  }
};

// Initialize i18n
export const initializeI18n = async () => {
  const storedLanguage = await getStoredLanguage();
  i18n.locale = storedLanguage;
};

export default i18n;
