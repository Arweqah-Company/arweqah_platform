## Task details and conversation

Click any task in the list to open its page. The page shows what the task is, who is involved, the buttons you may use at this moment, the task conversation, and the history of everything that happened to the task. The conversation holds comments, replies, files and mentions of colleagues with `@`.

### Who sees it

- **View permission:** `tasks.view` («View my tasks and task details»), scope own. You need to be related to the task: assignee, the person who gave it, approver, reviewer, follower, or a manager whose team includes the assignee.
- **The conversation** needs `tasks.comment_view` («Read the comments of a task»). The Employee role holds all the comment keys except «delete anybody's comment» and the comment rules.
- A task outside your reach is shown as «not found».
- A colleague who has an open task in the same category, or a person mentioned with `@`, sees only the task number, title and conversation, nothing else.

### What you can do

| Action | What happens | Permission key (label) |
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
