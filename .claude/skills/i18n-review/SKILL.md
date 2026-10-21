---
name: i18n-review
description: Review and correct Arabic and English translations across the Arweqah platform (web ar/en JSON files, seeded lookup names, API error messages, emails). Use when adding or changing any user-facing text, when asked to review translation, spelling or terminology, or before finishing a feature.
---

# Translation review — Arweqah Platform

Arabic (RTL, default) and English must both be complete, correct and consistent. Run this on every feature that adds text, and on request for the whole site.

## Steps

1. **Run the checker:** `npm run i18n:check` (`scripts/i18n-check.mjs`). It reports keys missing in either language, empty values, `{{placeholder}}` mismatches, Arabic text in `en` (except `language.*`), non-Arabic values in `ar`, and hard-coded Arabic in `.tsx`/`.ts` files. Fix every item.
2. **Read the files side by side:** `apps/web/src/core/i18n/locales/{ar,en}.json` and each `apps/web/src/features/*/i18n/{ar,en}.json`. Also review translated seed data (`apps/api/src/database/seeds`) and API error messages.
3. **Check terminology** against [glossary.md](glossary.md). One concept = one term everywhere. Add new terms to the glossary in the same change.
4. **Fix and re-run** the checker. Report what changed, grouped: missing, wrong term, spelling, tone.

## Arabic rules
- Modern Standard Arabic, neutral and respectful. Address the user in the second person without gendered forms where possible (use «يمكنك»، not forms that assume gender).
- Spelling: hamza on أ/إ (أروقة، إنهاء، إضافة)، ta marbuta ة vs ه (استدامة، الريادة)، ى vs ي، no tatweel. Names: «عبدالعزيز» as the company writes it.
- Numbers in the UI follow the locale (`Intl.NumberFormat('ar-SA')`); never hard-code digits in strings, use `{{count}}`.
- Plurals need all CLDR forms Arabic uses (`_zero`, `_one`, `_two`, `_few`, `_many`, `_other`) when the text counts things.
- Punctuation: Arabic comma «،» and question mark «؟», no space before them.
- Keep Latin product names (Microsoft, Authenticator) as written, not transliterated.

## English rules
- Sentence case for buttons and labels, no trailing period on labels, a period on full sentences.
- US spelling. No contractions in error messages. Active voice, say what to do next.
- Same term for the same thing as the Arabic (see glossary): «موظف» is always *employee*, «وحدة» is always *unit*.

## Both languages
- Never concatenate translated fragments; use one key with interpolation.
- Error messages must not reveal whether an account exists, and must not include raw values of sensitive fields.
- Keys are stable English identifiers grouped by feature (`employees.form.workEmail`), never the text itself.
- Seeded lookup names live in translation tables (`lang = ar | en`), not in code. Arabic is the fallback.
- A new text change is not done until both languages are present and the checker passes.
