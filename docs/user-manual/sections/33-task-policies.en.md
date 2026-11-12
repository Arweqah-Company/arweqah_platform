## Task policies

This page holds every number that governs tasks for one company (when a task counts as urgent, when a reminder is sent, how long an objection waits, and so on) and, below them, the table of who may do what in task conversations. Every number has limits, so no value can switch tasks off.

![Task policies](../images/en/27-task-policies.png)

### Who sees it

- **View permission:** `tasks.policies_view` («View the task policies page»), scope all.
- **Needs platform admin mode:** yes. The page appears in the menu only while admin mode is on.
- **Default roles:** no ordinary role holds it (not the Employee role and not the unit head role); it belongs to the platform administrator. The table of conversation rules needs `tasks.comment_rules_view` («View the comment rules matrix»).

### What you can do

| Action | What happens | Permission |
|---|---|---|
| Choose the company | Shows the policies of that company | `tasks.policies_view` |
| Change numbers and Save | Saves all the numbers of the company at once | `tasks.policies_edit` (Edit the task policies) |
| View the conversation table | Shows who may do what in task comments | `tasks.comment_rules_view` (View the comment rules matrix) |
| Change the conversation table and Save | Saves the whole table at once | `tasks.comment_rules_edit` (Edit the comment rules matrix) |

Without the edit key the fields can be read but the Save button is not shown.

### How to

**Change a policy number**

1. Turn on platform admin mode.
2. Open **Task policies** and choose the company.
3. Change the number. The allowed range is shown under each field; a number outside it shows an error and Save stays disabled.
4. Click **Save**. The message «Policies saved» appears.

**Change who may do what in comments**

1. Scroll to «Who does what in task comments».
2. Each row is a relation to the task; each column is an action: read, write a comment, reply, upload a file, mention with @, edit own comment, delete own comment.
3. Tick or untick the boxes and click **Save**. The change applies at once, including to old comments.

### Fields (form inputs)

**Company** (top of the page)

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Company | Whose policies you see and change; each company has its own numbers. | Yes | One of the companies you may reach. |

**Policy numbers** (one form, saved all at once with **Save**; the range is shown under each field)

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Urgent when due within (days) | A task due within this many days gets the «Urgent» mark and counts as urgent in the matrix. | Yes | Whole number 0 to 14 (default 2). |
| Reminder before the due date (days) | How many days before the due date the assignee gets the reminder. | Yes | 1 to 7 (default 1). |
| Back-dating allowed (days) | How far back a completion date or a logged working day may go; also the late-completion limit. | Yes | 0 to 30 (default 7). |
| Stale after no movement for (days) | A task with no movement for this long gets the «Stale» mark. | Yes | 7 to 180 (default 30). |
| An objection lapses after (working days) | How long an objection waits for an answer before it lapses (Friday and Saturday are off). | Yes | 1 to 10 (default 3). |
| Day of the managers' summary (0 = Sunday … 6 = Saturday) | The weekday when each manager gets the overdue summary of their team. | Yes | 0 to 6 (default 0). |
| Archive standalone tasks after closing (days) | How long a closed standalone task stays in the lists before it is archived. | Yes | 7 to 365 (default 30). |
| Most files in a comment | The most files one comment may carry. | Yes | 1 to 10 (default 5). |
| Time to edit or delete a comment (minutes) | How long the author may edit or delete their own comment. | Yes | 0 to 1440 (default 15). |
| Close the conversation after the task is done (days, 0 = never) | Days after the task closes when its conversation becomes read-only. | Yes | 0 to 365 (default 0 = never). |

**Who does what in task comments** (a table of boxes, saved all at once; shown with `tasks.comment_rules_view`, changed with `tasks.comment_rules_edit`)

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| A box for each relation and action | Rows: Assignee, Who gave the task, Responsible (approver), Reviewer, Follower, Manager (within their team's reach), Colleague with an open task of the same category, Mentioned with @. Columns: Read, Write, Reply, Upload a file, Mention @, Edit own, Delete own. A ticked box lets people with that relation do that action, if their role also holds the action's key. | Every box is saved (ticked or not) | Ticked / unticked. Starting point: the first six relations may do everything; the colleague and the mentioned person may only read, write and reply. |

### Workflow

A policy has no approval steps: it is changed and applies. What matters is what each number does afterwards.

1. An administrator turns on platform admin mode and opens **Task policies**.
2. Chooses the company, changes the numbers (each is checked against its range; Save stays disabled while one is empty or outside it) and clicks **Save**. «Policies saved» appears.
3. The new numbers apply to the next check: marks (urgent, stale) are worked out from them every time a list is read; reminders, overdue notices, archiving and objection time use them in the next run; back-dating and comment limits apply to the next action.
4. In the comments table the administrator ticks or unticks boxes and clicks **Save**; the change applies at once, to old comments too.
5. A company that was never saved works with the defaults above.

| Status | Meaning | Who can move it (permission key) | Moves to |
|---|---|---|---|
| Defaults | The company has not saved its own numbers. | — | Saved by the company. |
| Saved by the company | The numbers (and the comments table) the administrator saved. | `tasks.policies_edit` for the numbers; `tasks.comment_rules_edit` for the table. | Saved again with other values. |

**Automatic things:** the numbers drive the daily job at 6:00 (reminders, overdue notices, archiving), the managers' summary at 8:00 on the chosen weekday, the scheduled lapse of an objection, the «Stale» and «Urgent» marks, and the comment limits. Every policy change is recorded in the audit log.

**What each person sees:** only people with `tasks.policies_view` (platform administrators, in admin mode) see the page. Ordinary people never see the numbers; they feel them as the reminders, marks and limits they meet. The comments table appears only with `tasks.comment_rules_view`, and its boxes can be changed only with `tasks.comment_rules_edit`.

### Business rules

- The numbers, their default values and their limits (FR-54, FR-66):

| Number | Default | Allowed |
|---|---|---|
| Urgent if due within (days) | 2 | 0 to 14 |
| Reminder before due date (days) | 1 | 1 to 7 |
| Back-dating allowed (days) | 7 | 0 to 30 |
| Stale after no movement (days) | 30 | 7 to 180 |
| An objection lapses after (working days) | 3 | 1 to 10 |
| Managers' digest day (0 = Sunday … 6 = Saturday) | 0 | 0 to 6 |
| Archive standalone tasks after closing (days) | 30 | 7 to 365 |
| Most files in a comment | 5 | 1 to 10 |
| Time to edit or delete a comment (minutes) | 15 | 0 to 1440 |
| Close the conversation after the task is done (days, 0 = never) | 0 | 0 to 365 |

- Policies are **per company**; each company has its own numbers.
- Working days exclude Friday and Saturday.
- A policy change is recorded in the audit log.
- **The conversation table:** a row for each relation (the assignee, the person who gave the task, the responsible approver, the reviewer, the follower, the manager inside the team's scope, a colleague with an open task in the same category, a person mentioned with @). An action passes when the person's role holds its key **and** a box is ticked for one of their relations.
- By default the first six relations may do everything. The colleague and the mentioned person (marked with *) may only read, write and reply; they see only the task number, title and conversation.
- A company starts with these defaults until someone changes them.

### Tips / common problems

- The page is not in the menu: turn on platform admin mode, or you lack `tasks.policies_view`.
- Save is disabled: one of the numbers is empty or outside its range.
- A person says they cannot comment: check both their role keys and their relation row in the conversation table.
