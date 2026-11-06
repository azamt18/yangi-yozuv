import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { convertText, convertWord, type ConvertOptions } from './convert';
import { convertCyrillicWord } from './cyrillic';
import { isWordBoundary, planConversion } from './typing';

// spec/test-vectors.json is the shared contract: the Kotlin and Swift ports must
// pass the same cases. This test is how the TypeScript code proves it does.
interface Vectors {
  version: number;
  convertWord: Case[];
  convertCyrillicWord: Case[];
  convertText: (Case & { from?: ConvertOptions['from'] })[];
  isWordBoundary: { char: string; output: boolean }[];
  planConversion: { text: string; caret: number; skipWords?: string[]; output: unknown }[];
}
interface Case {
  input: string;
  output: string;
  skipWords?: string[];
}

const vectors: Vectors = JSON.parse(
  readFileSync(join(__dirname, '../../spec/test-vectors.json'), 'utf8'),
);
const options = ({ skipWords, from }: { skipWords?: string[]; from?: ConvertOptions['from'] }) => ({
  skipWords: new Set(skipWords),
  ...(from && { from }),
});
const label = (text: string) => JSON.stringify(text);

describe('spec/test-vectors.json', () => {
  it('has a version and cases for every function', () => {
    expect(vectors.version).toBe(1);
    for (const key of ['convertWord', 'convertCyrillicWord', 'convertText', 'isWordBoundary', 'planConversion'] as const) {
      expect(vectors[key].length, key).toBeGreaterThan(0);
    }
  });

  describe('convertWord', () => {
    it.each(vectors.convertWord.map((c) => [label(c.input), c] as const))('%s', (_name, c) => {
      expect(convertWord(c.input, options(c))).toBe(c.output);
    });
  });

  describe('convertCyrillicWord', () => {
    it.each(vectors.convertCyrillicWord.map((c) => [label(c.input), c] as const))('%s', (_name, c) => {
      expect(convertCyrillicWord(c.input, options(c))).toBe(c.output);
    });
  });

  describe('convertText', () => {
    it.each(vectors.convertText.map((c) => [label(c.input), c] as const))('%s', (_name, c) => {
      expect(convertText(c.input, options(c))).toBe(c.output);
    });
  });

  describe('isWordBoundary', () => {
    it.each(vectors.isWordBoundary.map((c) => [label(c.char), c] as const))('%s', (_name, c) => {
      expect(isWordBoundary(c.char)).toBe(c.output);
    });
  });

  describe('planConversion', () => {
    it.each(vectors.planConversion.map((c) => [`${label(c.text)} at ${c.caret}`, c] as const))('%s', (_name, c) => {
      expect(planConversion(c.text, c.caret, options(c))).toEqual(c.output);
    });
  });
});
