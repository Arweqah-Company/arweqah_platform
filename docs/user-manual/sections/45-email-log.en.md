## Sent e-mail log

### What this page is

It shows every e-mail the platform sent and its status: **Pending**, **Sent** or **Failed**, with the reason for a failure. Use it to know whether an activation invitation reached an employee, or why a notice did not arrive by e-mail. **The message text itself is not stored.**

![Sent e-mail log](../images/en/30-email-log.png)

### Who sees it

| Item | Detail |
|---|---|
| View key | `notifications.email_log` (View the sent e-mail log page) |
| Default scope | All |
| Platform admin mode | Required |
| Default roles that hold it | Only the built-in «System Admin» role; the «Employee» role and the unit head roles do not hold it |


### What you can do

| Action | What happens | Permission |
|---|---|---|
| Open the page, search and filter | Shows the e-mails, newest first | `notifications.email_log` (View the sent e-mail log page) |
| «View» icon or click on a row | Opens the «Sent e-mail» window with the details of the message | `notifications.email_log` |
| Export button | Exports the log to a file after you choose the scope, columns and file type | `notifications.email_log_export` (Export the sent e-mail log) |

Table columns: when, to, subject, category, status, details (the failure reason or the server's reply). You can switch between table and cards.

The details window shows: when, sent at, to, subject, category, status, error, server response.

### How to

**See what was sent to a person**

1. Turn on «Platform admin mode» and open «E-mail log».
2. Type the person's e-mail in the «Person (e-mail)» filter.
3. Click the message you want to see its status.

**Look for failed e-mails**

1. Choose the status «Failed» in the filters.
2. Open the message and read «Error» and «Server response».
3. If failures repeat, check «Settings → E-mail» and try the service.

### Categories and statuses

| Categories | Statuses |
|---|---|
| Account activation invitations, Tickets, Tasks, General notices, E-mail settings test, Other | Pending, Sent, Failed |

### Fields (form inputs)

The e-mail log is read-only; its inputs are the search box, the filters and the export window.

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Search e-mails | Finds messages by subject or by the person's e-mail | No | Free text |
| Status | Where the message stands | No | Pending, Sent, Failed (empty = all statuses) |
| Category | Why the message was sent | No | Account activation invitations, Tickets, Tasks, General notices, E-mail settings test, Other (empty = all categories) |
| Person (e-mail) | Messages sent to one address | No | Part of an e-mail, up to 254 characters |
| From date | Messages from this day on | No | A date |
| To date | Messages up to this day | No | A date |
| Scope (in the «Export data» window) | How many rows go into the file | Yes | «The rows shown on this page (N)» or «All results of the current search and filters (N)»; a single export holds a limited number of rows and the window says when it caps |
| Columns | Which columns to put in the file | Yes, at least one | «Select all» / «Clear selection»; the window shows «N of M columns» |
| File type | The format of the file | Yes | Excel (.xlsx) or CSV (.csv) |

The «Sent e-mail» window (click a row) is read-only: when, sent at, to, subject, category, status, error and server response.

### Workflow

1. **An action sends a message:** HR sends an activation invitation, a task or ticket notice goes by e-mail, an administrator presses «Try» in the e-mail settings or «Send me a test» in the templates.
2. **The platform** records the message as **Pending** (recipient, subject, category) just before it hands it to the e-mail service that is switched on in Settings (or the server's own settings when none is on). The message body is never stored, because it can hold one-time links.
3. **If the service accepts it,** the entry becomes **Sent**, with the sending time and the server's reply. If the service refuses or cannot be reached, it becomes **Failed**, with the reason.
4. **The system administrator** (with `notifications.email_log`, in admin mode) filters by status, category or person and opens the entry to read the error and the server's reply.
5. **If it failed,** the administrator checks «Settings → E-mail» and tries the service; the page itself cannot resend or delete a message. To send again, repeat the action that caused it (for an activation invitation, HR resends it with `employees.resend_invite`).

| Status | Meaning | Who can change it (permission key) | Moves to |
|---|---|---|---|
| Pending | The message was recorded and is being handed to the service | Nobody; the platform changes it | Sent or Failed |
| Sent | The service accepted the message (not a proof that it was read) | Nobody | Final |
| Failed | The service refused it or could not be reached; the reason is shown | Nobody | Final |

**Automatic things:** the notices are sent in the background after the action that caused them, within about a second; every attempt is recorded; no message body is kept.

**What each person sees:** only people who hold `notifications.email_log` in admin mode see the page, and they see every e-mail the platform sent (scope «All»). An employee sees their own notices only through the bell.

### Business rules

- **Filters:** status, category, person (e-mail), from date, to date. **Search** by subject or the person's e-mail (FR-26, FR-63).
- **The message text is not stored** because it can hold one-time links; only the recipient, subject, status, failure reason and server reply are kept.
- **The category** is set by whoever sends the message: activation invitations, tickets, tasks, general notices. Test messages (from trying the e-mail service or «Send me a test» in the e-mail templates) are filed as «E-mail settings test». Old messages keep their old category.
- **Task and ticket notices** carry no sensitive text in the e-mail: only the task or ticket number and the department name.
- **The page is read only:** it does not resend or delete a message.
- Sending goes through the service switched on in «Settings → E-mail»; if none is on, the server's settings are used.

### Tips and common problems

- **«Pending» lasts long:** refresh after a moment; if it stays, check the e-mail service in Settings.
- **The message shows «Sent» but the employee did not get it:** it means the server accepted it; ask them to check their junk folder, and check their e-mail address on their record.
- **I cannot see the message text:** this is intended; it is not stored.
