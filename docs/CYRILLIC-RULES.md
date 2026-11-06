# cyrillic → new latin rules

this is the spec for `src/core/cyrillic.ts`. every example in the tables below becomes a unit test. where a rule here disagrees with the official o'rq-1184 annex, the annex wins: fix this doc first, then the code.

## 1. letter map

| cyrillic | new latin | note |
|---|---|---|
| а б в г д | a b v g d | |
| е | e / ye | see rule 2 |
| ё | yo | |
| ж | j | |
| з и й к л м н | z i y k l m n | |
| о п р с т у ф х | o p r s t u f x | х → **x**, not h |
| ц | s / ts | see rule 3 |
| ч | **ç** | |
| ш | **ş** | |
| ъ | ʼ (U+02BC) | the tutuq sign, see rule 4 |
| ь | (dropped) | |
| э | e | |
| ю | yu | |
| я | ya | |
| ў | **ö** | |
| қ | q | |
| ғ | **ğ** | |
| ҳ | h | |
| щ | şç | russian loanwords only, rare |

always output the precomposed characters ş ç ö ğ (NFC). never output s + combining cedilla.

## 2. е → ye or e

`ye` at the start of a word, after a vowel (а е ё и о у э ю я ў), and after ъ or ь. otherwise `e`.

| input | output |
|---|---|
| ер | yer |
| оилае | oilaye |
| шеър | şeʼr |
| поезд | poyezd |
| келди | keldi |
| Европа | Yevropa |

## 3. ц → s or ts

`s` at the start of a word and after a consonant. `ts` after a vowel.

| input | output |
|---|---|
| цирк | sirk |
| концерт | konsert |
| станция | stansiya |
| лицей | litsey |
| милиция | militsiya |
| акция | aksiya |

## 4. ъ and ь

- ъ → `ʼ` (U+02BC, a letter that stays in the new alphabet): маъно → maʼno, таълим → taʼlim, шеър → şeʼr
- ъ before е/ё/ю/я inside russian loanwords (съезд, объект) → drop the ъ, and the vowel gets its y-form from rule 2: съезд → syezd, объект → obyekt. this is detected by the next letter being е ё ю я.
- ь → dropped: апрель → aprel, мебель → mebel. this also triggers rule 2 for a following е: пьеса → pyesa

## 5. case

convert a letter's case using its own case, with one exception. when a cyrillic letter becomes 2 latin letters (ё ю я щ, е→ye, ц→ts), check whether the word is all caps:

- all caps (2+ letters, no lowercase): every output letter is upper. ЁШЛАР → YOŞLAR, ЮНЕСКО → YUNESKO
- otherwise only the first output letter keeps the case: Ёшлар → Yoşlar, Юлдуз → Yulduz, Ер → Yer
- single letter words (Я) → Ya

## 6. what is never converted

- protected tokens, using the existing `isProtectedToken` (urls, emails, @mentions, #tags, file names, camelCase)
- words in the user's exception list (`skipWords`)
- any token that has no cyrillic letters (it goes to the old-latin path instead)

## 7. mixed and auto-detect

- detection is per token: if it has a cyrillic letter, use the cyrillic map. if it has latin letters, use the existing `convertWord` (old latin → new). a token with both (rare, usually a typo) is converted letter by letter with the cyrillic map, and its latin letters are kept as they are.
- **russian text**: the converter can't tell uzbek cyrillic from russian. for **selection / popup** (explicit user action) it converts anyway, because the user chose the text. for **page view**, it only converts a text node if the page contains at least one of ў қ ғ ҳ somewhere, or `<html lang>` is `uz` / `uz-Cyrl`. otherwise the popup shows "bu sahifa özbekça emasga öxşaydi" and a "convert anyway" button.

## 8. full sentence tests

| input | output |
|---|---|
| Ўзбекистон Республикаси | Özbekiston Respublikasi |
| Шаҳар марказида янги мактаб очилди. | Şahar markazida yangi maktab oçildi. |
| Ғалаба куни, 9 май | Ğalaba kuni, 9 may |
| Чой ичасизми? | Çoy içasizmi? |
| ТОШКЕНТ ШАҲРИ | TOŞKENT ŞAHRI |
| www.gov.uz сайтида | www.gov.uz saytida |
| Исҳоқ | Ishoq |

## open questions (check against the official annex before shipping)

- does the new alphabet keep `ʼ` for ъ, or drop it? this doc assumes it keeps it.
- old latin `s'h` (Is'hoq) existed only to separate s+h from sh. now that ş is its own letter, should the old-latin path also turn `s'h` → `sh`? this doc assumes **yes** for cyrillic input (Исҳоқ → Ishoq). doing the same in the old-latin path is a separate change to `convert.ts`, with its own tests.
- щ: keep `şç`, or map it to `ş`? it's rare, so `şç` for now.
