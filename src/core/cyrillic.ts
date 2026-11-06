import type { ConvertOptions } from './convert';
import { isProtectedToken } from './protected';

// Rules: docs/CYRILLIC-RULES.md. Letters not listed here (and е, ц, ъ, ь, which
// depend on their neighbours) are handled in convertRun.
const LETTERS: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ё: 'yo', ж: 'j', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's',
  т: 't', у: 'u', ф: 'f', х: 'x', ч: 'ç', ш: 'ş', щ: 'şç', э: 'e', ю: 'yu',
  я: 'ya', ў: 'ö', қ: 'q', ғ: 'ğ', ҳ: 'h',
};

const VOWELS = new Set([...'аеёиоуэюяў']);
// е is "ye" after a vowel or after a sign (ъ, ь), as well as at the start of a word.
const YE_AFTER = new Set([...VOWELS, 'ъ', 'ь']);
// ъ before one of these (съезд, объект) is dropped; the vowel supplies the "y".
const YOTATED = new Set([...'еёюя']);
const TUTUQ = 'ʼ'; // U+02BC, a letter that stays in the new alphabet

const CYRILLIC = /\p{Script=Cyrillic}/u;
const LETTER_RUN = /\p{L}+/gu;

export function hasCyrillic(text: string): boolean {
  return CYRILLIC.test(text);
}

/**
 * Converts one whitespace-free token from cyrillic to the new Latin alphabet,
 * keeping punctuation around it. Tokens without cyrillic letters, protected
 * tokens (links, emails, handles) and words in the exception list come back
 * unchanged. Latin letters inside a mixed token are kept as they are.
 */
export function convertCyrillicWord(token: string, options: ConvertOptions = {}): string {
  if (!hasCyrillic(token) || isProtectedToken(token)) return token;

  const core = token.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '');
  if (options.skipWords?.has(core.toLowerCase())) return token;

  // Each run of letters is a word, so a hyphen starts a new one: Ёш-ёш → Yoş-yoş.
  return token.replace(LETTER_RUN, convertRun);
}

/** Converts every word in a block of text, keeping all whitespace as is. */
export function convertCyrillicText(text: string, options: ConvertOptions = {}): string {
  return text.replace(/\S+/g, (token) => convertCyrillicWord(token, options));
}

function convertRun(run: string): string {
  // ЁШЛАР → YOŞLAR, but Ёшлар → Yoşlar: all caps needs 2+ letters and no lowercase.
  const allCaps = run.length > 1 && run === run.toUpperCase();

  let out = '';
  for (let i = 0; i < run.length; i++) {
    const char = run.charAt(i);
    const lower = char.toLowerCase();
    const prev = i > 0 ? run.charAt(i - 1).toLowerCase() : '';
    const next = run.charAt(i + 1).toLowerCase();

    let latin: string | undefined;
    if (lower === 'е') latin = i === 0 || YE_AFTER.has(prev) ? 'ye' : 'e';
    else if (lower === 'ц') latin = VOWELS.has(prev) ? 'ts' : 's';
    else if (lower === 'ъ') latin = YOTATED.has(next) ? '' : TUTUQ;
    else if (lower === 'ь') latin = '';
    else latin = LETTERS[lower];

    if (latin === undefined) {
      out += char; // a latin letter in a mixed token, or a letter we don't map
    } else if (char === lower) {
      out += latin;
    } else if (allCaps) {
      out += latin.toUpperCase();
    } else {
      out += latin.charAt(0).toUpperCase() + latin.slice(1);
    }
  }
  return out;
}
