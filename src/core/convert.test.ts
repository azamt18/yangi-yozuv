import { describe, expect, it } from 'vitest';
import { convertText, convertWord } from './convert';

describe('convertWord: letter rules', () => {
  it.each([
    ['shahar', 'şahar'],
    ['choy', 'çoy'],
    ["o'zbek", 'özbek'],
    ["tog'", 'toğ'],
    ["cho'l", 'çöl'],
    ['yaxshi', 'yaxşi'],
    ["qo'shiq", 'qöşiq'],
  ])('%s → %s', (input, expected) => {
    expect(convertWord(input)).toBe(expected);
  });

  it.each([
    ["o'zbek", 'özbek'], // ASCII apostrophe
    ['oʻzbek', 'özbek'], // U+02BB, the official oʻ mark
    ['o‘zbek', 'özbek'], // U+2018
    ['o’zbek', 'özbek'], // U+2019, phone keyboards
    ['o`zbek', 'özbek'], // backtick
  ])('accepts apostrophe variant in %s', (input, expected) => {
    expect(convertWord(input)).toBe(expected);
  });

  it('keeps the tutuq sign (U+02BC) as a separate letter', () => {
    expect(convertWord('maʼno')).toBe('maʼno');
    expect(convertWord('moʻʼtabar')).toBe('möʼtabar');
  });

  it("leaves s'h untouched because s and h are separate sounds", () => {
    expect(convertWord("Is'hoq")).toBe("Is'hoq");
    expect(convertWord("as'hob")).toBe("as'hob");
  });

  it('leaves words without old letters untouched', () => {
    expect(convertWord('kitob')).toBe('kitob');
  });
});

describe('convertWord: letter case', () => {
  it.each([
    ['Shahar', 'Şahar'],
    ['SHAHAR', 'ŞAHAR'],
    ['Choy', 'Çoy'],
    ["O'zbekiston", 'Özbekiston'],
    ["O'ZBEKISTON", 'ÖZBEKISTON'],
    ["G'ani", 'Ğani'],
  ])('%s → %s', (input, expected) => {
    expect(convertWord(input)).toBe(expected);
  });
});

describe('convertWord: English words', () => {
  it.each(['shop', 'check', 'Chrome', 'marketing', 'teacher', 'SHOP', "o'clock"])(
    'leaves %s unchanged',
    (word) => {
      expect(convertWord(word)).toBe(word);
    },
  );

  it.each([
    ['chin', 'çin'],
    ['chop', 'çop'],
    ['tush', 'tuş'],
    ['chap', 'çap'],
  ])('converts %s, which is Uzbek even though English also has it', (input, expected) => {
    expect(convertWord(input)).toBe(expected);
  });

  it("leaves Irish names like O'Brien unchanged", () => {
    expect(convertWord("O'Brien")).toBe("O'Brien");
  });
});

describe('convertWord: protected tokens', () => {
  it.each([
    'https://shop.uz/chegirma',
    'www.shahar.uz',
    'shahzod@gmail.com',
    '@shahzod_dev',
    '#shanba',
    'kitob.shop',
    'ChatGPT',
    'iPhone',
  ])('leaves %s unchanged', (token) => {
    expect(convertWord(token)).toBe(token);
  });
});

describe('convertWord: protection does not swallow normal words', () => {
  it.each([
    ['shahar.', 'şahar.'], // sentence-ending dot is not a domain
    ['shahar...', 'şahar...'],
    ['Shahar', 'Şahar'], // capital first letter is not camelCase
    ['SHAHAR', 'ŞAHAR'],
    ['yaxshi-chi', 'yaxşi-çi'],
  ])('%s → %s', (input, expected) => {
    expect(convertWord(input)).toBe(expected);
  });

  it.each(['(@shahzod)', '"https://shop.uz"', '(#shanba),'])(
    'still protects %s inside brackets and quotes',
    (token) => {
      expect(convertWord(token)).toBe(token);
    },
  );
});

describe('convertWord: surrounding punctuation', () => {
  it.each([
    ['shahar,', 'şahar,'],
    ['(choy)', '(çoy)'],
    ['"shahar"', '"şahar"'],
    ["tog'.", 'toğ.'],
    ['qish?!', 'qiş?!'],
  ])('%s → %s', (input, expected) => {
    expect(convertWord(input)).toBe(expected);
  });

  it('treats matching single quotes around a word as quotes, not oʻ/gʻ marks', () => {
    expect(convertWord("'dog'")).toBe("'dog'");
  });
});

describe('convertWord: user skip list', () => {
  it('leaves words from the skip list unchanged, ignoring case', () => {
    const skipWords = new Set(['shohruh']);
    expect(convertWord('Shohruh', { skipWords })).toBe('Shohruh');
    expect(convertWord('shahar', { skipWords })).toBe('şahar');
  });
});

describe('convertText', () => {
  it('converts every word and keeps spacing and line breaks', () => {
    expect(convertText("Toshkent shahri  chiroyli,\nbog'lari ko'p")).toBe(
      'Toşkent şahri  çiroyli,\nboğlari köp',
    );
  });

  it('handles a mixed Uzbek and English sentence', () => {
    expect(convertText('Men shop dan choy oldim https://shop.uz')).toBe(
      'Men shop dan çoy oldim https://shop.uz',
    );
  });
});

describe("convertText: the 'from' option", () => {
  const mixed = "Shahar марказида choy ичамиз, o'zbek тилида";
  const bothConverted = 'Şahar markazida çoy içamiz, özbek tilida';

  it("converts old latin and cyrillic in the same text with 'auto'", () => {
    expect(convertText(mixed, { from: 'auto' })).toBe(bothConverted);
  });

  it("is 'auto' by default", () => {
    expect(convertText(mixed)).toBe(bothConverted);
  });

  it("converts only old latin with 'latin'", () => {
    expect(convertText(mixed, { from: 'latin' })).toBe(
      "Şahar марказида çoy ичамиз, özbek тилида",
    );
  });

  it("converts only cyrillic with 'cyrillic'", () => {
    expect(convertText(mixed, { from: 'cyrillic' })).toBe(
      "Shahar markazida choy içamiz, o'zbek tilida",
    );
  });

  it('uses the cyrillic rules for a token that has both kinds of letters', () => {
    expect(convertText('чоsh', { from: 'auto' })).toBe('çosh');
  });

  it('passes the exception list to both converters', () => {
    const skipWords = new Set(['shahzod', 'шаҳзод']);
    expect(convertText('shahzod шаҳзод shahar шаҳар', { skipWords })).toBe(
      'shahzod шаҳзод şahar şahar',
    );
  });

  it('keeps links and numbers in cyrillic text', () => {
    expect(convertText('сайт https://gov.uz/чой 2027', { from: 'auto' })).toBe(
      'sayt https://gov.uz/чой 2027',
    );
  });
});
