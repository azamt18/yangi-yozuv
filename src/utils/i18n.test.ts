import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(__dirname, '../..');
const LANGUAGES = ['uz', 'ru', 'en'];

const messages = (lang: string): Record<string, { message: string }> =>
  JSON.parse(readFileSync(join(root, `public/_locales/${lang}/messages.json`), 'utf8'));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|html)$/.test(name) && !name.endsWith('.test.ts') ? [path] : [];
  });
}

/** Every key the code asks for: t('key'), data-i18n*="key", __MSG_key__. */
function usedKeys(): Set<string> {
  const keys = new Set<string>();
  const sources = [...sourceFiles(join(root, 'src')), join(root, 'wxt.config.ts')];
  for (const file of sources) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(/\bt\(\s*'(\w+)'/g)) keys.add(match[1]!);
    for (const match of text.matchAll(/data-i18n(?:-[a-z-]+)?="(\w+)"/g)) keys.add(match[1]!);
    for (const match of text.matchAll(/__MSG_(\w+)__/g)) keys.add(match[1]!);
  }
  return keys;
}

describe('locales', () => {
  const uz = Object.keys(messages('uz')).sort();

  it.each(LANGUAGES)('%s has the same keys as uz and no empty text', (lang) => {
    const file = messages(lang);
    expect(Object.keys(file).sort()).toEqual(uz);
    for (const [key, { message }] of Object.entries(file)) {
      expect(message.trim(), `${lang}.${key}`).not.toBe('');
    }
  });

  it('defines every key the code uses', () => {
    const missing = [...usedKeys()].filter((key) => !uz.includes(key));
    expect(missing).toEqual([]);
  });

  it('has no key that nothing uses', () => {
    const used = usedKeys();
    expect(uz.filter((key) => !used.has(key))).toEqual([]);
  });

  it('keeps the word placeholder wherever the text has one', () => {
    for (const lang of LANGUAGES) {
      const { skipRemove } = messages(lang) as Record<string, { message: string; placeholders?: object }>;
      expect(skipRemove!.message).toContain('$WORD$');
      expect(skipRemove!.placeholders).toBeDefined();
    }
  });

  it('writes the uzbek text in the new alphabet', () => {
    // The old spellings sh, ch, oʻ, gʻ must not survive in the uzbek UI text,
    // apart from the Masalan: Shohruh example, which shows what a user types.
    const old = /sh|ch|o['ʻ‘’]|g['ʻ‘’]/i;
    for (const [key, { message }] of Object.entries(messages('uz'))) {
      if (key === 'skipPlaceholder') continue;
      expect(message, key).not.toMatch(old);
    }
  });
});
