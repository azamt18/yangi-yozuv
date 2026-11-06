# roadmap

goal: be the default way uzbeks type the new alphabet (ş, ç, ö, ğ) before and after the law o'rq-1184 takes effect on **2027-04-22**. users first, revenue later. hard rule on every platform: everything on device, no network requests, no tracking.

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

## phase 1: extension v0.2, wider reach (dec 2026)

- [ ] edge add-ons and firefox builds (wxt supports both, so mostly packaging) `(sonnet)`
- [ ] "convert selection" context menu: fixes old-alphabet text that is already written `(sonnet)`
- [ ] cyrillic → new latin conversion for selected text (much of the existing text is cyrillic) `(opus: design the mapping rules, sonnet: implement)`
- [ ] per-site on/off toggle in the popup `(sonnet)`
- [ ] **shared test vectors**: export the core cases to `spec/test-vectors.json`, which becomes the single source of truth for kotlin and swift `(sonnet)`
- [ ] local-only usage counter in the popup ("you converted 1,240 words"). it stays on the device, nothing is sent `(haiku)`

**exit:** live in 3 stores, and the test vectors are frozen as a versioned spec.

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
