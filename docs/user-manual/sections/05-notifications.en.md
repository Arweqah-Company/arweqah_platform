## Notifications

The platform alerts you to what concerns you: a reply to your ticket, a task assigned to you, a mention of your name in a conversation, or something waiting for your approval. Notifications reach you from the **bell** in the top bar, and all of them are together on the **Notifications page**.

![Notifications](../images/en/13-notifications.png)

### Who sees it

- View key: `notifications.view` («View the notifications page and the bell»), scope «all» because notifications are yours alone.
- Held by everyone with the **Employee** role, by unit heads, and by the collaborator base. It does not need platform admin mode.
- Nobody sees another person's notifications.

### What you can do

| Action | What happens | Permission |
|---|---|---|
| Press the bell | A list opens with the **latest five notifications** and a «View all notifications» link | `notifications.view` (View the notifications page and the bell) |
| Click a notification in the bell or on the page | Opens the related page and marks it as read | `notifications.view` |
| «Mark all as read» (in the bell and on the page) | All your notifications become read | `notifications.mark_read` (Mark notifications as read) |
| The «Mark as read» icon on a row | Only this notification is marked | `notifications.mark_read` |
| The «Open» icon on a row | Opens the page linked to the notification | `notifications.view` |
| Search the title or text | Narrows the list | `notifications.view` |
| Filters: State (Unread / Read), From date, To date | Narrow the list | `notifications.view` |
| «Export» | Exports your notifications to Excel or CSV (scope and columns) | `notifications.export` (Export notifications) |

### How to

**Read your notifications**


1. Look at the bell: the yellow number on it is the count of unread ones («99+» if more).
2. Press the bell, then press a notification to go straight to the task or ticket it is about.
3. For older ones press «View all notifications».

**Find an old notification**


1. Open the «Notifications» page.
2. Type a word in the search box, or choose «Unread», or set dates.
3. Open the notification by clicking its row.

**Export your notifications**


1. On the page press «Export».
2. Choose the scope (the rows shown or all results), the columns (Title, Text, Time, State) and the file type.
3. Press «Export».

### Fields (form inputs)

The page has no form to save; it has a search box, filters and the export window. No field here changes a notification.

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Search the title or text | Finds notifications by a word in their title or body | No | Free text |
| State | Shows only unread or only read notifications | No | Unread, Read (empty = both) |
| From date | Shows notifications from this day on | No | A date |
| To date | Shows notifications up to this day | No | A date, not meant to be before «From date» |
| Scope (in the «Export data» window) | How many rows go into the file | Yes | «The rows shown on this page (N)» or «All results of the current search and filters (N)»; a single export holds a limited number of rows and the window says when it caps |
| Columns | Which columns to put in the file | Yes, at least one | «Select all» / «Clear selection»; the window shows «N of M columns» |
| File type | The format of the file | Yes | Excel (.xlsx) or CSV (.csv) |

Export columns offered: Title, Text, Time, State. Export needs `notifications.export` («Export notifications»).

### Workflow

**How a notification reaches you**

1. **Someone or something does an action** that concerns you: a task is assigned to you, your ticket gets a reply, your name is mentioned with `@`, a confirmation or approval is asked of you, or a «sign in as» session in your name ends.
2. **The platform** saves your notification in the same step as the action itself, so a notification is never lost if the action succeeded. It appears in the bell and on this page at once.
3. **If the notice also goes by e-mail,** the platform puts the e-mail in a waiting queue in the same step; a background process takes it out within about a second and sends it. The e-mail is written in your language and never carries the text of a comment or conversation.
4. **The sent e-mail is recorded** in the e-mail log (status Pending, then Sent or Failed), which the system administrator can read.
5. **You** see the yellow number on the bell, press the bell or open the page, and press the notification: it opens its page and is marked read.

| Status | Meaning | Who can change it (permission key) | Moves to |
|---|---|---|---|
| Unread | New; shown in heavier type and counted on the bell | You, by opening it, with «Mark as read» or «Mark all as read» (`notifications.mark_read`, «Mark notifications as read») | Read |
| Read | You have seen it; shown in a lighter color | Nobody changes it back | Stays read |

**Automatic things**

- The in-app notification is created at once; the e-mail copy is sent in the background by a queue, and each queued message is processed only once even if the process repeats.
- Some repeated reminders are not repeated while an earlier one with the same link is still unread.
- Nothing is deleted by you; there is no delete button.

**What each person sees:** only your own notifications; nobody, not even an administrator, sees another person's.

### Business rules

- In-app notifications reach you at once, and some also reach you **by e-mail** in the background. The e-mail never carries the text of comments and conversations. (FR-08)
- An unread notification shows in heavier type, and a read one in a lighter color.
- Clicking a notification that has a link marks it read automatically and opens the link. A notification with no link opens nothing.
- You are notified when a task is assigned to you, when your ticket gets a reply, when your name is mentioned with `@` in a conversation, when a confirmation or approval is asked of you, and when someone who signed in as you (a system administrator) finishes their session.
- What you lack the key for does not show: a person without `notifications.mark_read` does not see the mark-as-read buttons.

### Tips

- You do not see the bell or the page? You do not hold `notifications.view`, or the page is hidden from your role.
- You got an e-mail but see no notification? Open the page and clear the filters; it may be filtered on «Unread».
