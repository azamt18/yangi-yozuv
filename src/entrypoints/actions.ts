import { looksUzbek } from '@/core/detect';
import { convertSelection } from '@/utils/convert-selection';
import { MESSAGE_CONVERT_SELECTION, MESSAGE_PAGE_VIEW, type PageViewState } from '@/utils/messages';
import { PageView } from '@/utils/page-view';
import { skipWordsItem } from '@/utils/settings';
import { TEXT, showToast } from '@/utils/toast';

// Things the user asks for explicitly (the context menu, the shortcut, buttons
// in the popup). This script is injected on demand and is separate from the
// typing script, so asking for one thing never switches typing on for a site.
export default defineUnlistedScript(() => {
  const flagged = window as unknown as { __yangiYozuvActions?: boolean };
  if (flagged.__yangiYozuvActions) return; // injected twice: the first listener is enough
  flagged.__yangiYozuvActions = true;

  const pageView = new PageView();

  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === MESSAGE_CONVERT_SELECTION) {
      convertSelectionAndReport().then(sendResponse);
      return true; // the answer is sent after the storage read
    }
    // Every frame does the work, but only the top frame answers the popup.
    if (message?.type === MESSAGE_PAGE_VIEW) {
      handlePageView(pageView, message).then((state) => {
        if (window === window.top) sendResponse(state);
      });
      return window === window.top;
    }
  });
});

async function handlePageView(
  pageView: PageView,
  { action, force }: { action: 'status' | 'start' | 'stop'; force?: boolean },
): Promise<PageViewState> {
  if (action === 'stop') pageView.stop();
  if (action === 'start' && !pageView.isOn) {
    const page = { text: document.body.innerText, lang: document.documentElement.lang, hostname: location.hostname };
    // A page in another language (russian looks like uzbek cyrillic) would be
    // damaged, so ask first. The popup offers a "convert anyway" button.
    if (!force && !looksUzbek(page)) return 'not-uzbek';
    pageView.start(new Set(await skipWordsItem.getValue()));
  }
  return pageView.isOn ? 'on' : 'off';
}

async function convertSelectionAndReport(): Promise<string> {
  const result = await convertSelection(new Set(await skipWordsItem.getValue()));
  if (result.kind === 'unchanged') {
    showToast({ message: TEXT.unchanged });
  } else if (result.kind === 'readonly') {
    try {
      await navigator.clipboard.writeText(result.text);
      showToast({ message: TEXT.copied });
    } catch {
      // The page doesn't allow a script to write to the clipboard here.
      showToast({ message: TEXT.readonly, copyText: result.text });
    }
  }
  return result.kind;
}
