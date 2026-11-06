const HIDE_AFTER_MS = 6000;

let current: HTMLElement | null = null;

/**
 * A small message in the corner of the page. With `copyText` it also shows a
 * button that copies that text, for when the browser won't let a script write
 * to the clipboard on its own. The shadow root keeps the page's CSS out.
 */
export function showToast({ message, copyText }: { message: string; copyText?: string }) {
  current?.remove();

  const host = document.createElement('div');
  host.style.cssText = 'all: initial; position: fixed; right: 16px; bottom: 16px; z-index: 2147483647;';
  const shadow = host.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = `
    .toast { display: flex; align-items: center; gap: 12px; max-width: 360px;
      padding: 10px 14px; border-radius: 8px; background: #1f2937; color: #fff;
      font: 14px/1.4 system-ui, sans-serif; box-shadow: 0 4px 16px rgba(0,0,0,.3); }
    button { font: inherit; padding: 4px 10px; border: 0; border-radius: 6px;
      background: #fff; color: #1f2937; cursor: pointer; }
  `;

  const toast = document.createElement('div');
  toast.className = 'toast';
  const text = document.createElement('span');
  text.textContent = message;
  toast.append(text);

  if (copyText !== undefined) {
    const button = document.createElement('button');
    button.textContent = TEXT.copy;
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(copyText);
        text.textContent = TEXT.copied;
        button.remove();
      } catch {
        text.textContent = TEXT.copyFailed;
      }
    });
    toast.append(button);
  }

  shadow.append(style, toast);
  document.documentElement.append(host);
  current = host;
  setTimeout(() => host.remove(), HIDE_AFTER_MS);
}

export const TEXT = {
  copied: 'Yangi alifboda nusxalandi',
  copy: 'Nusxa oliş',
  copyFailed: 'Nusxalab bölmadi',
  readonly: 'Bu matnni özgartirib bölmaydi. Yangi alifbodagisini nusxalang:',
  unchanged: 'Almaştiriladigan harf yöq',
};
