import { wordsConvertedItem } from './settings';

/**
 * Adds to the "words converted" number shown in the popup. It is a single
 * number in this browser's storage: no text, no sites, nothing is sent anywhere.
 */
export async function addConverted(count: number) {
  if (!count) return;
  const total = await wordsConvertedItem.getValue();
  await wordsConvertedItem.setValue(Math.max(0, total + count));
}
