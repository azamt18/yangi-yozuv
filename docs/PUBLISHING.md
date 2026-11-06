# Publishing to the Chrome Web Store

1. Register at https://chrome.google.com/webstore/devconsole (one-time $5 fee;
   Google may ask for identity verification).
2. Run `npm test && npm run test:e2e && npm run zip`.
3. **New item** → upload `.output/yangi-yozuv-0.1.0-chrome.zip`.
4. Fill in the store listing and privacy tabs from `store/LISTING.md`.
5. Paste the public privacy policy URL in the privacy tab:
   `https://github.com/azamt18/yangi-yozuv/blob/main/PRIVACY.md`
6. Submit for review. New extensions usually take from a few hours to a few days.

Edge, Opera and Yandex Browser can install from the Chrome Web Store. Edge also
has its own store (Partner Center) if you want a separate listing later.

## Updating an existing listing

Bump `version` in `package.json`, run `npm test && npm run test:e2e && npm run zip`,
then in the dashboard open the item → **Package** → **Upload new package**.

## Microsoft Edge Add-ons

Edge runs the Chrome build unchanged.

1. Register at https://partner.microsoft.com/dashboard/microsoftedge (free).
2. **Create new extension** and upload the same `.output/yangi-yozuv-<version>-chrome.zip`.
3. Reuse the texts and graphics from `store/LISTING.md`, and the same privacy policy URL.

## Firefox (addons.mozilla.org)

1. Sign in at https://addons.mozilla.org/developers/ (free).
2. Run `npm run lint:firefox` (builds the Firefox version and checks the manifest), then
   `npm run zip:firefox`. It writes two files to `.output/`: the extension and a
   `-sources.zip`.
3. **Submit a new add-on**, choose "On this site", upload the extension zip, and upload the
   sources zip when asked for source code (the bundled code is generated from it).
4. The add-on id is `yangi-yozuv@azamt18.github.io` (set in `wxt.config.ts`). It becomes
   permanent on the first submission, so change it before then if you want a different one.

The Firefox build needs Firefox 140 or later (142 on Android) because of the
data-collection declaration (`none`), and it is a Manifest V3 build (`--mv3`).
It passes `web-ext lint` but has not been run in Firefox itself yet.
