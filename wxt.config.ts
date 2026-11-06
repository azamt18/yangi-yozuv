import { defineConfig } from 'wxt';

// See https://wxt.dev/api/reference/wxt/interfaces/inlineconfig.html
export default defineConfig({
  srcDir: 'src',
  manifest: {
    name: 'Yangi Yozuv: Ş Ç Ö Ğ',
    description:
      'Yangi özbek alifbosida yozing: sh→ş, ch→ç, oʻ→ö, gʻ→ğ avtomatik. Type the new Uzbek alphabet as you write.',
    permissions: ['storage', 'scripting', 'activeTab', 'contextMenus'],
    commands: {
      'convert-selection': {
        suggested_key: { default: 'Alt+Shift+Y' },
        description: 'Belgilangan matnni yangi alifboga özgartiriş',
      },
    },
    optional_host_permissions: ['*://*/*'],
    // Only the browser test sets this (npm run test:e2e). It stands in for the
    // activeTab grant a real click gives, which a script can't produce.
    ...(process.env.YANGI_YOZUV_E2E ? { host_permissions: ['*://test.uz/*'] } : {}),
  },
});
