---
name: arweqah-design-system
description: Arweqah Alreyadah design system for the web dashboard (brand tokens, typography, RTL-first layout, shared components, page patterns, accessibility). Use when designing or building any screen, component, form or page in apps/web, or when reviewing UI for brand consistency.
---

# Arweqah design system

Source of truth in code: `apps/web/src/core/theme.css` (brand tokens; Tailwind default palette is reset so only brand colors exist) and `apps/web/src/shared/ui/` (components). Reuse before creating; extend `shared/ui` instead of one-off markup.

## Principles
1. **Quiet and trustworthy:** an internal ERP. Dense but calm, generous space, no decoration beyond the logo.
2. **Arabic first, RTL default;** English (LTR) is a full peer. Design in RTL, then check LTR.
3. **Every state designed:** loading (skeleton), empty (message + action), error (alert + retry), no permission.
4. **Accessible by default:** WCAG 2.1 AA, keyboard, screen readers, axe clean.

## Palette (official Arweqah brand colors)
Seven brand colors, used in proportion: **primary 60 %**, **secondary 35 %**, and **yellow never more than 5 % of any screen**.

| Share | Name (meaning) | Token | HEX | Typical use |
|---|---|---|---|---|
| Primary 60 % | Clarity — light beige | `cream` | `#FFFCEE` | Page and panel background, text on dark |
| Primary 60 % | Growth — green | `green-400` | `#85BA95` | Positive states, progress, accents on dark, icons |
| Primary 60 % | Strength — very dark navy | `ink` | `#0C2028` | Text, sidebar, top-level headings, dark panels |
| Secondary 35 % | Ambition — orange | `orange-500` | `#C16426` | Highlights, key calls to action, warnings, large text |
| Secondary 35 % | Balance — beige gray | `beige-300` | `#D7D2CB` | Borders, dividers, table headers, disabled fills |
| Secondary 35 % | Trust — petrol blue | `petrol-800` | `#00415B` | Primary buttons, links, selected items, focus ring on light |
| Secondary 35 % | Light — yellow | `yellow-300` | `#FBD564` | Tiny emphasis only: active-nav rule, notification dot, focus ring on dark. **≤ 5 %** |

### Derived shades (needed for accessible text and states)
The brand colors alone fail contrast in some roles (green or orange as text on cream, no red for errors). These shades are derived from the brand hues; they are **proposed and need the design owner's approval**:

| Token | HEX | Use | Contrast on cream |
|---|---|---|---|
| `orange-700` | `#9C4A18` | Orange text and filled-button text background | 6.0 |
| `green-800` | `#245A39` | Success text | 7.9 |
| `neutral-50` | `#F4F5F7` | Dashboard page background, soft fills (soft button, badges, table header) | — |
| `neutral-200` | `#E4E7EB` | Panel and divider borders | — |
| `neutral-500` | `#8B939C` | Hover border of inputs, control borders where 3:1 is required (3.1:1 on white) | — |
| `neutral-700` | `#5F6770` | Hover border, muted icons (5.7:1 on white) | — |
| `muted` | `#5B6671` | Secondary text (5.9:1 on white, 5.4:1 on `neutral-50`) | — |
| `white` | `#FFFFFF` | Panel, card, dialog and top-bar surface on the `beige-100` page (neutral, derived) | — |
| `danger-700` | `#B3261E` | Errors, destructive actions (**no red exists in the brand palette**) | 6.4 |
| Tints `*-50` | green `#E6F2EA`, orange `#FBEBDD`, petrol `#E0EBF0`, yellow `#FEF4D4`, danger `#FBE7E5`, beige `#F1EEE9` | Status backgrounds, hover rows | ink on them ≥ 13.8 |

