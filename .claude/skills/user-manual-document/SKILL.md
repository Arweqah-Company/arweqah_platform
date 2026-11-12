---
name: user-manual-document
description: Write, update and publish the Arweqah user manual (Arabic + English, the page /docs of the signed-in app) with real screenshots. Use when asked for the user manual, user guide, documentation pages or manual screenshots, and after any change to a page, button, permission or flow that the manual describes.
---

# User manual (served at `/docs`)

Plan: `docs/plans/user-manual.md`. Decision 372 in `docs/decisions.md`.

## Where things are
- Text: `docs/user-manual/sections/NN-name.<ar|en>.md`, one file per page, **both languages**, same structure. `00-intro` holds the `# ` title; every other file has one `## Title` (no number: the builder numbers it). Subset only: `###`/`####`, paragraphs, `- ` and `1. ` lists, `> ` notes, `**bold**`, `` `code` ``, tables, images `![alt](../images/<lang>/<file>.png)`.
- Groups and order: the `GROUPS` array in `scripts/build-user-manual.mjs` mirrors the side menu (same names, same order). A new page's file name is added there. Pages hidden from the menu (`hideFromMenu`) are not in the manual.
- Output (committed): `apps/web/src/features/docs/content/manual.<lang>.json` (data blocks; the page `features/docs` draws them, per permission) and the screenshots in `apps/web/public/docs/images/<lang>/`. A new section = its file in `GROUPS` and its row in `ACCESS` (permission names from `keys.ts`, page-visibility key) in `scripts/build-user-manual.mjs`. Every page's section has `### Fields (form inputs)` (every input and what it is for) and `### Workflow` (steps, status table with who moves it and the permission, automatic things, what each person sees), before `### Business rules`.

## Each page section, in this order
1. Purpose (one paragraph) and a screenshot.
2. Who sees it: view key and label, default scope and roles, whether admin mode is needed.
3. What you can do: table Action | What happens | Permission key (label), one row per button and row action.
4. How to: numbered steps for the main jobs.
5. Business rules (statuses, who approves, limits, what is refused, scope 404, audit, notifications), with FR ids.
6. Tips / common problems.
Sources: README §4 and §12, `docs/decisions.md`, `docs/plans/*.md`, `keys.ts` and `*.permissions.ts`, the feature's `i18n/{ar,en}.json` for the exact screen wording. Never invent a rule; leave out what is unclear. Plain language, no endpoints or class names.

## Screenshots
`npm run build` then `npm run docs:screenshots`. It resets and seeds its **own** database (`arweqah_platform_e2e`, demo organization, known admin authenticator secret), starts the built API (:3100) and web (:4173), signs in through the API, turns admin mode on, skips the tour, and captures every page in `PAGES` for `ar` (RTL) and `en` (LTR) at 1440×900 into `apps/web/public/docs/images/<lang>/`. The language is chosen with the key `arweqah.language` in local storage. It never touches the development database or the real admin's authenticator. A new page = one line in `PAGES` in `scripts/capture-docs-screenshots.mjs`. Look at an `en` image after a run: it must be English.

## Build and check
1. `npm run docs:build` (sections → JSON).
2. Sign in and open `http://localhost:5173/docs` (both languages, an admin and a plain employee); check the side menu groups, a long page, light and dark.
3. `npm run verify` in full (it runs both e2e suites; `--quick` only while iterating, never as the final check).
4. Update the plan log in `docs/plans/user-manual.md`. Then follow CLAUDE.md rule 18 (PR, CI, CodeRabbit, merge, deploy).

## Never
- Screenshots with real employee data (the manual is public, no sign-in).
- A manual page for something a role cannot reach without saying which key and mode it needs.
- Yellow as text, fixed colors outside the tokens in `docs-prose.css`.
