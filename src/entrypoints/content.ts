import { isWordBoundary, planConversion } from '@/core/typing';
import { disabledSitesItem, enabledItem, skipWordsItem } from '@/utils/settings';
import { DEFAULT_SITES, EXCLUDED_SITES } from '@/utils/sites';

type Editable = HTMLInputElement | HTMLTextAreaElement | HTMLElement;

/** Text before the caret, and a way to select part of it for replacing. */
interface CaretContext {
  text: string;
  caret: number;
  select(start: number, end: number): void;
}

/** What the last conversion left behind, so one Backspace can undo it. */
interface Conversion {
  target: Editable;
  /** The word as typed, and what it was converted to. */
  original: string;
  replacement: string;
  /** The character that ended the word; the browser types it after the conversion. */
  boundary: string;
}

// Input types where people type words; email, url and password stay untouched.
const TEXT_INPUT_TYPES = new Set(['text', 'search', '']);
const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta']);

export default defineContentScript({
  matches: DEFAULT_SITES,
  excludeMatches: EXCLUDED_SITES,
  allFrames: true,
  runAt: 'document_idle',

  async main() {
    // The background worker can inject this script into a tab that already
    // has it (after the user switches a site on), so guard against doubling.
    const flagged = window as unknown as { __yangiYozuv?: boolean };
    if (flagged.__yangiYozuv) return;
    flagged.__yangiYozuv = true;

    let enabled = await enabledItem.getValue();
    let siteDisabled = (await disabledSitesItem.getValue()).includes(location.hostname);
    let skipWords = new Set(await skipWordsItem.getValue());
    enabledItem.watch((value) => (enabled = value));
    disabledSitesItem.watch((value) => (siteDisabled = value.includes(location.hostname)));
    skipWordsItem.watch((value) => (skipWords = new Set(value)));

    let lastConversion: Conversion | null = null;

    // Everything happens on keydown, before the key's own character is typed.
    // Editors like Lexical (Instagram's message box) ignore edits a script makes
    // from inside an input event and then apply the keystroke at a stale cursor
    // position, which scrambled the text. A keydown handler isn't inside one.
    document.addEventListener(
      'keydown',
      (event) => {
        if (event.isComposing || MODIFIER_KEYS.has(event.key)) return;

        const previous = lastConversion;
        lastConversion = null;
        if (previous && event.key === 'Backspace' && event.target === previous.target) {
          if (undoConversion(event, previous)) return;
        }

        if (!enabled || siteDisabled) return;

        // Enter types no word-ending character, but chat apps send on Enter,
        // so the last word is converted first.
        const isBoundaryKey =
          event.key.length === 1 &&
          isWordBoundary(event.key) &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.altKey;
        if (event.key !== 'Enter' && !isBoundaryKey) return;

        const target = editableTarget(event.target);
        const context = target && caretContext(target);
        if (!target || !context) return;

        const plan = planConversion(context.text, context.caret, { skipWords });
        if (!plan) return;

        context.select(plan.start, plan.end);
        document.execCommand('insertText', false, plan.replacement);

        // The browser types the boundary character right after this handler.
        if (isBoundaryKey) {
          lastConversion = {
            target,
            original: plan.original,
            replacement: plan.replacement,
            boundary: event.key,
          };
        }
      },
      true,
    );

    document.addEventListener('mousedown', () => (lastConversion = null), true);

    /** Restores the typed word when Backspace comes right after a conversion. */
    function undoConversion(
      event: KeyboardEvent,
      { target, original, replacement, boundary }: Conversion,
    ) {
      const context = caretContext(target);
      if (!context) return false;
      const typed = replacement + boundary;
      const start = context.caret - typed.length;
      if (start < 0) return false;
      // Editable areas store a trailing space as a non-breaking space.
      const before = context.text.slice(start, context.caret).replace(/\u00a0/g, ' ');
      if (before !== typed) return false;

      // Editors like Lexical handle Backspace in their own keydown listener,
      // so the key must not reach them or they delete a character on top of this.
      event.preventDefault();
      event.stopImmediatePropagation();

      // Only the word is replaced, never the boundary character after it: Lexical
      // throws away edits that reach across it. The caret then sits right after
      // the restored word, so move it back past the boundary character. That
      // waits a turn because Lexical puts its own caret back once it has caught
      // up with the edit, which would undo an immediate move.
      context.select(start, start + replacement.length);
      document.execCommand('insertText', false, original);
      setTimeout(() => {
        const after = caretContext(target);
        if (after) after.select(after.caret + boundary.length, after.caret + boundary.length);
      });
      return true;
    }
  },
});

function editableTarget(node: EventTarget | null): Editable | null {
  if (node instanceof HTMLInputElement) return TEXT_INPUT_TYPES.has(node.type) ? node : null;
  if (node instanceof HTMLTextAreaElement) return node;
  if (node instanceof HTMLElement && node.isContentEditable) return node;
  return null;
}

function caretContext(target: Editable): CaretContext | null {
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    const caret = target.selectionStart;
    if (caret === null || caret !== target.selectionEnd) return null;
    return {
      text: target.value,
      caret,
      select: (start, end) => target.setSelectionRange(start, end),
    };
  }

  // Rich editors: only handle a collapsed caret inside a text node. A word
  // split across formatting (half bold) is left alone.
  const selection = window.getSelection();
  const node = selection?.anchorNode;
  if (!selection?.isCollapsed || !(node instanceof Text)) return null;
  return {
    text: node.data,
    caret: selection.anchorOffset,
    select: (start, end) => {
      const range = document.createRange();
      range.setStart(node, start);
      range.setEnd(node, end);
      selection.removeAllRanges();
      selection.addRange(range);
    },
  };
}
