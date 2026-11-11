## Task policies

This page holds every number that governs tasks for one company (when a task counts as urgent, when a reminder is sent, how long an objection waits, and so on) and, below them, the table of who may do what in task conversations. Every number has limits, so no value can switch tasks off.

### Who sees it

- **View permission:** `tasks.policies_view` («View the task policies page»), scope all.
- **Needs platform admin mode:** yes. The page appears in the menu only while admin mode is on.
- **Default roles:** no ordinary role holds it (not the Employee role and not the unit head role); it belongs to the platform administrator. The table of conversation rules needs `tasks.comment_rules_view` («View the comment rules matrix»).

### What you can do

| Action | What happens | Permission key (label) |
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
