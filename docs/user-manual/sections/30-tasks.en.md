## My tasks

«My tasks» is one place for everything you have to do, everything you asked others to do, and everything you follow. A manager also sees a tab for the team. The same list can be shown as a table, as cards, or as a Kanban board with one column per status. The matrix, a small summary of your open tasks in four squares, sits on the home page.

![My tasks](../images/en/07-tasks.png)

### Who sees it

- **View permission:** `tasks.view` («View my tasks and task details»). Default scope: own (the tasks you are linked to).
- **Default roles:** the Employee role holds it, together with create, edit and change-status for your own tasks. The «my team» tab needs `tasks.team_view` («View the team tasks page»), which the head role of every unit holds (unit and below).
- The page does not need platform admin mode. An administrator can hide it for a role from the page visibility screen.
- A task you have no relation to, or that is outside your scope, is shown as «not found».

### What you can do

| Action | What happens | Permission |
|---|---|---|
| New task | Opens a popup to create a task | `tasks.create` (Create a task) |
| Assign to someone else | Choose another person in the «Assigned to» field | `tasks.assign` (Assign a task to another person) |
| Open my team tab | Shows the tasks of direct reports or of everyone below you | `tasks.team_view` (View the team tasks page) |
| Matrix on the home page | Your open tasks in four squares | `tasks.matrix_view` (View the task matrix) |
| Edit a task | Changes title, details, due date, priority | `tasks.update` (Edit a task) |
| Move a task (drag or menu) | Changes the status of your own task | `tasks.change_status` (Change the status of my tasks) |
| Move a team task | Changes the status of a team member's task | `tasks.team_change_status` (Change the status of team tasks) |
| Approve / Reject | Decides on a task a person gave to themselves | `tasks.approve` / `tasks.reject` |
| Review (accept or send back) | Accepts finished work or returns it with a note | `tasks.review` |
| Reopen | Brings a finished task back | `tasks.reopen` (Reopen a finished task) |
| Resubmit | Sends a rejected task for approval again | `tasks.resubmit` |
| Object | Objects to a task given to you | `tasks.object` |
| Follow / Unfollow | Adds the task to your «Following» tab | `tasks.follow` (Follow a task) |
| Log time | Records time worked | `tasks.log_time` |
| Archived filter | Shows archived tasks | `tasks.archive_view` (View archived tasks) |
| Restore | Brings an archived task back | `tasks.restore` (Restore an archived task) |
| Export | Exports the list to a file (scope, columns, file type) | `tasks.export` (Export task lists) |

The list has no import: tasks are created one by one, not from a file.

### How to

**Create a task**

1. Click **New task**.
2. Write the title (required) and the details.
3. Choose the person (you, by default), the tag, the due date (required, not in the past), the priority, the expected time in hours, and repetition (none, daily, weekly, monthly, with an optional end date).
4. Turn on «Mark as urgent» or «Needs review» if needed.
5. Read the line under the form: if the task is for yourself it says who approves it, or that no approval is needed. Click **Create task**.

**Change the status of a task**

1. On the board, drag the card to another column using its handle, or open the task and use «Move to».
2. If a note or a completion date is needed, a small window asks for it.
3. If the move is not allowed, the card goes back and the reason is shown.

**Follow my team**

1. Open the **My team** tab.
2. Choose «My direct reports» or «Everyone under me».
3. On the board tick «One row per person» to split the board by person.

**Find a task**

1. Type in the search box: title or task number (TSK-000123).
2. Use the filters: status, priority, person, tag, stale only, overdue only, include finished and rejected, archived.
3. Group the table by due date, status or person, and switch between table, cards and board. The page remembers your choice.

### Fields (form inputs)

