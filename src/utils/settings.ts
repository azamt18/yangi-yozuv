import { storage } from '#imports';

// Settings live only in this browser (storage.local); nothing is synced or sent.

export const enabledItem = storage.defineItem<boolean>('local:enabled', {
  fallback: true,
});

/** Hostnames where the user turned the extension off. */
export const disabledSitesItem = storage.defineItem<string[]>('local:disabledSites', {
  fallback: [],
});

/** Lowercase words the user never wants converted. */
export const skipWordsItem = storage.defineItem<string[]>('local:skipWords', {
  fallback: [],
});

/** How many words the extension has converted for the user, shown in the popup. */
export const wordsConvertedItem = storage.defineItem<number>('local:wordsConverted', {
  fallback: 0,
});
