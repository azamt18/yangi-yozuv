// Loads the built extension into Chrome for Testing and types into real text
// fields on fake .uz pages. Run `npm run build` first (or use `npm run test:e2e`).
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import puppeteer from 'puppeteer';

const extensionPath = fileURLToPath(new URL('../.output/chrome-mv3', import.meta.url));
const lexicalFixture = fileURLToPath(new URL('./fixtures/lexical-editor.js', import.meta.url));

const PLAIN_PAGE = `<!doctype html><meta charset="utf-8">
<input id="input" type="text">
<textarea id="textarea"></textarea>
<div id="editor" contenteditable="true"></div>
<input id="email" type="email">
<div id="chat" contenteditable="true"></div>
<p id="static">Shahar choy</p>
<script>
  // Behaves like a chat app: Enter sends whatever is in the box.
  window.sent = [];
  chat.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    window.sent.push(chat.textContent);
    chat.textContent = '';
  });
</script>`;

const LEXICAL_PAGE = `<!doctype html><meta charset="utf-8">
<div id="editor" contenteditable="true" style="white-space:pre-wrap;min-height:60px"></div>
<script src="/lexical.js"></script>`;

const prosemirrorFixture = fileURLToPath(new URL('./fixtures/prosemirror-editor.js', import.meta.url));

const PROSEMIRROR_PAGE = `<!doctype html><meta charset="utf-8">
<div id="editor" style="min-height:60px"></div>
<script src="/prosemirror.js"></script>`;

// Gmail's compose box: a plain contenteditable where every line is its own <div>,
// the first line is bare text, and an empty line holds a <br>.
const GMAIL_PAGE = `<!doctype html><meta charset="utf-8">
<div id="editor" contenteditable="true" role="textbox" aria-multiline="true" style="min-height:60px"></div>`;

const bundle = async (entryPoint) =>
  (await build({ entryPoints: [entryPoint], bundle: true, format: 'iife', write: false }))
    .outputFiles[0].text;
const lexicalBundle = await bundle(lexicalFixture);
const prosemirrorBundle = await bundle(prosemirrorFixture);

const browser = await puppeteer.launch({
  headless: true,
  pipe: true,
  enableExtensions: [extensionPath],
});

let failures = 0;
function check(name, actual, expected) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(
    `${ok ? 'PASS' : 'FAIL'} ${name}: ${JSON.stringify(actual)}${ok ? '' : ` (expected ${JSON.stringify(expected)})`}`,
  );
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// Conversions happen as a separate step right after a keystroke, so give them a moment.
const settle = () => sleep(120);

async function openPage(path) {
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const url = request.url();
    if (url === 'https://test.uz/') {
      return request.respond({ contentType: 'text/html', body: PLAIN_PAGE });
    }
    if (url === 'https://test.uz/lexical') {
      return request.respond({ contentType: 'text/html', body: LEXICAL_PAGE });
    }
    if (url === 'https://test.uz/lexical.js') {
      return request.respond({ contentType: 'text/javascript', body: lexicalBundle });
    }
    if (url === 'https://test.uz/prosemirror') {
      return request.respond({ contentType: 'text/html', body: PROSEMIRROR_PAGE });
    }
    if (url === 'https://test.uz/prosemirror.js') {
      return request.respond({ contentType: 'text/javascript', body: prosemirrorBundle });
    }
    if (url === 'https://test.uz/gmail') {
      return request.respond({ contentType: 'text/html', body: GMAIL_PAGE });
    }
    return request.continue();
  });
  await page.goto(`https://test.uz${path}`);
  await sleep(500); // let the content script start
  return page;
}

// Editable areas use a non-breaking space at the end of the text.
const valueOf = async (page, selector) => {
  await settle();
  return page.$eval(selector, (el) =>
    ('value' in el ? el.value : el.textContent).replace(/ /g, ' '),
  );
};

// What the context menu and the shortcut do: the background worker sends this
// message to the active tab, and the page answers with what it did.
const worker = await (await browser.waitForTarget((t) => t.type() === 'service_worker')).worker();
async function convertSelection(page) {
  await page.bringToFront();
  const kind = await worker.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return chrome.tabs.sendMessage(tab.id, { type: 'convert-selection' });
  });
  await settle();
  return kind;
}

