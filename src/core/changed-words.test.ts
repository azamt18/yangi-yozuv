import { describe, expect, it } from 'vitest';
import { changedWords } from './changed-words';
import { convertText } from './convert';

describe('changedWords', () => {
  it('counts the words that differ', () => {
    expect(changedWords('Men shahar choy kitob', 'Men şahar çoy kitob')).toBe(2);
  });

  it('keeps counting through extra spaces and new lines', () => {
    const text = "shahar  choy\nbog'lari";
    expect(changedWords(text, convertText(text))).toBe(3);
  });

  it('counts cyrillic words too', () => {
    expect(changedWords('чой ичамиз 2027', convertText('чой ичамиз 2027'))).toBe(2);
  });

  it('is zero when nothing changed', () => {
    expect(changedWords('kitob', 'kitob')).toBe(0);
    expect(changedWords('', '')).toBe(0);
  });
});
