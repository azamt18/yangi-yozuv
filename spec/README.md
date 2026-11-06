# Shared test vectors

`test-vectors.json` lists what every implementation of the core must return. The
TypeScript code is checked against it by `src/core/test-vectors.test.ts`; the Android
(Kotlin) and iOS/macOS (Swift) ports must pass the same cases, so "converts correctly"
means one thing everywhere.

The expected results were written by hand from the reviewed unit tests and from
`docs/CYRILLIC-RULES.md`, not copied from program output. If a result looks wrong, fix the
rule first, then this file, then the code.

## Functions and cases

| key | call | each case has |
|---|---|---|
| `convertWord` | `convertWord(input, {skipWords})` | `input`, `output`, optional `skipWords` |
| `convertCyrillicWord` | `convertCyrillicWord(input, {skipWords})` | `input`, `output`, optional `skipWords` |
| `convertText` | `convertText(input, {skipWords, from})` | `input`, `output`, optional `skipWords`, `from` (`auto` is the default) |
| `isWordBoundary` | `isWordBoundary(char)` | `char`, `output` (boolean) |
| `planConversion` | `planConversion(text, caret, {skipWords})` | `text`, `caret`, `output` (`null` or `{start, end, original, replacement}`), optional `skipWords` |

`skipWords` are lowercase and matched ignoring case. Indexes are UTF-16 code units, as
in JavaScript; a port using another string type must convert them.

## What a port also needs

- The English word list `src/core/data/english-words.json`. `convertWord` leaves those words
  alone, so a port that lacks it fails the English cases. A few Uzbek words that English also
  has (`chin`, `chop`, `tush`, `mash`, `chap`) are converted anyway: see `UZBEK_OVERRIDES`
  in `src/core/convert.ts`.
- `isProtectedToken` from `src/core/protected.ts` (links, emails, handles, domains, camelCase).
- Output must be precomposed (NFC): `ş`, not `s` plus a combining cedilla.

## Changing the vectors

Add cases freely. Changing or removing one changes the contract: bump `version`, and say so
in the commit, because the ports will need updating.
