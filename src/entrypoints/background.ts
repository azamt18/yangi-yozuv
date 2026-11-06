import { MESSAGE_CONVERT_SELECTION } from '@/utils/messages';
import { DEFAULT_SITES, EXCLUDED_SITES } from '@/utils/sites';

const EXTRA_SITES_SCRIPT_ID = 'extra-sites';
const CONTENT_SCRIPT_FILE = '/content-scripts/content.js';
// Doubles as the menu item id and the name of the keyboard command in the manifest.
const CONVERT_SELECTION_ID = 'convert-selection';

export default defineBackground(() => {
  // When the user switches the extension on for a new site from the popup,
  // start working there right away and on every later visit.
  browser.permissions.onAdded.addListener(async ({ origins = [] }) => {
    await syncExtraSites();
    for (const origin of origins) {
      const tabs = await browser.tabs.query({ url: origin });
      for (const tab of tabs) {
        if (tab.id === undefined) continue;
        await browser.scripting
          .executeScript({ target: { tabId: tab.id, allFrames: true }, files: [CONTENT_SCRIPT_FILE] })
          .catch(() => {}); // e.g. the tab is a browser page we can't touch
      }
    }
  });
  browser.permissions.onRemoved.addListener(syncExtraSites);
  browser.runtime.onInstalled.addListener(() => {
    syncExtraSites();
    browser.contextMenus.create({
      id: CONVERT_SELECTION_ID,
      title: 'Yangi alifboga özgartiriş (ş ç ö ğ)',
      contexts: ['selection'],
    });
  });

  browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === CONVERT_SELECTION_ID && tab?.id !== undefined) {
      convertSelectionIn(tab.id, info.frameId);
    }
  });

  browser.commands.onCommand.addListener(async (command) => {
    if (command !== CONVERT_SELECTION_ID) return;
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab?.id !== undefined) convertSelectionIn(tab.id);
  });
});

/**
 * Asks the page to convert its selection. On a site where the extension isn't
 * running (not a default site, not switched on), the click or shortcut that got
 * us here lets us inject the content script just for this tab (activeTab).
 * `frameId` is the frame the right-click happened in; the shortcut asks them all.
 */
async function convertSelectionIn(tabId: number, frameId?: number) {
  const message = { type: MESSAGE_CONVERT_SELECTION };
  const options = frameId === undefined ? undefined : { frameId };
  try {
    await browser.tabs.sendMessage(tabId, message, options);
  } catch {
    // Nobody was listening: the content script isn't in the page yet.
    try {
      await browser.scripting.executeScript({
        target: frameId === undefined ? { tabId, allFrames: true } : { tabId, frameIds: [frameId] },
        files: [CONTENT_SCRIPT_FILE],
      });
      await browser.tabs.sendMessage(tabId, message, options);
    } catch {
      // A browser page (chrome://, the web store) that extensions can't touch.
    }
  }
}

/** Registers the content script for every site the user added beyond the defaults. */
async function syncExtraSites() {
  const { origins = [] } = await browser.permissions.getAll();
  const extra = origins.filter((origin) => !DEFAULT_SITES.includes(origin));

  const existing = await browser.scripting.getRegisteredContentScripts({
    ids: [EXTRA_SITES_SCRIPT_ID],
  });
  if (existing.length) {
    await browser.scripting.unregisterContentScripts({ ids: [EXTRA_SITES_SCRIPT_ID] });
  }
  if (!extra.length) return;

  await browser.scripting.registerContentScripts([
    {
      id: EXTRA_SITES_SCRIPT_ID,
      matches: extra,
      excludeMatches: EXCLUDED_SITES,
      js: [CONTENT_SCRIPT_FILE],
      allFrames: true,
      runAt: 'document_idle',
    },
  ]);
}
