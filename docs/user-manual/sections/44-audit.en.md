## Audit log

### What this page is

A record of every important event on the platform: who did what, when and from which address, as a plain sentence and a category (sign-in, employees, tasks…). Here you review every sign-in and every change to employees, the organization, permissions, tickets, tasks and settings. Values of fields named like a password, secret, token, national ID or IBAN are hidden in it.

![Audit log](../images/en/17-audit.png)

### Who sees it

| Item | Detail |
|---|---|
| View key | `audit.view` (View the audit log page) |
| Default scope | All |
| Platform admin mode | Required |
| Default roles that hold it | The built-in «System Admin» role. A «Platform auditor» role exists in the roles list and starts without permissions; an administrator gives it the keys it needs. The «Employee» role and the unit head roles do not hold it |

### What you can do

| Action | What happens | Permission |
|---|---|---|
| Open the page, search and filter | Shows the log, newest first, narrowed by what you type or choose | `audit.view` (View the audit log page) |
| «View» icon or click on a row | Opens the «Audit entry» window: time, actor, category, action, IP address and the changes | `audit.view` |
| Export button | Exports the log to a file after you choose the scope, columns and file type (columns: when, by, category, action, IP address) | `audit.export` (Export the audit log) |
| Integrity check of the log | The platform runs it by itself every week and records any problem; there is no button for it on this page | `audit.verify` (Check the audit log has not been tampered with) |

Table columns: when, by (or «System» for automatic events), category, action. You can switch between table and cards.

### How to

**Find what a person did**

1. Turn on «Platform admin mode» and open «Audit log».
2. In the filters type the person's name or e-mail in «Person (name or e-mail)».
3. Set «From date» and «To date» if you want a period.
4. Click any row to see its details.

**Find who changed a particular thing**

1. Choose the «Category» (for example «Roles and permissions»); the «Action» filter then narrows its list to that category's actions.
2. Choose the «Action», or type part of the sentence, or the id of the record, in the search box.

**Export the log**

1. Narrow what you want with the filters.
2. Press the export button and choose the scope (this page or all), the columns and the file type.

### Categories

Sign-in and security, Employees, Organization and companies, Roles and permissions, Tickets, Tasks, System settings, Other.

### Fields (form inputs)

The audit log is read-only; its inputs are the search box and the filters, plus the export window. Nothing typed here changes a record.

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Search the log | Finds entries by what was done (the sentence, in either language), by who did it, or by the id of the record | No | Free text |
| Category | One kind of event | No | Sign-in and security, Employees, Organization and companies, Roles and permissions, Tickets, Tasks, System settings, Other |
| Action | One sentence of the log, such as «Edited an employee» | No | Only the actions of the chosen category are offered; with no category, all actions |
| Person (name or e-mail) | Entries made by one person | No | Part of the name or e-mail, up to 100 characters |
| From date | Entries from this day on | No | A date |
| To date | Entries up to this day | No | A date |
| Scope (in the «Export data» window) | How many rows go into the file | Yes | «The rows shown on this page (N)» or «All results of the current search and filters (N)»; a single export holds a limited number of rows and the window says when it caps |
| Columns | Which columns to put in the file | Yes, at least one | «Select all» / «Clear selection»; the window shows «N of M columns» |
| File type | The format of the file | Yes | Excel (.xlsx) or CSV (.csv) |

Export columns offered: When, By, Category, Action, IP address. Export needs `audit.export`. The «Audit entry» window (click a row) is read-only: time, actor, category, action, IP address and the changes.

### Workflow

**How an entry is born**

1. **Someone or something acts** on the platform: a person signs in, edits an employee, changes a role, moves a task, saves a setting, or a background job runs.
2. **The platform** writes one entry in the same breath: who (or «System» for automatic events), what (a plain sentence and its category), the record concerned, the IP address and the changes. A field named like a password, secret, token, national ID or IBAN is stored as «[redacted]».
3. **The entry is chained** to the one before it with a digital fingerprint, and the database refuses to change or delete it.
4. **An auditor** with `audit.view` opens the page in admin mode, filters by category, action, person and dates, and opens an entry to read it. Nobody is notified by the page.
5. **Every Sunday at 04:00 (Riyadh)** the platform checks the whole chain; if it is broken at some entry, it logs an error and records that failure as an entry itself (`audit.verify` is the key for this check; there is no button).

Audit entries have no statuses: they are written once and never change. This is why there is no table of statuses.

**Automatic things:** entries are written by the platform itself on every important action, including the start and end of a «sign in as» session (each entry made during it carries the administrator's name beside the employee's); the integrity check runs weekly.

**What each person sees:** only people with `audit.view` in admin mode see the page, and they see the whole log (scope «All»). Nobody can edit or delete an entry, whatever role they hold.

### Business rules

- **Every action is a plain sentence** (for example «moved a task to another status») with a category, not a technical name (FR-63).
- **Filters:** category, action (only the sentences of the chosen category), person (name or e-mail), from date, to date. **Search** finds the sentence in either language, the actor's name and the id of the record concerned.
- **Some values are hidden:** before writing, a change whose field is named like a password, secret, token, national ID or IBAN is stored as «[redacted]». This is by the field's name and only at the top level of the change: a field with another name (for example an API key) or a sensitive value inside a nested field is not covered, so do not rely on the log being free of every sensitive value. Mostly the names of the fields that changed are recorded, not their values (FR-11).
- **Never edited or deleted:** each entry is chained to the previous one with a digital fingerprint, and the database refuses to change or delete it; the platform checks the chain weekly and records a failure if it breaks (FR-75).
- **Signing in as another employee:** every entry written during it carries the administrator's name beside the employee's, and the start and end of the session are recorded.
- **Time:** times show in your device's time zone.
- **Read only:** nothing on the page changes the log.

### Tips and common problems

- **I cannot find an event:** search with part of the sentence, widen the period, or clear the category.
- **The action I look for is not in the list:** choose the right category first; the list shows the actions of the chosen category.
- **I want to know who changed permissions:** filter by the «Roles and permissions» category and open the entry to see the actor, the time and the changes.
