---
name: user-manual-document
description: Write, update and publish the Arweqah user manual (Arabic + English, served at /docs) with real screenshots. Use when asked for the user manual, user guide, documentation pages or manual screenshots, and after any change to a page, button, permission or flow that the manual describes.
---

# User manual (served at `/docs`)

Plan: `docs/plans/user-manual.md`. Decision 367 in `docs/decisions.md`.

## Where things are
- Text: `docs/user-manual/sections/NN-name.<ar|en>.md`, one file per page, **both languages**, same structure. `00-intro` holds the `# ` title; every other file has one `## Title` (no number: the builder numbers it). Subset only: `###`/`####`, paragraphs, `- ` and `1. ` lists, `> ` notes, `**bold**`, `` `code` ``, tables, images `![alt](../images/<lang>/<file>.png)`.
- Groups and order: the `GROUPS` array in `scripts/build-user-manual.mjs` mirrors the side menu (same names, same order). A new page's file name is added there. Pages hidden from the menu (`hideFromMenu`) are not in the manual.
- Output (committed): `apps/web/public/docs/` (`index.html`, `ar/`, `en/`, `docs.css`, `fonts/`, `images/<lang>/`). Branded with the design system; static, no scripts (CSP).

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
1. `npm run docs:build` (sections → static pages).
2. Open `http://localhost:5173/docs/ar/` and `/docs/en/`; check the side menu groups, a long page, light and dark.
3. `npm run verify -- --quick`.
4. Update the plan log in `docs/plans/user-manual.md`. Then follow CLAUDE.md rule 18 (PR, CI, CodeRabbit, merge, deploy).

## Never
- Screenshots with real employee data (the manual is public, no sign-in).
- A manual page for something a role cannot reach without saying which key and mode it needs.
- Yellow as text, fixed colors outside the tokens in `docs.css`.