### Contrast (measured, WCAG)
| Text on background | Ratio | OK for |
|---|---|---|
| `ink` on `cream` | 16.3 | All text |
| `petrol-800` on `cream` | 10.7 | All text, links |
| `cream` on `ink` / `petrol-800` | 16.3 / 10.7 | Text on dark panels and buttons |
| `ink` on `green-400` | 7.5 | Text on green fills |
| `ink` / `petrol-800` on `yellow-300` | 11.8 / 7.8 | Text on yellow |
| `orange-500` on `cream` | 4.0 | **Large text (≥ 24 px, or ≥ 18.66 px bold) and graphics only** |
| `cream` or `ink` on `orange-500` | 4.0 / 4.1 | Large text only; use `orange-700` for normal-size button text |
| `green-400` on `cream` | 2.2 | **Never as text.** Fills, icons next to text, charts only |
| `yellow-300` on `cream` | 1.4 | **Never as text or as the only boundary.** Decoration only |
| `beige-300` on `cream` / `white` | 1.5 | Decorative dividers only; never a control border (3:1 needed) |
| `neutral-500` on `white` | 3.1 | Input and select borders |
| `muted` on `white` / `neutral-50` | 5.9 / 5.4 | Secondary text, placeholders, table header |
| `cream/85` and `beige-300/80` on `ink` | 12.0 / 7.5 | Sidebar links and section label |

### Role mapping
- **Dashboard surfaces (cool neutrals, matching the approved screens):** page `neutral-50`, `ink` text; panels, cards, dialogs and the top bar `white` with `neutral-200` border; table header `neutral-50`; inputs white with a light `neutral-200` border (as in the approved screens), `petrol-800` border and halo on focus (focus and label carry the affordance). Brand `cream` and `beige` stay for the sign-in card tone, emails and printed material.
- **Shell:** page `neutral-50`. Sidebar: `ink`, floating panel inset 16 px from the screen edges, **rounded on all four corners (24 px)**, sticky and full height; white logo (`BrandLogo tone="white"`) followed by a round collapse button; section label; top-level links (Home) and **menus with sub-menus** (People: employees, organization, companies; System administration: roles, page visibility, audit log, e-mail log; Tickets). **"My account" is not in the sidebar:** the name in the top bar opens a dropdown (`AccountMenu`, Radix DropdownMenu) with the e-mail, the `group: 'account'` pages (profile, notifications, security) and sign-out. A menu is a button with a chevron (`aria-expanded`); the menu holding the current page opens by itself; sub-links are indented under a thin rule. Active link = white pill with `ink` text; hover `cream/10`. Collapsed (desktop): icons only, menus flattened, arrow centered. Phone: drawer with sign-out at the bottom. Features declare `nav: [{ …, group: 'people' | 'administration' | 'account' }]`; no group = top-level link. Top bar: floating rounded white bar with the account dropdown (avatar initial, name, role, chevron), admin-mode switch, notifications, theme, language button and sign-out. Pages an administrator hid from the person's roles (`NavItem.pageKey`, `me.hiddenPages`) are left out of the menu and show the 403 page.
- **Buttons:** primary = `ink` bg + `cream` text (hover `ink-800`); secondary = cream bg, `petrol-800` border and text; danger = `danger-700` bg + cream text; ghost = `petrol-800` text. Orange fills are reserved for a single highlight action and need `orange-700` for normal-size text.
- **Status / messages (`Alert`, toasts, `Badge`):** four colors, one source `shared/ui/message-tones.ts`: **information = blue** (`petrol-50` bg, `petrol-800` rule, dark text, `text-link` icon); **warning = yellow** (`yellow-50` bg, `yellow-300` rule, dark text; yellow is never text); **error = red** (`danger-50` bg, `danger-700` rule, dark text, `text-danger-text` icon); **success = green** (`green-50` bg, `green-400` rule, dark text, `text-success` icon). Every message has an icon and a 4 px start rule (never color alone). Alerts use `<Alert tone>`; toasts (`sonner`, styled in `app/providers.tsx` from the same tones) use `toast.success / info / warning / error`; badges use `tone` info / warning / danger / success / neutral. No other color may mean a message (orange is not a message color).
- **Focus ring:** 2 px `petrol-800` on light surfaces, `yellow-300` on dark surfaces, offset 2 px.
- **Charts:** petrol, green, orange, beige in that order; yellow only for one highlighted value.
- **Sign-in:** full `ink` screen with a centered `cream` card holding the horizontal color logo, language button on top, copyright at the bottom, and quiet petrol/green decoration (no yellow).
- **Proportion check:** most of the screen is cream, ink and green/petrol; orange appears in a few places; yellow is a thin accent. If yellow is visible in more than ~5 % of the viewport, remove it.

