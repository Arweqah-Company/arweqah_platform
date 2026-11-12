## Tickets

A ticket is the official way to ask another department for something: you choose the department and the kind of request, write what you need, and follow the replies until the ticket is closed. Each ticket has a number such as TKT-000123. The list can be shown as a table, as cards, or as a board with one column per status.

![Tickets](../images/en/08-tickets.png)

### Who sees it

- **View permission:** `tickets.view` («View the tickets page and ticket details»). Default scope: own, meaning the tickets you sent or that are handled by you.
- **Default roles:** the Employee role holds view (own), send a ticket, reply (own), ask to close, confirm or reject closing, close without execution, reopen, and the reply and mention keys. The head role of each unit holds view and reply at «unit and below».
- No platform admin mode is needed.
- A ticket outside your relation or scope is shown as «not found». Attachments can be downloaded only by people who may see the ticket.

### What you can do

| Action | What happens | Permission |
|---|---|---|
| New ticket | Opens the two-step popup to send a ticket | `tickets.create` (Send a new ticket) |
| Open a ticket | Click the row, or the eye icon, to open its page | `tickets.view` |
| Reply | Writes an answer with files and mentions | `tickets.reply` (Reply to and handle tickets) |
| Answer a reply | Replies to one reply, one level only | `tickets.comment_reply` (Answer a reply inside a ticket) |
| Mention with @ | Names a colleague in a reply | `tickets.comment_mention` (Mention a colleague with @ in a ticket reply) |
| Request closing | The unit side asks the sender to confirm it was done | `tickets.request_close` (Ask to close a ticket) |
| Confirm it was done | The sender confirms and the ticket is closed | `tickets.confirm_close` (Approve the closing of a ticket) |
| Not done yet | The sender rejects the closing; the ticket returns to the department | `tickets.decline_close` (Reject the closing of a ticket) |
| Close without carrying out | The department closes it, explaining why | `tickets.close_without_execution` (Close a ticket without executing it) |
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

1. Open the **Unit inbox** tab and click the ticket.
2. Write in «Your reply», attach files if needed, and click **Send reply**.
3. When the work is done, click **Request closing** and add an optional message.

**Close a ticket you sent**

1. Open the ticket. If the department asked to close, you see **Confirm it was done** and **Not done yet**.
2. Click **Confirm it was done** to close it, or **Not done yet** to send it back open with your message.
3. If the ticket is closed and you still need it, click **Reopen** (the page shows how many days are left).

**Find tickets**

1. Use the search box (title, details or number) and the filters: unit, type, assignee, status.
2. Group by assignee, status, unit or type, and switch between table, board and cards.

### Fields (form inputs)

