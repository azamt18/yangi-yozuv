import { convertText } from '@/core/convert';

export type SelectionResult =
  /** Nothing is selected in this frame. */
  | { kind: 'none' }
  /** The selection has no letters to convert. */
  | { kind: 'unchanged' }
  /** The selection was an editable field and has been rewritten in place. */
  | { kind: 'replaced' }
  /** The selection is page text we can't edit; this is the converted version. */
  | { kind: 'readonly'; text: string };

// Input types where people type words; the same list the typing code uses.
const TEXT_INPUT_TYPES = new Set(['text', 'search', '']);

/**
 * Converts the text the user has selected: old Latin and cyrillic both become
 * the new alphabet. Inside an editable field the selection is replaced in place;
 * on a normal page the converted text is returned for the caller to copy.
 */
export async function convertSelection(skipWords: ReadonlySet<string>): Promise<SelectionResult> {
  const convert = (text: string) => convertText(text, { skipWords });
  const active = document.activeElement;

  if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
    if (active instanceof HTMLInputElement && !TEXT_INPUT_TYPES.has(active.type)) {
      return { kind: 'none' };
    }
    const { selectionStart: start, selectionEnd: end } = active;
    if (start === null || end === null || start === end) return { kind: 'none' };
    const converted = convert(active.value.slice(start, end));
    if (converted === active.value.slice(start, end)) return { kind: 'unchanged' };
    // The selection is still in place, so this replaces exactly that text and
    // keeps the browser's undo history.
    if (!document.execCommand('insertText', false, converted)) {
      active.setRangeText(converted, start, end, 'select');
      active.dispatchEvent(new Event('input', { bubbles: true }));
    }
    return { kind: 'replaced' };
  }

  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || !selection.rangeCount) return { kind: 'none' };
  const range = selection.getRangeAt(0);

  if (!isEditable(range.commonAncestorContainer)) {
    const text = selection.toString();
    const converted = convert(text);
    return converted === text ? { kind: 'unchanged' } : { kind: 'readonly', text: converted };
  }

  // Rich editors: convert one text node at a time so bold, links and line
  // breaks stay as they are. A word split across two formatting runs is left
  // alone. Going from the end keeps the earlier offsets valid.
  let changed = false;
  for (const { node, start, end } of textSegments(range).reverse()) {
    const original = node.data.slice(start, end);
    const converted = convert(original);
    if (converted === original) continue;

    // Replace only the part that differs. An edit that starts at the very
    // beginning of a text node makes the browser type into the node before it,
    // so "<b>bold </b>choy" would turn "çoy" bold. Where that could happen the
    // word is left unconverted rather than getting the wrong formatting.
    let head = 0;
    while (original[head] === converted[head]) head++;
    let tail = 0;
    while (
      tail < original.length - head &&
      tail < converted.length - head &&
      original[original.length - 1 - tail] === converted[converted.length - 1 - tail]
    ) {
      tail++;
    }
    const from = start + head;
    if (from === 0 && !startsLine(node)) continue;

    const part = document.createRange();
    part.setStart(node, from);
    part.setEnd(node, end - tail);
    selection.removeAllRanges();
    selection.addRange(part);
    await selectionSettled();
    document.execCommand('insertText', false, converted.slice(head, converted.length - tail));
    changed = true;
  }
  return changed ? { kind: 'replaced' } : { kind: 'unchanged' };
}

/**
 * Waits until editors have noticed a selection we just set. Lexical updates its
 * own idea of the selection a tick after the browser's `selectionchange`; if we
 * insert before that, it still thinks the old, larger selection is current and
 * replaces all of it.
 */
function selectionSettled(): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      document.removeEventListener('selectionchange', done);
      clearTimeout(timer);
      setTimeout(resolve);
    };
    // No event fires if the selection didn't actually change.
    const timer = setTimeout(done, 50);
    document.addEventListener('selectionchange', done);
  });
}

/** True when no other text comes before this node on its line. */
function startsLine(node: Text): boolean {
  let current: Node = node;
  for (;;) {
    const before = current.previousSibling;
    if (before) return before instanceof HTMLBRElement;
    const parent = current.parentElement;
    if (!parent || getComputedStyle(parent).display !== 'inline') return true;
    current = parent;
  }
}

function isEditable(node: Node): boolean {
  const element = node instanceof Element ? node : node.parentElement;
  return element instanceof HTMLElement && element.isContentEditable;
}

/** The part of each text node that the range covers, in document order. */
function textSegments(range: Range): { node: Text; start: number; end: number }[] {
  const container = range.commonAncestorContainer;
  const nodes: Text[] = [];
  if (container instanceof Text) {
    nodes.push(container);
  } else {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (range.intersectsNode(node)) nodes.push(node as Text);
    }
  }
  return nodes.map((node) => ({
    node,
    start: node === range.startContainer ? range.startOffset : 0,
    end: node === range.endContainer ? range.endOffset : node.data.length,
  }));
}
