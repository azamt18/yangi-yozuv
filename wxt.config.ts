import { defineConfig } from 'wxt';

// See https://wxt.dev/api/reference/wxt/interfaces/inlineconfig.html
export default defineConfig({
  srcDir: 'src',
  manifest: ({ browser }) => ({
    // The popup, menu and messages follow the browser's language (uz, ru, en).
    default_locale: 'uz',
    name: 'Yangi Yozuv: Ş Ç Ö Ğ',
    description:
      'Yangi özbek alifbosida yozing: sh→ş, ch→ç, oʻ→ö, gʻ→ğ avtomatik. Type the new Uzbek alphabet as you write.',
    permissions: ['storage', 'scripting', 'activeTab', 'contextMenus'],
    commands: {
      'convert-selection': {
        suggested_key: { default: 'Alt+Shift+Y' },
        description: '__MSG_commandConvertSelection__',
      },
    },
    optional_host_permissions: ['*://*/*'],
    // Firefox needs a permanent id and a statement of what data the add-on
    // collects (none). Chrome ignores this block.
    ...(browser === 'firefox'
      ? {
          browser_specific_settings: {
            gecko: {
              id: 'yangi-yozuv@azamt18.github.io',
              strict_min_version: '140.0',
              data_collection_permissions: { required: ['none'] },
            },
            // Firefox for Android only understands the data statement from 142.
            gecko_android: { strict_min_version: '142.0' },
          },
        }
      : {}),
    // Only the browser test sets this (npm run test:e2e). It stands in for the
    // activeTab grant a real click gives, which a script can't produce.
    ...(process.env.YANGI_YOZUV_E2E ? { host_permissions: ['*://test.uz/*', '*://test.example/*'] } : {}),
  }),
});
