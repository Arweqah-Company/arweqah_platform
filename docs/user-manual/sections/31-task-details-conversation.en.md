## Task details and conversation

Click any task in the list to open its page. The page shows what the task is, who is involved, the buttons you may use at this moment, the task conversation, and the history of everything that happened to the task. The conversation holds comments, replies, files and mentions of colleagues with `@`.

### Who sees it

- **View permission:** `tasks.view` («View my tasks and task details»), scope own. You need to be related to the task: assignee, the person who gave it, approver, reviewer, follower, or a manager whose team includes the assignee.
- **The conversation** needs `tasks.comment_view` («Read the comments of a task»). The Employee role holds all the comment keys except «delete anybody's comment» and the comment rules.
- A task outside your reach is shown as «not found».
- A colleague who has an open task in the same category, or a person mentioned with `@`, sees only the task number, title and conversation, nothing else.

### What you can do

| Action | What happens | Permission |
|---|---|---|
| Edit | Changes title, details, due date, priority | `tasks.update` (Edit a task) |
| Move to | Changes the status, only to statuses allowed to you | `tasks.change_status` / `tasks.team_change_status` |
| Approve / Reject | Decides on a pending self task | `tasks.approve` / `tasks.reject` |
| Resubmit | Sends a rejected task back for approval | `tasks.resubmit` |
| Object | Objects to a task given to you | `tasks.object` |
| Answer the objection | Rejects it or gives the task to someone else | the person who gave the task |
| Log time | Records minutes worked on a day | `tasks.log_time` |
| Follow / Unfollow | Starts or stops notices about the task | `tasks.follow` |
| Restore | Brings an archived task back | `tasks.restore` |
| Write a comment | Adds a comment to the conversation | `tasks.comment_add` (Write a comment on a task) |
| Reply | Answers a comment | `tasks.comment_reply` (Reply to a comment on a task) |
| Attach files | Adds files to a comment | `tasks.comment_upload` (Attach files to a comment) |
| Mention with @ | Names a colleague | `tasks.comment_mention` (Mention a colleague with @ in a comment) |
| Edit my comment | Changes your own comment | `tasks.comment_edit` (Edit my comment) |
| Delete my comment | Removes your own comment | `tasks.comment_delete` (Delete my comment) |
| Delete anyone's comment | Removes someone else's comment | `tasks.comment_delete_any` (Delete anybody's comment) |

Only the buttons you may use are shown.

### How to

**Write a comment**

1. Open the task and go to the «Comments» section.
2. Write in the «Write a comment» box. Press `Ctrl+Enter` to send.
3. To mention a colleague type `@` and pick the name from the list.
4. To attach files, use the attach box under the text (up to 5 files per comment by default). Click **Send**.

**Reply to a comment**

1. Click the reply icon on the comment.
2. Write your answer under it and click **Send**. Replies go one level only: a reply is shown under the comment it answers.

**Edit or delete your comment**

1. Use the pencil or the bin icon on your comment.
2. For deletion, confirm. The text and files disappear for everyone, a line «This comment was deleted» stays, and the replies under it stay too.

**Log time or object**

1. Click **Log time**, enter the minutes and the working day, then confirm.
2. Or click **Object**, choose the reason, add an optional note and send.

### Fields (form inputs)

**Edit the task** (button **Edit**, `tasks.update`; status is never edited here, it only moves by the table of moves)

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Title | The name of the task. | Yes | 1 to 200 characters. |
| Details | The description. | No | Up to 5000 characters. |
| Due date | A new due date; it restarts the reminder. | Yes | A date; an edited task may keep an earlier date. |
| Priority | Importance (feeds the matrix). | No | Low, Medium, High. |
| Expected time (hours) | The estimate. | No | A number above 0, steps of 0.25 hour. |
| Urgent / «Mark as urgent» | Manual urgent mark. | No | On / Off. |
| Review / «Needs a review» | Turns the review step on or off. Turning it on needs somebody to review: the reviewer already named, else the person who gave the task, else the approver. | No | On / Off. |

The assignee, the tag and the repetition are not in this window. If two people save at the same time, the second is refused and must reload.

**Approve / Reject / Send again** (windows «Approve the task», «Reject the task», «Send the task again»)

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Note (optional) | A word to the owner about the decision; it is kept in the history for Approve and Reject (Send again does not keep a note). | No | Up to 5000 characters. |

**Object to the task** (button **Object**)

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Reason | Why the task should not stay with you. | Yes | Not my responsibility, Not enough time, Information is missing, Conflicting priorities. |
| Note (optional) | More explanation for the person who gave the task. | No | Up to 1000 characters. |

**Answer the objection** (button **Answer the objection**, only the person who gave the task)

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Your answer | «I keep the task with its assignee» (reject the objection) or «I accept the objection and give the task to someone else». | Yes | One of the two. |
| Give the task to | The new assignee, shown only when you accept; the person is told. | Yes, when accepting | Only people you may give a task to, and not the current assignee. |
| Note (optional) | An explanation of your answer. | No | Up to 1000 characters. |

**Log time** (button **Log time**, `tasks.log_time`)

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Minutes | The time you worked on the task that day. | Yes | A whole number from 1 to 1440. |
| Day worked | The day the work was done. | Yes | Today or earlier, not further back than the «Back-dating allowed» days of the task policies (7 by default). |

**Comment box** (section «Comments»)

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Write a comment | The text of the comment. `@` opens the list of colleagues you can mention; a mentioned person is notified and joins the conversation. Writing under «Reply» answers one comment. | Yes, unless a file is attached | Up to 5000 characters. `@` only when you hold `tasks.comment_mention`. |
| Attach files to the comment | Files that go with the comment (the attach box is for new comments and replies, not for edits). | No | Up to the «Most files in a comment» of the task policies (5 by default, at most 10). Images, PDF, Word and Excel; the real type is checked. |
| Edit your comment | The new text of your own comment. | Yes | Up to 5000 characters; within the edit time of the task policies (15 minutes by default). |

### Workflow

The task keeps the life described in the «My tasks» page (statuses and moves). This page is where each step is done and recorded.

**Steps on the details page**

1. Open the task. The banner tells its state: waiting for approval (with the approver's name), open objection (with the lapse date) or archived.
2. The buttons shown are only the ones the API allows now: **Approve** / **Reject** for the approver of a pending task; **Send again** for the owner of a rejected task; **Move to** for the assignee or a manager; **Object** and **Answer the objection**; **Log time**; **Edit**; **Follow**; **Restore** for an archived task.
3. Every step adds a line to the history: Created, Edited, Changed status, Approved, Rejected, Sent again, Objected, Objection answered, Objection lapsed, Archived, Restored, Handed over, Given to someone else, Time logged.
4. **The conversation:** a person with the keys and a relation that allows it writes a comment (with files and `@`), replies to a comment, and edits or deletes their own comment within the edit time. The people notified are listed under Business rules.
5. When the task is closed and archived, the conversation becomes read-only; the company may also close it some days after the task is done.

| Status | Meaning | Who can move it (permission key) | Moves to |
|---|---|---|---|
| Comment: written | A comment or a reply is in the conversation. | The writer: `tasks.comment_add` / `tasks.comment_reply`. | Edited, Deleted. |
| Comment: edited | The author changed the text; it shows «Edited». | The author: `tasks.comment_edit`, within the edit time. | Deleted. |
| Comment: deleted | The text and files are gone for everyone; a line «This comment was deleted» stays, and the replies stay. | The author: `tasks.comment_delete`; anybody's comment: `tasks.comment_delete_any`. | Final. |
| Conversation: open | Everyone with a relation that allows it can write. | — | Closed. |
| Conversation: closed | Read-only. Happens when the task is archived or when the days set in the task policies pass after the task is done. | The system. | — |

**Automatic things**

- **Notices:** the mentioned person (also by e-mail), the person you reply to, the assignee and the person who gave the task, and followers (once while an earlier notice is unread). Nobody is told of their own comment; e-mail never carries the text.
- **Status notices:** the person who gave the task and the followers are told of each status change; the reviewer when the task awaits review; the assignee when the work is sent back.
- **Time:** one notice when the logged time passes the estimate.
- **Audit:** comments are recorded in the audit log without their text; task steps are recorded with their history line.

**What each person sees:** the assignee, the person who gave the task, the approver, the reviewer, a follower and a manager of the assignee see the whole page. A colleague with an open task in the same tag, and a person mentioned with `@`, see only the number, title and conversation.

### Business rules

- The page shows: status, priority and marks (urgent, overdue, stale, objected), who gave the task, the reviewer, the approver, logged time against the estimate, repetition, followers, and the history of events (created, edited, status changed, approved, rejected, resubmitted, objection, archived, restored, ownership moved, time logged). (FR-48)
- A banner appears for an archived task, for an open objection (with the date it lapses), and for a task waiting for approval (with the approver's name).
- **Who may do what in the conversation** is decided by two things together: your role must hold the key of the action, **and** your relation to the task must be switched on for that action in the company's table («Who does what in task comments», see the Task policies section). You may have several relations at once; one is enough. (FR-66)
- By default the parties of the task (assignee, the person who gave it, approver, reviewer, follower, manager) may do every action. A colleague of the same category and a mentioned person may only read, write and reply.
- Only active employees of the company can be mentioned. A mentioned person joins the conversation as «mentioned»; this does not make them a follower and does not open the task to them.
- You may edit or delete **your own** comment for 15 minutes after writing it (the number is in the task policies). An edited comment shows «Edited». Deleting someone else's comment needs its own key.
- A comment needs text or at least one file. Text is limited to 5000 characters.
- The conversation stays open after the task is done. When the task is archived it is read-only, and the company may close it some days after the task is closed (0 = never). The page then says «The conversation of this task is closed: you can only read».
- **Notices:** the mentioned person (also by e-mail), the person you reply to, the assignee and the person who gave the task, and followers (once, while an earlier notice is unread). Nobody is notified of their own comment. E-mail never carries the text of a comment.
- File previews open for images and PDF only; other files download. Word and Excel files are accepted; the system checks the real file type, not just the name.
- The conversation has no list, so it has no export. Comments are recorded in the audit log without their text. (FR-66)

### Tips / common problems

- You can read but cannot write: your role lacks the key, or your relation to the task is switched off for writing. Ask an administrator.
- The edit icon disappeared: the edit time passed.
- You see only the title and the conversation: you are a same-category colleague or were mentioned.
