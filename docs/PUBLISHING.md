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
