/** The text for the browser's language: public/_locales/{uz,ru,en}/messages.json. */
export function t(key: string, ...substitutions: string[]): string {
  return browser.i18n.getMessage(key as never, substitutions);
}
