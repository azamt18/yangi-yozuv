// Opens the built popup in Chrome for Testing and saves screenshots (light and dark).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const extensionPath = fileURLToPath(new URL('../.output/chrome-mv3', import.meta.url));
const outDir = fileURLToPath(new URL('../store/', import.meta.url));

// The store pictures are in Uzbek. Chrome on macOS follows the system language and
// ignores --lang, so the popup is handed the real strings from public/_locales/<lang>
// instead (SCREENSHOT_LANG=en or ru for the others).
const lang = process.env.SCREENSHOT_LANG ?? 'uz';
const messages = JSON.parse(
  readFileSync(fileURLToPath(new URL(`../public/_locales/${lang}/messages.json`, import.meta.url)), 'utf8'),
);
const browser = await puppeteer.launch({
  headless: true,
  pipe: true,
  enableExtensions: [extensionPath],
});
try {
  const worker = await browser.waitForTarget((t) => t.type() === 'service_worker');
  const extensionId = new URL(worker.url()).host;
  const page = await browser.newPage();
  await page.evaluateOnNewDocument((messages, lang) => {
    chrome.i18n.getUILanguage = () => lang;
    chrome.i18n.getMessage = (key, subs = []) =>
      (messages[key]?.message ?? key).replace(/\$[A-Z]+\$/g, () => [].concat(subs)[0] ?? '');
  }, messages, lang);
  await page.setViewport({ width: 300, height: 760, deviceScaleFactor: 2 });
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  console.log('popup language:', await page.evaluate(() => chrome.i18n.getUILanguage()));
  // The popup is open as a tab here, so stage what it shows on a normal page.
  await page.type('#convert-input', "Toshkent shahrida choy ichamiz, o'zbek tilida yozamiz. Ўзбекистон");
  await page.evaluate(() => {
    document.getElementById('page-view-toggle').disabled = false;
    document.getElementById('page-view-note').hidden = true;
    document.getElementById('site-unsupported').hidden = true;
  });
  await page.type('#skip-input', 'Shohruh');
  await page.click('#skip-form button');
  await new Promise((r) => setTimeout(r, 300));
  for (const scheme of ['light', 'dark']) {
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
    const body = await page.$('body');
    await body.screenshot({ path: `${outDir}popup-${scheme}.png` });
  }
  console.log('saved popup-light.png and popup-dark.png');
} finally {
  await browser.close();
}
