# roadmap

goal: be the default way uzbeks type the new alphabet (ş, ç, ö, ğ) before and after the law o'rq-1184 takes effect on **2027-04-22**. users first, revenue later. hard rule on every platform: everything on device, no network requests, no tracking.

## competitors (chrome web store, checked 2026-11-06)

| extension | users | what it does | what it lacks |
|---|---|---|---|
| [lotin-kirill va yangi alifbo o'giruvchi](https://chromewebstore.google.com/detail/latin%E2%80%93cyrillic-new-alphab/inbahpclopinhpfodmfnambafebgopbp) (webiston.uz, v1.1.0) | 114, 5.0★ (4) | latin ↔ cyrillic ↔ new latin on selected text: a floating button, the right-click menu, ⌘/ctrl+shift+L to copy, an "almashtirish" button to replace in fields. auto-detects direction, handles the sh/ch boundary and -tsiya, skips links, emails and code. movable panel, dark mode, uz/ru/en ui, offline | no conversion as you type |
| [alifboçi](https://chromewebstore.google.com/detail/alifbo%C3%A7i-%E2%80%94-%C3%B6zbek-alifbosi/fffmoebomciidpelckdgfoojaaadomhe) (alifbochi.uz, v1.0.0) | 47, no ratings | cyrillic / old latin → new latin: a converter box in the popup, select + copy, right-click menu, **shows the whole page in the new alphabet and restores it**, **user exception list for brand names**, light/dark theme, on device | no conversion as you type, no reverse direction |
| [yangi alifbo by chessmaster.uz](https://chromewebstore.google.com/detail/yangi-alifbo-by-chessmast/hnekknbhhegbickoldchkhjdlhokeeah) (v1.2.2) | 33, 4.0★ (1) | displays page text in the new alphabet (old → new) | typing, selection, and cyrillic all unclear. privacy policy is on telegra.ph |

**what this means:** all three are tiny (under 200 users in total) and all three convert text that is *already written*. none of them converts *while you type*, which is our core and still unique. so the plan is to match their read/convert features inside the same extension (phase 1), so users never need a second one, and keep as-you-type plus one-backspace undo as the headline.

features to match, in priority order:
1. convert the selection (context menu + shortcut), including cyrillic → new latin (all three, and webiston's main feature)
2. a converter box in the popup: paste, convert, copy (alifboçi)
3. user exception list (brand names, own words) that both typing and selection respect (alifboçi)
4. "view this page in the new alphabet", with restore (alifboçi, chessmaster)
5. uz/ru/en ui and dark mode (webiston, alifboçi)
6. reverse direction, new latin → cyrillic / old latin, for sending to systems that don't support the new letters yet (webiston, partially). lowest priority

---

status legend: `[x]` done · `[ ]` todo · `(model)` suggested claude model for the task. what each tag means is under "model guide" at the bottom.

---

## phase 0: launch the extension (nov 2026)

- [x] chrome extension 0.1.0 published on the chrome web store
- [x] 0.1.1: convert on keydown so lexical editors (instagram) keep the cursor in place
- [ ] upload 0.1.1 zip as a store update (manual, dashboard → package → upload new package)
- [x] e2e coverage by editor type: plain fields, Lexical, ProseMirror, Gmail-style nested divs (17 checks, all pass)
- [ ] manual test on the live sites, which the e2e suite can't log into: gmail, whatsapp web, linkedin, facebook; plus yandex browser and opera (user, 10 minutes)
- [ ] fix whatever breaks, adding an e2e case for each one `(sonnet; opus if it's an editor-internals bug like lexical)`
- [x] russian store description and uzbek telegram announcement drafted in `store/LAUNCH-TEXTS.md`
- [ ] post the announcement (add a feedback contact first). the russian listing is optional and low priority: it rests on an unverified guess that many users search the store in russian
- [ ] screenshots with real ş/ç/ö/ğ examples in uzbek `(sonnet)`

**exit:** 0.1.1 live, there are no known breakages on the top 5 sites, and the first ~100 installs.

## phase 1: extension v0.2, feature parity with competitors + wider reach (nov – dec 2026)

build in this order. each step ships on its own, with unit tests plus an e2e case where there is a page involved.

- [x] cyrillic → new latin mapping rules designed: `docs/CYRILLIC-RULES.md` `(opus)`
- [x] `src/core/cyrillic.ts`: implement the rules, passing every example in the rules doc as a unit test `(sonnet)`
- [x] one `convertText(text, {from: 'auto'})` entry point that handles old latin, cyrillic, and mixed text. typing keeps its current path `(sonnet)`
- [x] **convert selection**: a context-menu item plus a shortcut (`commands` api, alt+shift+Y suggested, because ctrl+shift+L is taken by webiston and some sites). it replaces in place inside editable fields, otherwise it copies to the clipboard and shows a small toast. needs `contextMenus` (no new host permissions; it uses activeTab) `(sonnet)`. e2e covers fields, rich text, lexical and read-only text by sending the same message the menu sends. **not covered by tests, check by hand:** the real right-click menu, the alt+shift+y shortcut, and injecting the script on a site that isn't in the default list (activeTab). known limitation: in rich editors a whole-node word right after other formatted text (`plain <b>choy</b>`) is skipped, because an edit there would lose its formatting
- [x] **popup converter box**: a textarea, live conversion, and a copy button `(sonnet)`
- [x] **exception list**: words in the popup settings that are never converted (case-insensitive, whole word), used by typing, selection, and page view `(sonnet)` (typing, selection, popup box and page view all read it)
- [x] **view page in the new alphabet**: walks text nodes (skipping inputs, code/pre, scripts, contenteditable), keeps the originals in a WeakMap, has a "restore" button, and is per tab, not persistent. a MutationObserver handles content that loads later `(sonnet; opus if spa pages fight it)` **by hand:** the popup button itself (e2e sends the same messages, but can't open the popup as the real browser action)
- [x] ui languages uz (default), ru, en via `_locales` + `browser.i18n`, plus dark mode via `prefers-color-scheme` `(haiku)` (dark mode was already there). the ui follows the browser's language through `_locales`: an english-language chrome in uzbekistan shows english, there is no in-popup language switch yet. **uzbek text needs a native read-through**
- [x] per-site on/off toggle in the popup `(sonnet)` (was already in 0.1)
- [x] edge add-ons and firefox builds `(sonnet)`. firefox builds as mv3 (`npm run zip:firefox`), `web-ext lint` is clean, steps in `docs/PUBLISHING.md`. **not yet run inside firefox itself**, and the actual store submissions are yours to do
- [x] **shared test vectors**: export the core + cyrillic cases to `spec/test-vectors.json`, which becomes the single source of truth for kotlin and swift `(sonnet)` 142 cases in `spec/test-vectors.json`, with the contract for ports in `spec/README.md`; `src/core/test-vectors.test.ts` makes the typescript code pass them
- [x] local-only usage counter in the popup ("you converted 1,240 words"). it stays on the device, nothing is sent `(haiku)`. counts typing (and takes back an undo) plus selection; page view isn't counted. `PRIVACY.md` now mentions the number
- [x] update the store listing: "the only one that converts *as you type*, and it also converts cyrillic, selections and whole pages" plus new screenshots `(sonnet)`. text and permission justifications are in `store/LISTING.md`, uzbek popup screenshots are regenerated (`npm run store:graphics`); **pasting them into the dashboard is yours**. the gmail / whatsapp web claims in the description are still unverified
- [ ] later (low priority): reverse direction, new latin → cyrillic / old latin `(sonnet)`

**exit:** every feature the three competitors have is in yangi yozuv, it is live in 3 stores, and the test vectors are frozen as a versioned spec.

## phase 2: windows and office, for government work (dec 2026 – feb 2027)

why: most government work happens in word and excel on windows, where a browser extension never runs. those offices also hold huge archives of existing documents that have to move to the new alphabet. this is probably the biggest single user group before the law date, so it goes before android.

unverified assumptions (check with real gov users before building): windows desktop office rather than the web version; staff cannot install software without admin rights; internet access may be restricted; IT must approve anything they install.

- [ ] talk to 2–3 people who work in gov offices: what they use, what IT lets them install, what they'd convert first (user, 1 week)
- [ ] **bulk document converter first**, because it works under any IT policy: a static page that runs fully in the browser, where you drop in `.docx` / `.xlsx` / `.pptx` and get converted copies back. nothing is installed and nothing is uploaded. it reuses the typescript core. rules to get right: words split across formatting runs, excel cell values (never formulas, sheet names or number formats), headers/footers/footnotes, cyrillic → new latin as an option `(opus: run-splitting and excel rules, sonnet: implement)`
- [ ] test on real gov-style documents, comparing before and after by eye, plus automated checks that formatting and formulas are unchanged `(sonnet)`
- [ ] typing inside word and excel, decided after the gov-user talks: (a) windows input method, which works in every app but is the hardest and usually needs admin; (b) tray helper with a keyboard hook, simpler but antivirus and IT may block it; (c) office add-in, which installs per user from an org catalog but can't intercept keystrokes, so it converts the selection or on a button; (d) a keyboard layout with ş ç ö ğ only, no auto-convert `(opus: pick the approach)`
- [ ] check ş ç ö ğ render in the fonts government documents use (times new roman, arial, calibri) `(sonnet)`
- [ ] a one-page note in uzbek for IT departments: open source, no network access, how to verify the download `(sonnet)`

**exit:** a government employee can convert a folder of old documents in minutes without installing anything, and has a way to type the new letters in word.

## phase 3: android keyboard (feb – apr 2027)

this is the biggest lever, because most uzbek users type on phones. the competitor is alifbo (open source, old→new button). we differ by converting automatically as you type, with the same "when unsure, don't convert" rules.

- [ ] architecture decision: kotlin ime from scratch vs fork of an open-source keyboard (florisboard, heliboard) `(opus)`
- [ ] port the core converter to kotlin, passing every case in `spec/test-vectors.json` `(sonnet)`
- [ ] keyboard layout with ş ç ö ğ on the main layer plus long-press `(sonnet)`
- [ ] as-you-type conversion and backspace-undo inside the ime `(opus: the composing-text edge cases are subtle)`
- [ ] offline word suggestions in the new alphabet (bundled word list) `(sonnet)`
- [ ] play store listing, privacy policy (no internet permission at all, which is a strong selling point) `(sonnet)`
- [ ] closed beta via the telegram channel `(manual)`

**exit:** public on google play, with beta feedback addressed.

## phase 4: law-date campaign (mar – apr 2027)

- [ ] landing page (static, no analytics) explaining the new letters, with links to all versions `(sonnet)`
- [ ] outreach: teachers, uzbek tech telegram channels, news sites, ministry and school contacts `(manual; sonnet drafts the texts)`
- [ ] "learn the new letters" mini-guide inside the extension popup and the keyboard onboarding `(sonnet)`

**exit:** a visible spike in installs around 2027-04-22.

## phase 5: ios and macos (apr – jul 2027)

- [ ] swift core passing `spec/test-vectors.json` `(sonnet)`
- [ ] ios keyboard extension (no "full access" needed, which keeps the privacy promise) `(opus for the design, sonnet to implement)`
- [ ] macos input method or a keyboard layout plus a text-replacement helper `(opus: pick the approach)`
- [ ] app store listings `(sonnet)`

**exit:** live on the app store.

## phase 6: sustainability (h2 2027+)

the core stays free forever. revenue options to evaluate once there are users:

- [ ] paid extras for organisations built on the phase 2 converter: batch folders, command-line use for IT, support contract (the basic converter stays free)
- [ ] b2b licensing for schools, publishers and government offices that must convert archives
- [ ] donations or sponsorship ("powered by" from a local company)

decide after phase 4, using real install numbers `(opus for the analysis)`.

---

## model guide

| tag | when to use | why |
|---|---|---|
| `haiku` | mechanical, tightly specified edits (copy, small ui bits, renames) | cheapest and fast. fine when there is nothing to reason about |
| `sonnet` | **default for implementation**: features with a clear spec, ports against test vectors, store texts | best balance of cost and output for well-defined work |
| `opus` | architecture decisions, editor/ime edge cases, debugging that already failed once | stronger reasoning. pays off when a wrong call costs days |

rule of thumb: plan with opus, build with sonnet, and switch back to opus only when sonnet gets stuck twice on the same problem.
