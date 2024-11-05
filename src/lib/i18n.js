import { writable, derived, get } from 'svelte/store';
import en from '../locales/en.json';
import es from '../locales/es.json';

const translations = { en, es };

export const currentLanguage = writable('en');

// Create a derived store for the current translations object
export const activeTranslations = derived(
  currentLanguage,
  ($currentLanguage) => translations[$currentLanguage] || translations.en
);

// Export a regular translation function that uses the store value
export function t(key) {
  console.log('Getting translation for key:', key);
  // Get current translations from the store
  const currentTranslations = get(activeTranslations);
  console.log('Current translations:', currentTranslations);
  const translatedValue = currentTranslations[key] || key;
  console.log('Translated value:', translatedValue);
  return translatedValue;
}
