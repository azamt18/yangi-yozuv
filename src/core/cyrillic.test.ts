import { describe, expect, it } from 'vitest';
import { convertCyrillicText, convertCyrillicWord, hasCyrillic } from './cyrillic';

// Every example here comes from docs/CYRILLIC-RULES.md.

describe('letter map', () => {
  it.each([
    ['чой', 'çoy'],
    ['шаҳар', 'şahar'],
    ['ўзбек', 'özbek'],
    ['қўшиқ', 'qöşiq'],
    ['ғалаба', 'ğalaba'],
    ['хат', 'xat'], // х → x, not h
    ['ҳаво', 'havo'],
    ['жўжа', 'jöja'],
    ['ёмғир', 'yomğir'],
    ['юлдуз', 'yulduz'],
    ['яхши', 'yaxşi'],
    ['майда', 'mayda'],
    ['эшик', 'eşik'],
    ['борщ', 'borşç'],
  ])('%s → %s', (input, expected) => {
    expect(convertCyrillicWord(input)).toBe(expected);
  });

  it('outputs precomposed letters, never a letter plus a combining mark', () => {
    const out = convertCyrillicText('чой шаҳар ўзбек ғалаба');
    expect(out).toBe(out.normalize('NFC'));
  });
});

describe('е → ye or e', () => {
  it.each([
    ['ер', 'yer'],
    ['оилае', 'oilaye'],
    ['шеър', 'şeʼr'],
    ['поезд', 'poyezd'],
    ['келди', 'keldi'],
    ['Европа', 'Yevropa'],
  ])('%s → %s', (input, expected) => {
    expect(convertCyrillicWord(input)).toBe(expected);
  });
});

describe('ц → s or ts', () => {
  it.each([
    ['цирк', 'sirk'],
    ['концерт', 'konsert'],
    ['станция', 'stansiya'],
    ['лицей', 'litsey'],
    ['милиция', 'militsiya'],
    ['акция', 'aksiya'],
  ])('%s → %s', (input, expected) => {
    expect(convertCyrillicWord(input)).toBe(expected);
  });
});

describe('ъ and ь', () => {
  it.each([
    ['маъно', 'maʼno'],
    ['таълим', 'taʼlim'],
    ['съезд', 'syezd'],
    ['объект', 'obyekt'],
    ['апрель', 'aprel'],
    ['мебель', 'mebel'],
    ['пьеса', 'pyesa'],
  ])('%s → %s', (input, expected) => {
    expect(convertCyrillicWord(input)).toBe(expected);
  });

  it('writes the tutuq sign as U+02BC, the letter that stays in the alphabet', () => {
    expect(convertCyrillicWord('маъно').charCodeAt(2)).toBe(0x02bc);
  });
});

describe('case', () => {
  it.each([
    ['Ёшлар', 'Yoşlar'],
    ['Юлдуз', 'Yulduz'],
    ['Ер', 'Yer'],
    ['Я', 'Ya'],
    ['ЁШЛАР', 'YOŞLAR'],
    ['ЮНЕСКО', 'YUNESKO'],
    ['ТОШКЕНТ', 'TOŞKENT'],
    ['ЩЕТКА', 'ŞÇETKA'],
    ['Щетка', 'Şçetka'],
  ])('%s → %s', (input, expected) => {
    expect(convertCyrillicWord(input)).toBe(expected);
  });
});

describe('what is left alone', () => {
  it('keeps punctuation around a word', () => {
    expect(convertCyrillicWord('(чой),')).toBe('(çoy),');
    expect(convertCyrillicWord('«Шаҳар»')).toBe('«Şahar»');
  });

  it('treats a hyphen as a word break', () => {
    expect(convertCyrillicWord('ўқув-услубий')).toBe('öquv-uslubiy');
    expect(convertCyrillicWord('Ёш-ёш')).toBe('Yoş-yoş');
  });

  it.each([
    'https://гов.уз/чой',
    'www.гов.уз',
    'шаҳзод@почта.уз',
    '@шаҳзод',
    '#чой',
    'сайт.уз',
  ])('leaves the protected token %s unchanged', (token) => {
    expect(convertCyrillicWord(token)).toBe(token);
  });

  it('leaves words in the exception list unchanged, ignoring case', () => {
    const skipWords = new Set(['шаҳзод']);
    expect(convertCyrillicWord('Шаҳзод,', { skipWords })).toBe('Шаҳзод,');
    expect(convertCyrillicWord('шаҳар', { skipWords })).toBe('şahar');
  });

  it.each(['shahar', '9', '2027-yil', '...', ''])('does not touch %j (no cyrillic)', (token) => {
    expect(convertCyrillicWord(token)).toBe(token);
  });

  it('converts the cyrillic letters of a mixed token and keeps its latin ones', () => {
    expect(convertCyrillicWord('чоy')).toBe('çoy');
    expect(convertCyrillicWord('shаҳар')).toBe('shahar');
  });
});

describe('full sentences', () => {
  it.each([
    ['Ўзбекистон Республикаси', 'Özbekiston Respublikasi'],
    ['Шаҳар марказида янги мактаб очилди.', 'Şahar markazida yangi maktab oçildi.'],
    ['Ғалаба куни, 9 май', 'Ğalaba kuni, 9 may'],
    ['Чой ичасизми?', 'Çoy içasizmi?'],
    ['ТОШКЕНТ ШАҲРИ', 'TOŞKENT ŞAHRI'],
    ['www.gov.uz сайтида', 'www.gov.uz saytida'],
    ['Исҳоқ', 'Ishoq'],
  ])('%s → %s', (input, expected) => {
    expect(convertCyrillicText(input)).toBe(expected);
  });

  it('keeps all whitespace as is', () => {
    expect(convertCyrillicText('чой\n\n  шаҳар\t')).toBe('çoy\n\n  şahar\t');
  });
});

describe('hasCyrillic', () => {
  it('detects cyrillic letters anywhere in the text', () => {
    expect(hasCyrillic('hello чой')).toBe(true);
    expect(hasCyrillic('ў')).toBe(true);
    expect(hasCyrillic('shahar o\'zbek')).toBe(false);
    expect(hasCyrillic('')).toBe(false);
  });
});
