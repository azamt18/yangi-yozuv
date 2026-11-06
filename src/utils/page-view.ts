import { convertText } from '@/core/convert';

// Text in these is code or something the user is typing, not prose to rewrite.
const SKIPPED = 'script, style, noscript, template, textarea, code, pre, kbd, samp';
const FLUSH_DELAY_MS = 100;
const PRUNE_ABOVE = 5000;

interface Change {
  original: string;
  converted: string;
}

/**
 * Shows a page in the new alphabet by rewriting its text nodes, and puts the
 * original text back on request. It watches the page, so text that loads later
 * (feeds, single-page apps) is converted too. The state lives in this object,
 * so it belongs to one tab and is gone after a reload.
 */
export class PageView {
  #changes = new WeakMap<Text, Change>();
  #tracked = new Set<WeakRef<Text>>();
  #skipWords: ReadonlySet<string> = new Set();
  #observer: MutationObserver | null = null;
  #pending = new Set<Node>();
  #timer: ReturnType<typeof setTimeout> | undefined;

  get isOn(): boolean {
    return this.#observer !== null;
  }

  start(skipWords: ReadonlySet<string>) {
    this.#skipWords = skipWords;
    if (this.isOn) return;

    this.#convertTree(document.body);
    this.#observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === 'characterData') this.#pending.add(record.target);
        else record.addedNodes.forEach((node) => this.#pending.add(node));
      }
      clearTimeout(this.#timer);
      this.#timer = setTimeout(() => this.#flush(), FLUSH_DELAY_MS);
    });
    this.#observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    this.#observer.takeRecords(); // our own edits above
  }

  stop() {
    this.#observer?.disconnect();
    this.#observer = null;
    clearTimeout(this.#timer);
    this.#pending.clear();

    for (const ref of this.#tracked) {
      const node = ref.deref();
      const change = node && this.#changes.get(node);
      // If the page has changed the text since, that is newer than our copy.
      if (node && change && node.data === change.converted) node.data = change.original;
    }
    this.#tracked.clear();
  }

  #flush() {
    for (const node of this.#pending) {
      if (node.isConnected) this.#convertTree(node);
    }
    this.#pending.clear();
    this.#observer?.takeRecords(); // our own edits
    if (this.#tracked.size > PRUNE_ABOVE) this.#prune();
  }

  #convertTree(root: Node) {
    for (const node of textNodesIn(root)) {
      const known = this.#changes.get(node);
      if (known && node.data === known.converted) continue;

      const converted = convertText(node.data, { skipWords: this.#skipWords });
      if (converted === node.data) continue;

      this.#changes.set(node, { original: node.data, converted });
      this.#tracked.add(new WeakRef(node));
      node.data = converted;
    }
  }

  /** Forgets text nodes the page has removed, so a long-lived page doesn't pile them up. */
  #prune() {
    for (const ref of this.#tracked) {
      if (!ref.deref()?.isConnected) this.#tracked.delete(ref);
    }
  }
}

function textNodesIn(root: Node): Text[] {
  if (root instanceof Text) return isConvertible(root) ? [root] : [];

  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (isConvertible(node as Text)) nodes.push(node as Text);
  }
  return nodes;
}

function isConvertible(node: Text): boolean {
  const parent = node.parentElement;
  if (!parent || !/\p{L}/u.test(node.data)) return false;
  // The user's own writing is left to the typing and selection tools.
  if (parent.isContentEditable) return false;
  return !parent.closest(SKIPPED);
}