## Logo
Delivered set (8 PNGs + the zip) is in `docs/brand/` (`PNG.zip`, `originals/`). Web copies, with clean names, are in `apps/web/public/brand/` and served at `/brand/<file>`. **Always use the `BrandLogo` component** (`shared/ui`: `tone`, `layout`, `width`, `decorative`); never a raw `<img>` or a hard-coded path.

| `tone` | `layout` | File (`/brand/…`) | Delivered as | Use on |
|---|---|---|---|---|
| `color` | `horizontal` | `logo-color-horizontal.png` | main dark-horizontal | Light backgrounds (cream, beige, white): top bar on mobile, sign-in form on mobile, emails, documents |
| `color` | `vertical` | `logo-color-vertical.png` | main dark-vertical | Light backgrounds, stacked spaces: empty states, cover pages |
| `on-dark` | `horizontal` | `logo-color-on-dark-horizontal.png` | main light-horizontal | **`ink` only**: sidebar header |
| `on-dark` | `vertical` | `logo-color-on-dark-vertical.png` | main light-vertical | **`ink` only**: sign-in side panel |
| `ink` | `horizontal` / `vertical` | `logo-ink-*.png` | dark blue-* | One-color uses on light backgrounds: print, PDF payslips, stamps, watermarks |
| `white` | `horizontal` / `vertical` | `logo-white-*.png` | waite-* (sic) | Dark or saturated backgrounds where full color is not allowed: `petrol-800`, `ink` in one-color contexts |
| any | `mark` | `mark-color.png`, `mark-ink.png`, `mark-white.png` | cropped by us from the horizontal files | Below the minimum logo width, avatars, loading, favicon sources |

Also in `/brand/`: `favicon-32.png`, `favicon-192.png`, `favicon-512.png` (transparent, color mark) and `apple-touch-icon.png` (180 px on cream), wired in `index.html`.

Rules (checked on real renders):
- **Never place a full-color logo (`on-dark`) on `petrol-800`, green, orange or yellow.** On petrol the petrol quarter of the mark disappears and the logo looks broken. Use `white` there.
- Never place `color` or `ink` logos on `ink`, `petrol-800` or any saturated color. Light backgrounds only.
- Do not recolor, stretch, rotate, outline, add shadows, or redraw the mark in CSS/SVG.
- Clear space: at least 25 % of the mark's width on every side. Minimum width: horizontal 120 px, vertical 72 px; below that use `mark`.
- The logo already contains all four secondary colors; keep the surroundings calm (no extra decoration next to it, no arch pattern).
- The logo image is not translated; its `alt` is (`brand.logoAlt`). Use `decorative` when the brand name is already visible or the area is `aria-hidden`.
- Currently in use: sign-in side panel (`on-dark` vertical, decorative), sign-in form on mobile (`color` horizontal), sidebar (`on-dark` horizontal, decorative), top bar on mobile (`color` horizontal).

## Typography
- **One brand typeface: Tajawal**, for Arabic and Latin, headings and body. Delivered files are in `docs/brand/fonts/` (Light, Regular, Medium, Bold, ExtraBold, Black) and `fonts.zip`; the app self-hosts Regular 400, Medium 500 and Bold 700 from `apps/web/src/assets/fonts/` through `@font-face` in `theme.css`. Do not add another family or load fonts from a CDN. If a design needs Light (300) or ExtraBold (800), add that `@font-face` from the delivered file.
- Headings `font-heading` (Bold 700); labels and emphasis Medium 500; body Regular 400.
- Page title `text-3xl font-bold`; section title `text-lg font-bold`; body `text-base`; helper `text-sm text-muted`. Body line length ≤ 65ch.
- Numbers, emails, IDs and codes display LTR inside RTL text (`dir="ltr"`, `font-latin`).

## Layout and RTL
- Use logical properties only: `ms-/me-/ps-/pe-/start-/end-`, `text-start`, never `ml/mr/left/right`.
- Directional icons (arrows, chevrons) flip in RTL (`rtl:-scale-x-100`); symbols (check, plus, search) do not.
- Shell: floating rounded sidebar on the inline-start side (right in Arabic) and floating rounded top bar, see Role mapping. Content max width 1280 px, 16 px gutter on mobile, 32 px from `sm`.
- Radius: **every edge is rounded, none square**: controls 12 px (`--radius-control`, inputs `rounded-xl`), panels, tables, dialogs and the sidebar 24 px (`rounded-3xl`), cards 16 px, chips and pills fully round. Panels never touch the screen edge: keep a margin around them. Borders `neutral-200`, soft shadows only.
- Mobile (< `sm`): sidebar becomes a drawer with its own sign-out; the top bar keeps menu, logo, icon-only language button, bell and avatar; `DataTable` renders one card per row (label + value, actions at the bottom); filters stack full width; tap targets ≥ 44 px; forms are a single column.