**New task** (button **New task**; the same fields, except «Assign to», the tag and the repetition, appear in «Edit the task»)

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Title | A short name of the work; it is what people see in lists, cards and notices. | Yes | 1 to 200 characters. |
| Details | The full description of what must be done. | No | Up to 5000 characters. |
| Assign to | Who must do the task. Left on yourself, the task is «for yourself» and goes to your direct manager for approval (a line under the form says who approves, or that nobody does). Another person gets the task at once as «To do» and is notified. | No (yourself by default) | Only people you may give a task to: a manager to anyone under them, an employee to the manager of their department, people on the same ticket to each other, anyone to themselves (needs `tasks.assign` for others). |
| Tag | The tag of the task (for example «Reports» or «Meetings»). It also decides which colleagues may join the task conversation (see Task details and conversation). | No («No tag») | Active tags of your unit and of the units above it; if your unit has none, the field says so. |
| Due date | The day the work is due. It drives the reminder, the «Overdue» and «Urgent» marks and the matrix. | Yes (today by default) | A date, not in the past when creating. |
| Priority | How important the task is; «High» makes it «important» in the matrix. | No | Low, Medium (default), High. |
| Expected time (hours) | The estimate of the work. When the time logged passes it, the assignee and the person who gave the task are told once. | No | A number above 0, steps of 0.25 hour; empty when unknown. |
| Repeats | Makes the system create the next task by itself when this one is closed (daily, weekly, monthly). | No | Does not repeat (default), Every day, Every week, Every month. |
| Repeats until | The last date a repeating task may repeat. Shown only when «Repeats» is not «Does not repeat». | No | A date not before the due date; empty = no end. |
| Urgent / «Mark as urgent» | Marks the task urgent by hand, whatever its due date. | No | On / Off (default Off). |
| Review / «Needs a review» | The assignee cannot finish the task alone: finishing sends it to «Awaiting review» and the reviewer closes it. The reviewer is the person who gave the task (for a task you gave yourself, your approving manager). | No | On / Off (default Off). |

There is no attachment field on a task: files are added in the task conversation (see Task details and conversation).

**Window «Send the work back»** (moving a task from «Awaiting review» to «In progress»)

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Note | What is missing; the assignee is notified and sees the note in the history. | Yes | Up to 5000 characters. |

**Window «When did the work end?»** (finishing a task more than the allowed days after its due date)

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Completion date | The real day the work ended. | Yes | A date up to today, and not further back than the «Back-dating allowed» days of the task policies (7 by default). |

### Workflow

**What happens when someone creates and assigns a task**

1. The creator clicks **New task**, fills the form and clicks **Create the task**. The task gets a number such as TSK-000123 and the first line of its history, «Created».
2. **Given to another person:** the task starts as «To do» at once. The assignee receives the notice «New task». If «Needs a review» is on, the reviewer is the creator.
3. **Given to yourself, with a manager:** the task starts as «Pending approval» and the manager receives «Approval requested». The manager opens the task and clicks **Approve** (`tasks.approve`) or **Reject** (`tasks.reject`), with an optional note. Approving makes it «To do»; rejecting makes it «Rejected». The creator is notified of the decision.
4. **Rejected:** the owner edits the task and clicks **Send again** (`tasks.resubmit`); it goes back to the manager as «Pending approval». **Given to yourself, with no manager:** nobody has to approve, the task is «To do» at once, and the review switch has no effect because there is nobody to review.
5. **Objection:** while the task is «To do», an assignee who got it from someone else may click **Object** and choose a reason. The person who gave the task answers: keep it with the assignee, or accept and give it to someone else (who is notified). Unanswered, the objection lapses after 3 working days by default (set in Task policies).
6. **Start and work:** the assignee (or a manager of the team) moves the task to «In progress» by dragging the card or with «Move to». The assignee logs the time worked with **Log time**.
7. **Finish:** the assignee moves the task to «Done». If the task needs a review it goes to «Awaiting review» and the reviewer is notified. If the task is late beyond the allowed days, the window «When did the work end?» asks for the real day.
8. **Review:** the reviewer accepts (the task becomes «Done») or sends it back to «In progress» with a required note; the assignee is notified.
9. **After closing:** the person who gave the task, or a manager, may reopen a «Done» task. A repeating task creates the next one when it is closed. A standalone task is archived 30 days after it closes by default (set in Task policies), and **Restore** brings it back in its earlier status.

| Status | Meaning | Who can move it (permission key) | Moves to |
|---|---|---|---|
| Pending approval | A task given to yourself waits for your manager. | The approver: `tasks.approve` / `tasks.reject` (never by dragging). | To do (approved) or Rejected. |
| To do | Accepted, not started. | The assignee: `tasks.change_status`; a manager of the team: `tasks.team_change_status`. | In progress. |
| In progress | The work is being done. | The assignee: `tasks.change_status`; a manager of the team: `tasks.team_change_status`. | Done, or Awaiting review if the task needs a review. |
| Awaiting review | The work is finished and waits for the reviewer. | The reviewer only: `tasks.review`. | Done, or In progress (note required). |
| Done | Finished. | The person who gave the task or a manager: `tasks.reopen`. | To do, In progress, or Awaiting review (a task that needs review). |
| Rejected | Refused at approval. | The owner: `tasks.resubmit` (Send again). | Pending approval (or To do when there is no manager). |

**Automatic things**

