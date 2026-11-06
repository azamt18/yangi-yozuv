/** How many words differ between a text and its converted version (whitespace is kept as is). */
export function changedWords(original: string, converted: string): number {
  const after = converted.split(/\s+/);
  return original.split(/\s+/).filter((word, i) => word !== after[i]).length;
}
