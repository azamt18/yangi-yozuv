const SAMPLE_LENGTH = 20000;
// Letters only uzbek cyrillic has: russian text never contains them.
const UZBEK_CYRILLIC = /[ЎўҚқҒғҲҳ]/;
// o or g followed by an oʻ/gʻ mark and then a letter: oʻzbek, boʻlmadi. The
// plain apostrophe is common in English (don't), but "o'" and "g'" followed by a
// letter almost never are: only o'clock and g'day.
const UZBEK_MARK = /[oOgG][ʻ‘’'`]\p{L}/u;
const UZBEK_MARK_LETTER = /ʻ/; // U+02BB is the official mark and is not used in English
const NOT_UZBEK_WORDS = /\b(o['’‘]clock|g['’‘]day)\b/gi;

export interface PageInfo {
  /** The text of the page (only the start of it is read). */
  text: string;
  /** The `lang` attribute of the page, or an empty string. */
  lang: string;
  hostname: string;
}

/**
 * Whether a page is probably written in Uzbek. Converting a page in another
 * language would damage it, and russian and uzbek cyrillic look alike, so
 * "view page in the new alphabet" asks first when this says no.
 */
export function looksUzbek({ text, lang, hostname }: PageInfo): boolean {
  if (/^uz(-|$)/i.test(lang)) return true;
  if (hostname === 'uz' || hostname.endsWith('.uz')) return true;

  const sample = text.slice(0, SAMPLE_LENGTH);
  if (UZBEK_CYRILLIC.test(sample)) return true;
  if (UZBEK_MARK_LETTER.test(sample)) return true;
  return UZBEK_MARK.test(sample.replace(NOT_UZBEK_WORDS, ''));
}
