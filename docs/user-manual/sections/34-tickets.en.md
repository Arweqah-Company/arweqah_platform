## Tickets

A ticket is the official way to ask another department for something: you choose the department and the kind of request, write what you need, and follow the replies until the ticket is closed. Each ticket has a number such as TKT-000123. The list can be shown as a table, as cards, or as a board with one column per status.

![Tickets](../images/en/08-tickets.png)

### Who sees it

- **View permission:** `tickets.view` («View the tickets page and ticket details»). Default scope: own, meaning the tickets you sent or that are handled by you.
- **Default roles:** the Employee role holds view (own), send a ticket, reply (own), ask to close, confirm or reject closing, close without execution, reopen, and the reply and mention keys. The head role of each unit holds view and reply at «unit and below».
- No platform admin mode is needed.
- A ticket outside your relation or scope is shown as «not found». Attachments can be downloaded only by people who may see the ticket.

### What you can do

| Action | What happens | Permission key (label) |
|---|---|---|
| New ticket | Opens the two-step popup to send a ticket | `tickets.create` (Send a new ticket) |
| Open a ticket | Click the row, or the eye icon, to open its page | `tickets.view` |
| Reply | Writes an answer with files and mentions | `tickets.reply` (Reply to and handle tickets) |
| Answer a reply | Replies to one reply, one level only | `tickets.comment_reply` (Answer a reply inside a ticket) |
| Mention with @ | Names a colleague in a reply | `tickets.comment_mention` (Mention a colleague with @ in a ticket reply) |
| Ask to close | The department asks the sender to confirm execution | `tickets.request_close` (Ask to close a ticket) |
| Confirm execution | The sender confirms and the ticket is closed | `tickets.confirm_close` (Approve the closing of a ticket) |
| Not yet executed | The sender rejects the closing; the ticket returns to the department | `tickets.decline_close` (Reject the closing of a ticket) |
| Close without execution | The department closes it, explaining why | `tickets.close_without_execution` (Close a ticket without executing it) |
| Reopen | The sender reopens a closed ticket within the allowed days | `tickets.reopen` (Reopen a closed ticket) |
| Quick reply | On the board, a short reply from the card | `tickets.reply` |

The tickets list has no export or import button. Tickets are sent one by one from the popup, not from a file.

### How to

**Send a ticket**

1. Click **New ticket**.
2. Step 1: type in «What do you need?», or narrow by department and kind (regular or personal). Choose the view «By department» or «Compact list». Click the kind you want.
3. Step 2: write the title (required) and the details, choose the needed-by date, mark the ticket urgent if needed, and attach up to 5 files.
4. Press **Send** (or `Ctrl+Enter`). The message «The ticket was sent» appears and the ticket gets its number.

**Answer a ticket you handle**

1. Open the **Incoming to the unit** tab and click the ticket.
2. Write in «Your reply», attach files if needed, and click **Send reply**.
3. When the work is done, click **Ask to close** and add an optional message.

**Close a ticket you sent**

1. Open the ticket. If the department asked to close, you see **Confirm execution** and **Not yet executed**.
2. Click **Confirm execution** to close it, or **Not yet executed** to send it back open with your message.
3. If the ticket is closed and you still need it, click **Reopen** (the page shows how many days are left).

**Find tickets**

1. Use the search box (title, details or number) and the filters: department, type, assignee, status.
2. Group by assignee, status, department or type, and switch between table, board and cards.

### Business rules

- Tabs: **My tickets** (tickets I sent), **Incoming to the unit** (tickets assigned to me, or to my department if I manage it, or by my reply scope), **My team's tickets** (those of the people in my view scope). A tab appears only if you have something in it. (FR-38)
- Statuses: **Open**, **Awaiting close confirmation**, **Closed**. A closed ticket shows how it ended: by sender's confirmation, automatically, or without execution. Marks: urgent, overdue, stale, new (nobody answered yet), personal.
- A ticket cannot be edited after it is sent. The conversation continues with replies until closing.
- **Sending is refused** when the department's reception is paused or stopped, when it has not started yet, or when it has no manager. A department that is stopped is not offered at all. (FR-37)
- The needed-by date cannot be earlier than the department's minimum lead time; the form tells you the earliest date.
- **Life cycle:** (FR-39)

| Action | From | To | Who |
|---|---|---|---|
| Ask to close | Open | Awaiting close confirmation | the assignee or the department manager |
| Confirm execution | Awaiting confirmation | Closed (confirmed) | the sender |
| Not yet executed | Awaiting confirmation | Open | the sender |
| Sender replies | Awaiting confirmation | Open | the sender |
| Close without execution | Open or awaiting | Closed (not executed) | the department side |
| Automatic close | Awaiting confirmation | Closed (automatic) | the system, after the desk's days with no answer |
| Reopen | Closed | Open | the sender, within the reopen days |

- Default durations of a department: usual completion 3 working days, automatic close 4 days after the close request, reopen window 7 days, stale after 14 days. Each department can change them (see Ticket setup). Working days exclude Friday and Saturday. (FR-41)
- **Personal tickets** (complaints and personal matters) go straight to the person assigned to that type. They are hidden from the unit manager and from platform administrators; the figures count them but never list them. (FR-38)
- Replies: up to 5 files each, text up to 5000 characters, one level of answers to a reply. In a personal ticket only the sender and the assignee can be mentioned. Previews open for images and PDF; Word and Excel files are accepted.
- Notices (in the app, and by e-mail for important ones) carry only the ticket number and the department, never its text. The person you mention is told, and so is the person whose reply you answer. (FR-39)
- Two people changing a ticket at the same moment: the second action is refused and must be repeated.

### Tips / common problems

- You cannot find the department you want: it may be paused, stopped, not started, or without a manager.
- You see no «Incoming» tab: no tickets are assigned to you or your department.
- The «Reopen» button vanished: the reopen days are over; send a new ticket.