## Components (`shared/ui`)
`Button` (primary/secondary/danger/ghost/soft/tint; sizes md/sm/icon) · `Alert` · `Badge` · `DataTable` (always pass `error`) · `Dialog` (Radix) · `FormField` (label, hint, error) · `PageHeader` · `SearchInput` · `ListToolbar` (+ `FilterField`) · `ExchangeButtons` / `ExportDialog` / `ImportDialog` (`shared/data-exchange`). Planned for the employees phase: `Combobox` (select with search), `TreeView`, `DateField`, `PhoneField`, `SectionCard`, `StatTile`, `EmptyState`, `ConfirmDialog`.
- One primary button per view. Destructive actions use `danger` and a `ConfirmDialog`; irreversible bulk actions require typing the count.
- **Validation talks while the person works:** every field shows its error as soon as they type in it or leave it (never only after pressing save, and never on a field nobody touched). Use `useLiveError` + `useRules` from `shared/lib/live-validation` (react-hook-form forms use `mode: 'all'`); put inputs in their own component so "touched" starts fresh each time a dialog opens; the same rule function feeds the error text and the save button.
- **Permission matrix:** `PermissionMatrix` (features/roles) is the one component that shows the catalog with scope selects and select-all / clear-all; roles, groups and people all use it.
- **Permissions on the screen:** a page needs its view key (`nav.permission`); every button is wrapped in `<Can permission={key}>` (or checks `usePermissions().can`); `ExchangeButtons` takes `permissions={{ export, import }}`. A new button without its key is a bug.
- **Lists:** give `DataTable` and `ListToolbar` the list's `listKey` (from `LIST_CATALOG`) so an administrator can hide its columns and filters; a new list adds its columns and filters to the catalog and to the `listSettings` i18n. The first column is the row's name and must stay.
- `SectionCard` takes an `action` (a button beside the title): use it for the section's main action, e.g. "Add type" in ticket setup. Settings that belong to one record are split into sections by topic (reception, durations) and saved together.
- Forms: label above field, `*` for required plus `aria-required`, error text under the field (not color only), hint under the label, sections in `SectionCard`, sticky save bar. Hidden conditional fields are cleared.
- Selects with more than ~8 options use `Combobox` with search.

## Tasks (table, Kanban board, matrix, home numbers)
- **Add and edit in a popup:** a new task and a task's edit are wide `Dialog`s (`wide`) over the list or the details page, never pages of their own; `/tasks?new=1` opens the list with the new-task popup open.
- **One list, two views:** my tasks and my team switch between a table and a Kanban board (`ViewSwitch`, remembered per list in the browser); the same filters, search and order feed both. A table header with `sortKey` (and `sort` / `onSort` on `DataTable`) is a button with `aria-sort`; the other lists keep plain headers.
- **Marks with words:** urgent and overdue = `danger` badge, stale = neutral, objected to = `warning`, never colour alone (`task-badges.tsx`); statuses use the four message tones (pending approval and in progress info, awaiting review warning, done success, rejected danger).
- **Board:** a white 24 px panel; each status is a `neutral-50` rounded column of fixed width (`w-72`) so on a phone the board scrolls sideways; a card is `rounded-2xl` with the assignee's avatar (`petrol-800` + `cream`), title, due date, priority, tag and marks. A card moves by its **handle** (dnd-kit, so the title link and a phone's scroll still work) or by its "move to" menu (keyboard, phone); a card waiting for approval or rejected has neither. The API decides every move; a refusal puts the card back and says why; a note or the real completion date is asked in a dialog when the API says so.
- **Swimlanes:** the team tab of my tasks may draw one row per person (`BoardLane` with a label). My team is a tab of my tasks, and the matrix (four squares) is a section of the home page, not pages of their own.
- **Home numbers:** `StatTile` wrapped in a `Link` that opens the list it counts; "attention" (yellow tint) only for what needs action; the split of open tasks by status is `ProgressSplit` (an SVG bar whose parts have `fill-*` tokens, with a legend of names and counts).

