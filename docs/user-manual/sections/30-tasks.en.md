## My tasks

«My tasks» is one place for everything you have to do, everything you asked others to do, and everything you follow. A manager also sees a tab for the team. The same list can be shown as a table, as cards, or as a Kanban board with one column per status. The matrix, a small summary of your open tasks in four squares, sits on the home page.

![My tasks](../images/en/07-tasks.png)

### Who sees it

- **View permission:** `tasks.view` («View my tasks and task details»). Default scope: own (the tasks you are linked to).
- **Default roles:** the Employee role holds it, together with create, edit and change-status for your own tasks. The «my team» tab needs `tasks.team_view` («View the team tasks page»), which the head role of every unit holds (unit and below).
- The page does not need platform admin mode. An administrator can hide it for a role from the page visibility screen.
- A task you have no relation to, or that is outside your scope, is shown as «not found».

### What you can do

| Action | What happens | Permission key (label) |
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
3. Choose the person (you, by default), the category, the due date (required, not in the past), the priority, the expected time in hours, and repetition (none, daily, weekly, monthly, with an optional end date).
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
2. Use the filters: status, priority, person, category, stale only, overdue only, include finished and rejected, archived.
3. Group the table by due date, status or person, and switch between table, cards and board. The page remembers your choice.

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
