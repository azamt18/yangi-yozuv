import { describe, expect, it } from 'vitest';
import { looksUzbek } from './detect';

const page = (over: Partial<Parameters<typeof looksUzbek>[0]> = {}) =>
  looksUzbek({ text: '', lang: '', hostname: 'example.com', ...over });

describe('looksUzbek', () => {
  it.each(['uz', 'UZ', 'uz-Cyrl', 'uz-UZ', 'uz-Latn'])('accepts <html lang="%s">', (lang) => {
    expect(page({ lang })).toBe(true);
  });

  it.each(['ru', 'en', 'en-US', 'uzbek', ''])('does not accept <html lang="%s"> on its own', (lang) => {
    expect(page({ lang, text: 'hello world' })).toBe(false);
  });

  it('accepts .uz sites', () => {
    expect(page({ hostname: 'kun.uz' })).toBe(true);
    expect(page({ hostname: 'www.gov.uz' })).toBe(true);
    expect(page({ hostname: 'buzz.uzbek.com' })).toBe(false);
  });

  it('accepts text with letters only uzbek cyrillic has', () => {
    expect(page({ text: 'Ўзбекистон' })).toBe(true);
    expect(page({ text: 'қишлоқ' })).toBe(true);
    expect(page({ text: 'ғалаба' })).toBe(true);
    expect(page({ text: 'ҳаво' })).toBe(true);
  });

  it('does not accept plain russian text', () => {
    expect(page({ text: 'Привет, как дела? Это обычный русский текст.' })).toBe(false);
  });

  it('accepts old latin uzbek by its oʻ and gʻ marks', () => {
    expect(page({ text: "bu o'zbek tilida yozilgan" })).toBe(true);
    expect(page({ text: 'togʻ va bogʻ' })).toBe(true);
    expect(page({ text: 'o‘zbek' })).toBe(true);
  });

  it('does not accept english text that has apostrophes', () => {
    expect(page({ text: "don't worry, it's fine, she's here" })).toBe(false);
    expect(page({ text: "the o'clock rule" })).toBe(false);
  });

  it('only looks at the start of a long page', () => {
    expect(page({ text: `${'a '.repeat(20000)}Ўзбек` })).toBe(false);
  });
});