- **Task conversation (FR-66):** a section «Comments» (`<h2>`) on the task page and a page of its own, `/tasks/:id/conversation` (what a colleague of the category or a mentioned person opens: they see the title and the conversation only). A comment is a white `rounded-2xl` card: avatar initial (`petrol-800` + `cream`), name, «replying to …», «edited», time, and its actions as `RowAction` icons (reply, edit, delete with a `ConfirmDialog`), never words. Answers sit under their comment, indented with a `border-s-2` rule (one level only). A deleted comment keeps its place with the italic muted line «This comment was deleted». The box is `MentionTextarea` (a plain `Textarea` in which `@` opens a `role="listbox"` of people: arrows, Enter/Tab, Escape, or a click) and `FileAttachments`; Ctrl+Enter sends. Mentions show as `bg-petrol-50 text-link` chips. No box is explained, never hidden silently (closed, read-only, outside the task: `Alert tone="info"` or a muted line). The matrix of who may do what is a section of the Task policies page: a table, a row per relation to the task and a column per action, a `size-5 accent-petrol-800` checkbox per cell named «relation · action», read-only without the edit key.

## Organization chart and table
- **Org page:** company select + a chart / icicle / table switch (`ViewSwitch`, remembered, phones start with the table), then either view, with the selected unit's details beside it (closable).
- **Chart (`TreeChart`, `shared/ui`):** root card = the company in `ink`; one **brand color per level** in this order: sector `petrol` (petrol-50 card, petrol badge), department `green`, section `orange`, unit `neutral` (white card, ink badge), then it starts again; each card shows a text badge with the level name, the unit name and its counts, so color never carries the meaning alone; a legend of the level colors sits above the chart. Controls (top start corner): Open all, Close all, fit to screen, zoom in / out with the percentage. **Open all and Close all re-fit the chart to the box.** Search opens the nodes above a match and rings it in yellow. Drag to pan. Lines are `neutral-500` 2 px, joined with rounded corners.
- **Icicle (`Icicle`, `shared/ui`; layout in `shared/lib/partition-layout`, open / close state in `shared/lib/use-open-nodes` shared with `TreeChart`):** horizontal, drawn as SVG with the same items and level colors: the root is a block on the start side (`ink`; on the end side in Arabic so the tree grows toward the reading direction's end), each level a column (250 units wide), each unit a block beside its parent as tall as the leaves below it (a leaf is 60 units, so a name and a second line — level and counts — always fit and are written whole); everything is open at the start and the picture has its natural size, scrolling in its box. A round +/− button on the side facing the children opens and closes any block; Open all / Close all, fit (largest zoom that fits the width), zoom in / out; search opens the way to its matches and outlines them in yellow; a click or Enter on a block selects it. Colors through SVG `fill-*` / `stroke-*` classes, label colors per tone for contrast, no inline styles.
- **Table:** the same units in tree order (indented by depth), columns unit, level, manager, employees, job titles, status; search, filters on every attribute, export.

## Error pages (401, 403, 404)
One `ErrorPage` (`shared/ui`) for all three: white panel, the heading (what happened), one line of what to do, then the buttons, with the picture on the end side (`ErrorIllustration`: the digits of the code in `petrol-800`, the middle digit an `ink` badge with a magnifier, padlock or key, soft `neutral` gears and two `green-400` dots; brand colors only, no raster file). 404 and 403 offer «Back» (primary) and «Home»; 401 offers «Sign in». 404 and 403 render inside the app shell; 401 is a full-screen route (`/401`). Texts are in `errorPage.*`.

## Light and dark theme
- Every screen of the dashboard has both. **Never use a fixed text or surface color in a component**: text is `text-fg`, links and selected items `text-link` / `border-link`, the primary action `bg-primary text-on-primary hover:bg-primary-hover`, status text `text-success` / `text-danger-text` (a warning is a yellow tint with dark text); surfaces are `bg-white` (panels), `bg-neutral-50` (page, soft fills), borders `neutral-200`, control borders `neutral-500`, tints `*-50`. `theme.css` re-points these under `html[data-theme=dark]`. Fixed colors are only for things that are the same in both themes: the sidebar and sign-in screen (`ink`, `cream`), the avatar (`petrol-800` + `cream`), solid badges and the chart root (`ink`), `bg-danger-700 text-cream` buttons.
- **Dark values (measured):** surface `#111F27`, page `#0A151B`, border `#243742`, control border `#6B7F8B` (4.0:1), text `#F4F1E6` (14.9:1), muted `#A4B3BB` (7.8:1), link `#8CC4DF` (8.9:1), success `#8FD3A8`, warning `#FFB784`, danger text `#FF9A92`, tints deep versions of their hue; the primary button inverts (cream with ink text); the focus ring is `yellow-300`.
- **Choice:** `ThemeToggle` (sun / moon) in the header, and light / dark / follow-the-device on the profile page; `ThemeProvider` (`core/theme`) applies `data-theme` and follows the device for "system"; `public/theme-init.js` applies it before first paint. Saved in the browser and on the account. Check **both** themes (screenshots and axe) for every UI change.

## Profile page
`/profile` (nav: account menu in the top bar): appearance (theme cards, language), contact details the person may edit (personal phone, personal e-mail, English name; validated with the shared schema, field errors in text), and the job details read-only (number, company, unit, title, manager, work e-mail, start date); a link to the security page. An account without an employee record sees only the appearance settings.

## Data exchange (export and import)
- **Export** is on every list (`ExchangeButtons` in the toolbar, after the filter button): a dialog with the scope (the rows on this page, or all results of the current search and filters), the columns (checkboxes with select all / none and a count), and the file type (Excel `.xlsx` or CSV with a byte-order mark). Files are built in the browser; texts that look like formulas are stored as plain text; at most 10,000 rows.
- **Import** is on lists whose data can be filled from a file (employees, companies): the dialog offers the **template** (Excel with the headers, required ones starred, a drop-down on every column that has options, and a «Lists» sheet that holds every option of the system), then the upload (xlsx or csv, ≤ 1,000 rows, ≤ 5 MB), a preview (valid rows and the rows with errors, each with its row number and message), the import with progress, and a result with a downloadable error report. Cells match options by Arabic name, English name or code.
- Add export columns beside the table columns (`ExportColumn`: header + text value); add import by writing `columns` (`ImportColumn`) and `prepare(rows)` that returns checked rows; never copy the dialogs.

## Page patterns
- **Sign-in (`AuthShell`):** centered `cream` card on the `ink` screen; Microsoft button first, then the work e-mail, then the 6-box code step. Generic error text. Language button on top.
- **Home:** greeting, stat tiles (permission-scoped), recent activity, shortcuts.
- **Rows:** the **Actions** column is always the last column and holds every action on the row (`DataTable` `actions`; on a card it sits at the bottom), **each as an icon** (`RowAction`: Eye = view, Pencil = edit, Trash2 = delete, Power / PowerOff = activate / deactivate, CheckCheck = mark read, ExternalLink = open) whose label is its tooltip and accessible name, never a word on the button; a click anywhere on a row, outside its buttons and links, opens the row's view (`onRowClick`: its page, its dialog, or a `DetailsDialog` for records without a page such as audit and e-mail log entries). Never an actions column of your own with `hideHeader`.
- **List (every table page):** `PageHeader` (breadcrumb + title + primary action) → one rounded `DataTable` panel whose top bar is `ListToolbar`: `SearchInput`, the **filter panel** (a `FilterField` per attribute: `select`, `text`, `date`, `toggle`; the button shows the count; applied filters appear as removable chips) and the **table / cards switch** (`useViewMode(key)`, remembered per list, phones start with cards) → rows → footer with rows-per-page, numbered pages and the result range. A list is not done until every filterable attribute has a filter. Server-side lists send the values as query params (`useFilters`), small lists filter in the browser (`matchesText`).
- **Platform admin mode (header):** a ghost shield button (icon only on phones) for those who may use it; on, it becomes a filled petrol pill "Admin mode on" (`aria-pressed`) and admin nav items (`requiresAdminMode`) appear; switching on opens a dialog with the six code boxes; it stops by itself after idle time with a notice.
- **Form page:** a sticky section menu on the start side (a small panel; the section being read is highlighted with the primary color and `aria-current="location"`, through `useActiveSection`), sections as cards, and a floating save bar styled like the header (`sticky bottom`, rounded, inside the content column, never under the sidebar).
- **Notification bell:** a Radix `Popover` panel (not a link): newest five, «mark all as read», «view all» link to the page; fetched only while open (FR-61). The same pattern fits any header icon that has a list behind it.
- **Message templates (e-mail, notification) — tabs of Settings:** the same list pattern (`ListToolbar`, table / cards, row icons edit and reset, status badge default / customised / waiting for approval). The edit `Dialog` (wide) has a language `Tabs` (Arabic / English), then the wording in `TemplateEditor` (TipTap: rich for an e-mail body with a small toolbar of icon buttons, plain paragraphs for a notification, one line for a title; typing `@` opens the list of the template's variables, inserted as petrol chips `@name`), the two `ColorField` rows for an e-mail (the seven brand colors as round swatches with a check on the chosen one, never other colors), the variables list with examples, and a live preview (the e-mail page in a sandboxed `iframe`). Buttons: save (or «Send for approval» while approval is on), send me a test, back to default (ConfirmDialog), and approve / reject for the approver (the author's approve button is disabled with a line saying why). The approval switch sits above the list, only for who holds the settings key.\n- **Provider settings (translation, e-mail):** one page «Settings» (`/service-settings`, `SettingsPage`) with a `Tabs` row (`shared/ui`, `?tab=translation|email`, a tab only for what the person may view; the old two addresses redirect); under the tabs `ProvidersPage` (features/integrations) drives both kinds: a description line, an info `Alert` when the server's own settings are in use, then the list of services (table / cards, search, status and in-use filters, export). A row shows the service, a status badge (incomplete = warning, not tested = info, tested = success) and an in-use badge; its actions are icons: guide (circle-help: popup `ProviderHelpDialog` with the steps to get the keys and the meaning of each value, text in `help.*`), edit, try (flask), switch on (power) only when tested, switch off (power-off). The form opens in a wide `Dialog` built from the shared catalog (secrets are password inputs that say «saved» and keep their value when left blank); a guidance `Alert` says what to do next (fill, save, try, switch on), and **«Switch on» stays disabled until the data is complete, saved and tried**. «Try» opens a second popup: translation = Arabic box and read-only English box (live, after a 700 ms pause) with the service's error in an `Alert` under them; e-mail = a «send to» address and the service's answer or error.
- **Tree + detail:** tree on the start side, details panel on the end side.

## Accessibility checklist
- Visible focus (2 px `petrol-800` ring on light, `yellow-300` on dark, offset 2 px). Never remove it.
- Targets ≥ 40 px (≥ 44 px on touch). Icon-only buttons have `aria-label`.
- Headings in order, one `h1` per page, landmarks (`header`, `nav`, `main`). Skip link first.
- Dialogs trap focus and restore it. Toasts (`sonner`) use `role="status"`; errors that need action stay inline.
- Respect `prefers-reduced-motion`; motion ≤ 150 ms.
- Run axe (Playwright) for each new page; `e2e/pages/base.page.ts` has `expectNoSeriousA11yIssues()`.

## Verification after every step (mandatory)
Every step that touches the web app ends with this review, and the result goes in the step report:
1. `npm run design:check` — no hex/rgb, no inline styles, no non-brand color classes, no physical `ml/mr/left/right` classes, no raw logo `<img>`, no extra font, palette reset and brand tokens present.
2. `npm run i18n:check` — all text translated and both languages complete.
3. Look at the real result: run the app and screenshot each new or changed screen in Arabic (RTL) and English (LTR), at desktop and phone width. Compare with this document (palette roles, yellow ≤ 5 %, logo rules, spacing, states).
4. Accessibility: axe (WCAG 2A/AA) on each new screen, keyboard path, focus ring visible, labels and error text present.
5. Reuse: no one-off markup where a `shared/ui` component exists; new reusable pieces were added to `shared/ui`.
Report what was checked and any deviation; fix deviations before calling the step done.

## Review checklist
- [ ] `npm run design:check` passes. Only token classes; no hex, no inline styles; green, orange (normal size) and yellow never as text on cream; yellow ≤ 5 % of the screen.
- [ ] Logical properties only; checked in Arabic and English.
- [ ] Loading, empty, error and no-permission states exist.
- [ ] All text through i18n (`npm run i18n:check`).
- [ ] Reuses `shared/ui`; new reusable pieces added there.
- [ ] Keyboard and screen-reader pass; axe clean; works at phone width.