- **Reminder:** every morning (6:00 Riyadh time) the assignee receives one reminder the number of days before the due date set in the task policies (1 by default).
- **Overdue:** the assignee and the person who gave the task are told once when the due date passes. The marks «Urgent», «Overdue» and «Stale» are worked out from the data each time, never stored.
- **Weekly summary:** on the company's summary day (Sunday by default, 8:00) each manager receives the number of overdue tasks of their direct reports.
- **Objection time:** a scheduled job closes an unanswered objection after the allowed working days and notifies the giver and the assignee.
- **Estimate:** one notice when the logged time passes the estimate.
- **Archive:** every morning standalone tasks closed for long enough are archived and the giver is notified.
- **Notices and audit:** assigning, approving, rejecting, status changes, objections and archiving create notices (e-mail only for the important ones, never with the title) and are recorded in the audit log and in the history of the task.

**What each person sees:** the assignee sees the task under «Assigned to me»; the person who gave it under «Assigned by me»; a follower under «Following»; a manager sees their team's tasks under «My team» (within the scope of the key); the approver sees a pending task in their lists. A colleague with an open task in the same tag or a mentioned person sees only the number, title and conversation.

### Business rules

- The page opens on **open tasks**, ordered by due date. Finished and rejected tasks appear only if you tick «Include finished and rejected» (the board always shows every column).
- Tabs: **Assigned to me**, **Assigned by me**, **Following**, and **My team** for managers. (FR-48)
- Statuses: Pending approval, To do, In progress, Awaiting review, Done, Rejected. A task has a number such as TSK-000123.
- **Who may assign to whom:** a manager to anyone under them; an employee to the manager of their department; people working on the same ticket to each other; anyone to themselves. (FR-48)
- **Self-approval:** a task you give to yourself starts as «Pending approval» and is approved or rejected by your direct manager. A person with no manager is approved automatically. An approved task becomes «To do». A rejected task is shown as «Rejected»; its owner edits it and presses **Resubmit**, and it goes back to the manager. (FR-51)
- **Allowed moves:**

| From | To | Who |
|---|---|---|
| Pending approval | any | nobody by dragging; only the approver's decision moves it |
| To do | In progress | the assignee, or a manager of the team |
| In progress | Done | the assignee or a manager; if the task needs review it goes to «Awaiting review» instead |
| Awaiting review | Done | the reviewer only |
| Awaiting review | In progress | the reviewer only, with a required note |
| Done | To do / In progress / Awaiting review | whoever assigned the task, or a manager (reopening) |
| Rejected | any | nobody; resubmit instead |

  The reviewer is the person who gave the task (for a self task, the one who approved it). (FR-50)
- **Late completion:** if a task is finished more than 7 days after its due date, you must give the real completion date. Back-dating is limited to 7 days (the number is set in the task policies). (FR-50)
- **Objection:** the assignee of a task that someone else gave them may object while it is still «To do», choosing one reason: not my responsibility, not enough time, missing information, conflicting priorities. The task shows an «Objected» mark. The person who gave the task answers: reject (the task stays with the assignee) or accept and give it to someone else. An objection nobody answers lapses after 3 working days (Friday and Saturday are off) and the task stays with the assignee. (FR-52)
- **Time log:** minutes worked on a day, back-dating up to 7 days. When logged time passes the estimate, the assignee and the person who gave the task are notified once. (FR-48, FR-56)
- **Marks:** *Urgent* (marked by hand, due within 2 days, or overdue), *Overdue*, *Stale* (no movement for 30 days; not for tasks waiting for approval), *Objected*. Each mark has an icon and text. (FR-49)
- **Reminders:** a reminder the day before the due date; every Sunday morning each manager receives the overdue tasks of their team; recurring tasks create the next one when the current one is closed. (FR-53)
- **Archive:** a standalone task is archived 30 days after it closes and leaves the normal lists. Users with the archive key see it with the «Archived» filter and can **Restore** it; it returns in its earlier status and the assigner is notified. (FR-53)
- **Notifications:** the assignee is told when a task is assigned; the person who gave the task is told of every status change; the reviewer when a task awaits review; objections and their answers. Nobody is notified of their own change, and quick changes within a minute arrive as one notice. E-mail is sent only for the important ones and never contains the title. (FR-56)
- **When an employee leaves**, their open tasks go to their direct manager. (FR-55)
- Changes to a task made by two people at once are refused for the second person, who must reload and try again.

### Tips / common problems

- A task you expect is missing: check the tab, and tick «Include finished and rejected».
- You cannot drag a card: the card is waiting for approval, rejected, or the move is not yours; the reason is shown when you try.
- You do not see the «My team» tab: you have no team permission or no one reports to you.
- The matrix on the home page counts a task as **important** if its priority is high and **urgent** if it is due soon, overdue or marked urgent.
