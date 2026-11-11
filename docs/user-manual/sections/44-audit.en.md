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

| Action | What happens | Permission key (label) |
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
