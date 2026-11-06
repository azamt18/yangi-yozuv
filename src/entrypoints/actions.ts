import { convertSelection } from '@/utils/convert-selection';
import { MESSAGE_CONVERT_SELECTION } from '@/utils/messages';
import { skipWordsItem } from '@/utils/settings';
import { TEXT, showToast } from '@/utils/toast';

// Things the user asks for explicitly (the context menu, the shortcut, buttons
// in the popup). This script is injected on demand and is separate from the
// typing script, so asking for one thing never switches typing on for a site.
export default defineUnlistedScript(() => {
  const flagged = window as unknown as { __yangiYozuvActions?: boolean };
  if (flagged.__yangiYozuvActions) return; // injected twice: the first listener is enough
  flagged.__yangiYozuvActions = true;

  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === MESSAGE_CONVERT_SELECTION) {
      convertSelectionAndReport().then(sendResponse);
      return true; // the answer is sent after the storage read
    }
  });
});

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