try {
  // ---- plain fields -------------------------------------------------------
  const page = await openPage('/');

  await page.type('#input', "Men shahar choy shop oldim, o'zbek tog' ");
  check('input', await valueOf(page, '#input'), 'Men şahar çoy shop oldim, özbek toğ ');

  await page.type('#textarea', 'Toshkent\nchiroyli. ');
  check('textarea', await valueOf(page, '#textarea'), 'Toşkent\nçiroyli. ');

  await page.type('#editor', 'Assalomu alaykum, ishlar qalay? Yaxshi ');
  check('contenteditable', await valueOf(page, '#editor'), 'Assalomu alaykum, işlar qalay? Yaxşi ');

  await page.type('#input', 'shohruh ');
  await settle();
  await page.keyboard.press('Backspace');
  check(
    'backspace undo',
    await valueOf(page, '#input'),
    'Men şahar çoy shop oldim, özbek toğ shohruh ',
  );

  await page.keyboard.press('Backspace');
  check(
    'second backspace deletes normally',
    await valueOf(page, '#input'),
    'Men şahar çoy shop oldim, özbek toğ shohruh',
  );

  await page.type('#email', 'shahzod@mail.uz ');
  check('email field untouched', await valueOf(page, '#email'), 'shahzod@mail.uz');

  const tail = 'https://shop.uz/chegirma shahar.uz shahzod@mail.uz @shahzod ';
  await page.type('#input', ` ${tail}`);
  check(
    'links, domains, emails and handles untouched',
    (await valueOf(page, '#input')).endsWith(` ${tail}`),
    true,
  );

  await page.type('#input', 'Shahar. Choy: yaxshi ');
  check(
    'sentence-ending dot and colon still convert',
    (await valueOf(page, '#input')).endsWith('Şahar. Çoy: yaxşi '),
    true,
  );

  await page.type('#chat', 'Rahmat, yaxshi');
  await settle();
  await page.keyboard.press('Enter');
  await settle();
  check('chat Enter converts before sending', await page.evaluate(() => window.sent[0]), 'Rahmat, yaxşi');

  // ---- Lexical editor (Instagram's message box) ----------------------------
  // Regression: the cursor jumped back and later words landed in the wrong place.
  const expected = 'men şaharda çoy içdim, keyin çiqib shop.uzga bordim, ';
  const sentence = 'men shaharda choy ichdim, keyin chiqib shop.uzga bordim, ';
  for (const delay of [0, 40]) {
    const lexical = await openPage('/lexical');
    await lexical.click('#editor');
    await lexical.keyboard.type(sentence, { delay });
    check(`lexical typing, ${delay} ms between keys`, await valueOf(lexical, '#editor'), expected);
    await lexical.close();
  }

  const undo = await openPage('/lexical');
  await undo.click('#editor');
  await undo.keyboard.type('shahar ');
  await settle();
  await undo.keyboard.press('Backspace');
  check('lexical backspace undo', await valueOf(undo, '#editor'), 'shahar ');
  await undo.keyboard.type('ab');
  check('lexical caret is back after the space', await valueOf(undo, '#editor'), 'shahar ab');
  await undo.close();

  const send = await openPage('/lexical');
  await send.click('#editor');
  await send.keyboard.type('Rahmat, yaxshi');
  await settle();
  await send.keyboard.press('Enter');
  await settle();
  check('lexical Enter converts before sending', await send.evaluate(() => window.sent[0]), 'Rahmat, yaxşi');

  // ---- convert selection (context menu, Alt+Shift+Y) ------------------------
  const sel = await openPage('/');
  const setField = (selector, value, from, to) =>
    sel.$eval(
      selector,
      (el, value, from, to) => {
        el.value = value;
        el.focus();
        el.setSelectionRange(from ?? 0, to ?? value.length);
      },
      value,
      from,
      to,
    );

  await setField('#textarea', "Shahar choy шаҳар o'zbek");
  check('selection: result', await convertSelection(sel), 'replaced');
  check('selection: whole textarea', await valueOf(sel, '#textarea'), 'Şahar çoy şahar özbek');

  await setField('#input', 'shahar choy shahar', 7, 11);
  await convertSelection(sel);
  check('selection: only the selected part changes', await valueOf(sel, '#input'), 'shahar çoy shahar');

  await setField('#input', 'hello world 2027', 0, 16);
  check('selection: nothing to convert', await convertSelection(sel), 'unchanged');
  check('selection: text left as is', await valueOf(sel, '#input'), 'hello world 2027');

  await sel.$eval('#input', (el) => el.setSelectionRange(3, 3));
  check('selection: empty selection', await convertSelection(sel), 'none');

  await sel.$eval('#editor', (el) => {
    el.innerHTML = '<p>Shahar <b>choy</b> Тошкент</p><p>Ўзбек shop.uz</p>';
    el.focus();
    getSelection().selectAllChildren(el);
  });
  check('selection: rich text result', await convertSelection(sel), 'replaced');
  // Known limitation: <b>choy</b> is a whole text node that starts after other
  // text, and an edit there would lose its bold (see convert-selection.ts), so
  // that word is left as it is. Everything around it converts.
  check(
    'selection: rich text keeps its formatting',
    await sel.$eval('#editor', (el) => el.innerHTML),
    '<p>Şahar <b>choy</b> Toşkent</p><p>Özbek shop.uz</p>',
  );

  // A word that starts right after a formatting boundary keeps the right
  // formatting, or is left alone; it never turns bold by accident.
  await sel.$eval('#editor', (el) => {
    el.innerHTML = '<p><b>qalin </b>choy</p><p><b>qalin</b> shahar<br>choy</p>';
    el.focus();
    getSelection().selectAllChildren(el);
  });
  await convertSelection(sel);
  check(
    'selection: no formatting leaks across a boundary',
    await sel.$eval('#editor', (el) => el.innerHTML),
    '<p><b>qalin </b>choy</p><p><b>qalin</b> şahar<br>çoy</p>',
  );

  await sel.$eval('#static', (el) => {
    getSelection().selectAllChildren(el);
  });
  check('selection: page text is copied, not edited', await convertSelection(sel), 'readonly');
  check('selection: page text left as is', await valueOf(sel, '#static'), 'Shahar choy');
  await sel.close();

  const lexSel = await openPage('/lexical');
  await lexSel.click('#editor');
  await lexSel.keyboard.type('Shahar');
  await lexSel.$eval('#editor', (el) => getSelection().selectAllChildren(el));
  check('selection: lexical result', await convertSelection(lexSel), 'replaced');
  check('selection: lexical text', await valueOf(lexSel, '#editor'), 'Şahar');
  await lexSel.close();

  // ---- popup converter box --------------------------------------------------
  const popup = await browser.newPage();
  await popup.goto(`${worker.url().match(/^chrome-extension:\/\/[^/]+/)[0]}/popup.html`);
  await sleep(300); // let the popup read its settings
  check('popup: copy button starts disabled', await popup.$eval('#convert-copy', (el) => el.disabled), true);
  await popup.type('#convert-input', "Shahar марказида choy, o'zbek https://shop.uz");
  check(
    'popup: live conversion of latin and cyrillic',
    await popup.$eval('#convert-output', (el) => el.value),
    'Şahar markazida çoy, özbek https://shop.uz',
  );
  check('popup: copy button enabled', await popup.$eval('#convert-copy', (el) => el.disabled), false);
  await popup.close();

  // ---- ProseMirror (chatgpt.com, claude.ai) ---------------------------------
  const pm = await openPage('/prosemirror');
  await pm.click('#editor .ProseMirror');
  await pm.keyboard.type(sentence, { delay: 40 });
  check('prosemirror typing', await valueOf(pm, '#editor'), expected);
  await pm.keyboard.type('shahar ');
  await settle();
  await pm.keyboard.press('Backspace');
  check(
    'prosemirror backspace undo',
    (await valueOf(pm, '#editor')).endsWith('bordim, shahar '),
    true,
  );
  await pm.keyboard.type('Rahmat, yaxshi');
  await settle();
  await pm.keyboard.press('Enter');
  await settle();
  check(
    'prosemirror Enter converts before sending',
    (await pm.evaluate(() => window.sent[0])).endsWith('Rahmat, yaxşi'),
    true,
  );
  await pm.close();

  // ---- Gmail-style compose box (nested <div> per line) ----------------------
  const gmail = await openPage('/gmail');
  await gmail.click('#editor');
  await gmail.keyboard.type('Salom shahar, choy ichamiz', { delay: 20 });
  await gmail.keyboard.press('Enter');
  await gmail.keyboard.type('Yaxshi qoling, oʻzbek tili ', { delay: 20 });
  await settle();
  check(
    'gmail-style, two lines',
    await gmail.$eval('#editor', (el) =>
      [...el.childNodes].map((n) => n.textContent.replace(/ /g, ' ')).join('|'),
    ),
    'Salom şahar, çoy içamiz|Yaxşi qoling, özbek tili ',
  );
  await gmail.close();
} finally {
  await browser.close();
}

console.log(failures ? `${failures} failed` : 'all passed');
process.exit(failures ? 1 : 0);
