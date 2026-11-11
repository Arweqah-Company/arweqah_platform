## Sent e-mail log

### What this page is

It shows every e-mail the platform sent and its status: **Pending**, **Sent** or **Failed**, with the reason for a failure. Use it to know whether an activation invitation reached an employee, or why a notice did not arrive by e-mail. **The message text itself is not stored.**

### Who sees it

| Item | Detail |
|---|---|
| View key | `notifications.email_log` (View the sent e-mail log page) |
| Default scope | All |
| Platform admin mode | Required |
| Default roles that hold it | Only the built-in «System Admin» role; the «Employee» role and the unit head roles do not hold it |


### What you can do

| Action | What happens | Permission key (label) |
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