**New ticket, step 1: choose what you need**

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| What do you need? | Search box over the types of every department. Type a few words («laptop», «certificate») and the matching types appear. | No | Free text; only narrows the list. |
| Department | Narrows the list to one department. The department decides who receives the ticket. | No | A department that receives tickets; «All units» shows all. Paused departments are shown disabled with the reason; stopped ones are not shown. |
| Kind of request | Regular requests or personal ones (complaints, private matters). | No | All kinds / Regular / Personal. |
| By department / Compact list | Only changes how the types are displayed. | No | Two views. |
| The type (click a card or row) | The kind of request. It fixes the department, the person who handles it (the type's assignee, otherwise the department manager), the usual duration, and whether the ticket is personal. | Yes | An active type of an available department. |

**New ticket, step 2: the ticket**

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Title | A short line the handler reads first and the list shows. | Yes | 1 to 200 characters. Message when empty: «Write a title for the ticket.» |
| Details | The full request: what you need, and everything the handler needs to act without asking again. | No | Up to 5000 characters. |
| When do you need it | The needed-by date. It drives the «Overdue» mark once it passes. | Yes | A date not earlier than today plus the department's minimum lead in working days; otherwise «The earliest date this unit accepts is …». It is pre-filled with today plus the type's usual time (or the department's) in working days. |
| Priority | Marks the ticket as «Urgent»; the mark shows in lists and on the board so the handler sees it first. | No | Switch: Normal (default) or On. |
| Ticket attachments | Files that support the request (drag them in or click to browse). | No | Up to 5 files; Word, Excel, images and PDF. The files must be your own uploads. |

Pressing **Change** at the top of step 2 returns to step 1 without losing what you typed. The sender and the department are never typed: they come from you and from the chosen type.

**Reply box (on the ticket page, and «Quick reply» on the board)**

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Your reply | The text of your answer; the other side is notified (by number and department only, never the text). | Yes | 1 to 5000 characters. Type `@` to mention a colleague (needs `tickets.comment_mention`): the person is notified, also by e-mail. |
| Mention (@) | Brings a colleague into the conversation. A mentioned person can read and answer, nothing more. | No | Active employees of the ticket's company. In a personal ticket only the sender and the assignee. |
| Answer this reply | Answers one earlier reply (needs `tickets.comment_reply`); the person you answer is notified. | No | One level only: an answer to an answer is filed under the first reply. |
| Ticket attachments | Files with the reply. | No | Up to 5 files. |

**Message box of the close actions (Request closing, Confirm it was done, Not done yet, Close without carrying out, Reopen)**

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Message (optional) | A note kept in the ticket history and sent with the action: what was done, why it was not done, why you reopen. | No | Up to 5000 characters. |

### Workflow

**What happens when someone raises a ticket**

1. **The sender** clicks **New ticket**, chooses the type, writes the title and details, picks the needed-by date, marks it urgent if needed, attaches files and presses **Send**. The system checks that the department is receiving (active, started, with a manager), that the date is not too early, and that the files are the sender's own.
2. The ticket gets its number (TKT-000123), status **Open**, and appears in the sender's «My tickets» tab. The history gets the entry «The ticket was sent».
3. **The handler is told** (in the app and by e-mail): the type's assignee, or the department manager when the type has no assignee. The notice carries only the number and the department. The ticket appears in the handler's «Unit inbox» tab with the mark «New» until somebody from the unit answers.
4. **The handler** (the assignee, the department manager, or someone whose reply scope reaches the department) opens the ticket and answers with **Send reply**. The first answer from the unit's side records the first response time. The sender is notified of each reply and answers in the same way (`tickets.reply`).
5. When the work is done the handler clicks **Request closing** and may add a message. The status becomes **Waiting for closing confirmation**, the sender is notified (also by e-mail), and the clock for automatic closing starts.
6. **The sender** chooses one:
   - **Confirm it was done**: the ticket closes («confirmed by the sender»).
   - **Not done yet**: the ticket returns to **Open** with the sender's message, and the unit is notified.
   - Writes a reply: the ticket also returns to **Open** and the closing request is cancelled.
   - Does nothing: after the department's automatic-close days the system closes it («automatically») and tells both sides.
7. If the unit cannot or will not carry out the request, the handler clicks **Close without carrying out** with the reason; the sender is notified.
8. **After closing** the sender may click **Reopen** during the department's reopen window (the page shows the days left). The ticket returns to **Open** and the unit is notified.

| Status | Meaning | Who can move it (permission key) | Moves to |
|---|---|---|---|
| Open | The ticket is with the unit, being handled | The unit side (assignee, department manager, or reply scope): `tickets.request_close`, `tickets.close_without_execution` | Waiting for closing confirmation; Closed (without being carried out) |
| Waiting for closing confirmation | The unit says it is done and waits for the sender | The sender: `tickets.confirm_close`, `tickets.decline_close`, or a reply. The unit side: `tickets.close_without_execution`. The system: automatic close | Closed (confirmed by the sender); Open; Closed (without being carried out); Closed (automatically) |
| Closed | Finished: «confirmed by the sender», «automatically» or «without being carried out». It takes no new replies | The sender: `tickets.reopen`, only inside the reopen window | Open |

Replying never changes the status by itself, except a sender's reply while the ticket waits for closing confirmation (it returns to Open).

**Automatic things**

- **Automatic closing:** a durable timer starts when closing is requested and ends after the department's automatic-close days (default 4, calendar days). It does nothing if the ticket moved on meanwhile, and it is cancelled by any other change.
- **Stale notice:** every morning at 06:00 (Riyadh time) the system tells the unit (assignee, and the manager unless the ticket is personal) about open tickets with no activity for the department's stale days (default 14), once per quiet period. The «Overdue» and «Stale» marks are computed on the screen from the needed-by date and the last activity.
- **Notifications:** sending (to the handler, with e-mail), replies, mentions (with e-mail), answers to a reply, closing request (to the sender, with e-mail), close without carrying out, reopening, decline of closing and automatic close (both sides, with e-mail). Confirming closes silently. Nobody is notified of their own action.
- **Audit:** every step is recorded in the audit log (sent, replied, close requested, declined, confirmed, auto-closed, closed without execution, reopened).
- **Concurrency:** if two people act on the same ticket at once, the second action is refused and must be repeated.

**What each person sees**

- **The sender** sees the tickets they sent in «My tickets», with the full conversation and the buttons that fit the status (reply, confirm, not done yet, reopen).
- **The handler** sees the tickets assigned to them, or those of the department they manage or whose reply scope they hold, in «Unit inbox».
- **The unit head** (with the head role at «unit and below») sees and answers the tickets of the unit and below, and the people's tickets in «My team». A personal ticket is seen only by its sender and its assignee, not by the head or by platform administrators merely because of that role (a head who is the sender or the assignee sees it as such).

### Business rules

- Tabs: **My tickets** (tickets I sent), **Unit inbox** (tickets assigned to me, or to my department if I manage it, or by my reply scope), **My team's tickets** (those of the people in my view scope). A tab appears only if you have something in it. (FR-38)
- Statuses: **Open**, **Waiting for closing confirmation**, **Closed**. A closed ticket shows how it ended: by sender's confirmation, automatically, or without execution. Marks: urgent, overdue, stale, new (nobody answered yet), personal.
- A ticket cannot be edited after it is sent. The conversation continues with replies until closing.
- **Sending is refused** when the department's reception is paused or stopped, when it has not started yet, or when it has no manager. A department that is stopped is not offered at all. (FR-37)
- The needed-by date cannot be earlier than the department's minimum lead time; the form tells you the earliest date.
- **Life cycle:** (FR-39)

| Action | From | To | Who |
|---|---|---|---|
| Request closing | Open | Waiting for closing confirmation | the unit side (assignee, department manager, or whoever handles the department by reply scope) |
| Confirm it was done | Waiting for confirmation | Closed (confirmed) | the sender |
| Not done yet | Waiting for confirmation | Open | the sender |
| Sender replies | Waiting for confirmation | Open | the sender |
| Close without carrying out | Open or waiting | Closed (not executed) | the unit side |
| Automatic close | Waiting for confirmation | Closed (automatic) | the system, after the desk's days with no answer |
| Reopen | Closed | Open | the sender, within the reopen days |

- Default durations of a department: usual completion 3 working days, automatic close 4 days after the close request, reopen window 7 days, stale after 14 days. Each department can change them (see Ticket setup). Working days exclude Friday and Saturday. Only the usual completion time and the earliest date are counted in working days; automatic close, the reopen window and the stale period are calendar days. (FR-41)
- **Personal tickets** (complaints and personal matters) go straight to the person assigned to that type. They are hidden from the unit manager and from platform administrators; the figures count them but never list them. (FR-38)
- Replies: up to 5 files each, text up to 5000 characters, one level of answers to a reply. In a personal ticket only the sender and the assignee can be mentioned. Previews open for images and PDF; Word and Excel files are accepted.
- Notices (in the app, and by e-mail for important ones) carry only the ticket number and the department, never its text. The person you mention is told, and so is the person whose reply you answer. (FR-39)
- Two people changing a ticket at the same moment: the second action is refused and must be repeated.

### Tips / common problems

- You cannot find the department you want: it may be paused, stopped, not started, or without a manager.
- You see no «Unit inbox» tab: no tickets are assigned to you or your department.
- The «Reopen» button vanished: the reopen days are over; send a new ticket.
