import { convertText } from '@/core/convert';
import { t } from '@/utils/i18n';
import { MESSAGE_PAGE_VIEW, type PageViewState } from '@/utils/messages';
import { disabledSitesItem, enabledItem, skipWordsItem, wordsConvertedItem } from '@/utils/settings';
import { siteOrigin } from '@/utils/sites';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

async function setUpEnabledSwitch() {
  const input = $<HTMLInputElement>('enabled');
  input.checked = await enabledItem.getValue();
  input.addEventListener('change', () => enabledItem.setValue(input.checked));
}

async function setUpSiteRow() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url ? new URL(tab.url) : null;
  if (!url || !url.protocol.startsWith('http')) {
    $('site-unsupported').hidden = false;
    return;
  }

  const hostname = url.hostname;
  $('site-name').textContent = hostname;
  const covered = await browser.permissions.contains({ origins: [siteOrigin(hostname)] });

  if (!covered) {
    const button = $<HTMLButtonElement>('site-grant');
    button.hidden = false;
    // The background worker starts the extension on this site once granted.
    button.addEventListener('click', () =>
      browser.permissions.request({ origins: [siteOrigin(hostname)] }).then((granted) => {
        if (granted) window.close();
      }),
    );
    return;
  }

  const input = $<HTMLInputElement>('site-enabled');
  $('site-toggle').hidden = false;
  input.checked = !(await disabledSitesItem.getValue()).includes(hostname);
  input.addEventListener('change', async () => {
    const others = (await disabledSitesItem.getValue()).filter((site) => site !== hostname);
    await disabledSitesItem.setValue(input.checked ? others : [...others, hostname]);
  });
}

async function setUpSkipWords() {
  const list = $<HTMLUListElement>('skip-list');
  const input = $<HTMLInputElement>('skip-input');

  const render = (words: string[]) => {
    list.replaceChildren(
      ...words.map((word) => {
        const item = document.createElement('li');
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.textContent = '×';
        remove.ariaLabel = t('skipRemove', word);
        remove.addEventListener('click', async () => {
          const current = await skipWordsItem.getValue();
          await skipWordsItem.setValue(current.filter((w) => w !== word));
        });
        item.append(word, remove);
        return item;
      }),
    );
  };

  render(await skipWordsItem.getValue());
  skipWordsItem.watch(render);

  $<HTMLFormElement>('skip-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const word = input.value.trim().toLowerCase();
    input.value = '';
    if (!word) return;
    const current = await skipWordsItem.getValue();
    if (!current.includes(word)) await skipWordsItem.setValue([...current, word].sort());
  });
}

async function setUpConverter() {
  const input = $<HTMLTextAreaElement>('convert-input');
  const output = $<HTMLTextAreaElement>('convert-output');
  const copy = $<HTMLButtonElement>('convert-copy');

  let skipWords = new Set(await skipWordsItem.getValue());
  skipWordsItem.watch((words) => {
    skipWords = new Set(words);
    update();
  });

  function update() {
    output.value = convertText(input.value, { skipWords });
    copy.disabled = !output.value;
  }
  input.addEventListener('input', update);

  copy.addEventListener('click', async () => {
    await navigator.clipboard.writeText(output.value);
    copy.textContent = t('copied');
    setTimeout(() => (copy.textContent = t('copy')), 1500);
  });
}

async function setUpPageView() {
  const toggle = $<HTMLButtonElement>('page-view-toggle');
  const note = $('page-view-note');
  const force = $<HTMLButtonElement>('page-view-force');

  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.id === undefined || !tab.url?.startsWith('http')) {
    note.textContent = t('pageUnsupported');
    note.hidden = false;
    return;
  }
  const tabId = tab.id;

  const send = (action: 'status' | 'start' | 'stop', forced = false): Promise<PageViewState> =>
    browser.tabs.sendMessage(tabId, { type: MESSAGE_PAGE_VIEW, action, force: forced });

  const show = (state: PageViewState) => {
    toggle.disabled = false;
    toggle.dataset.state = state;
    toggle.textContent = state === 'on' ? t('pageViewOff') : t('pageViewOn');
    note.hidden = force.hidden = state !== 'not-uzbek';
    note.textContent = t('pageNotUzbek');
  };

  // The actions script is only in the page once something has asked for it, so
  // "no answer" just means the view is off. Opening the popup grants activeTab,
  // which lets the buttons below inject it.
  const run = async (action: 'start' | 'stop', forced = false) => {
    await browser.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: ['/actions.js'],
    });
    show(await send(action, forced));
  };

  show(await send('status').catch((): PageViewState => 'off'));
  toggle.addEventListener('click', () => run(toggle.dataset.state === 'on' ? 'stop' : 'start'));
  force.addEventListener('click', () => run('start', true));
}

/** Fills in the text of everything marked data-i18n, data-i18n-placeholder or data-i18n-aria-label. */
function localizePage() {
  for (const el of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
    el.textContent = t(el.dataset.i18n!);
  }
  for (const el of document.querySelectorAll<HTMLInputElement>('[data-i18n-placeholder]')) {
    el.placeholder = t(el.dataset.i18nPlaceholder!);
  }
  for (const el of document.querySelectorAll<HTMLElement>('[data-i18n-aria-label]')) {
    el.ariaLabel = t(el.dataset.i18nAriaLabel!);
  }
  document.documentElement.lang = browser.i18n.getUILanguage().split('-')[0]!;
}

async function setUpStats() {
  const line = $('stats');
  const show = (count: number) => {
    line.hidden = count === 0; // nothing to show before the first conversion
    line.textContent = t('statsConverted', count.toLocaleString());
  };
  show(await wordsConvertedItem.getValue());
  wordsConvertedItem.watch(show);
}

localizePage();
setUpStats();
setUpPageView();
setUpConverter();
setUpEnabledSwitch();
setUpSiteRow();
setUpSkipWords();
