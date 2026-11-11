## Home

The first page after signing in: your day at a glance. The numbers of your tasks and tickets and what needs your attention now, charts of them, the task matrix, and for managers the employee statistics. Each number opens the list it counts, so the details are one click away.

![Home](../images/en/02-home.png)

### Who sees it

- The page is for every employee and needs no view key of its own. **Its sections show according to the keys you hold** (see the table), and a section disappears if the administrator hides its related page from your role.
- It does not need platform admin mode.
- The «Employee» role holds the tasks and tickets keys at the «Own record only» scope, so you see your own numbers. A unit head holds the task matrix at «Their unit and below», so the team numbers and the employee statistics show for them.

| Section on the page | What it needs | Default role |
|---|---|---|
| «My numbers» (tasks) and my current tasks | `tasks.view` (View my tasks and task details) | Employee, unit head |
| Ticket numbers and «My tickets» | `tickets.view` (View the tickets page and ticket details) | Employee, unit head |
| Task matrix | `tasks.matrix_view` (View the task matrix) | Unit head (their unit and below); the Employee if it is given to them |
| Team numbers | A tasks scope wider than «Own record only» | Unit head |
| Employee statistics | `employees.view` (View employees) at a scope wider than «Own record only» | Unit head, HR, system administrator |

### What you can do

| Action | What happens | Permission key |
|---|---|---|
| Click a number in «My numbers» | Opens the list of tasks or tickets it counts (for example «Overdue tasks» opens tasks filtered by overdue) | `tasks.view` / `tickets.view` |
| Click a task title in «My current tasks» | Opens the task details and its conversation | `tasks.view` |
| «All my tasks» | Opens the tasks page | `tasks.view` |
| «New task» (shown when you have no open tasks) | Opens the new-task form | `tasks.create` (create a task) |
| «All tickets» | Opens the tickets page | `tickets.view` |
| Choose «View» in the matrix: «My tasks» or «My team's tasks» | Switches the tasks shown | `tasks.matrix_view` |

### What you see

- **My numbers (tasks):** My open tasks, Overdue tasks, Due within 7 days, Finished (last 30 days), Finished on time (a percentage), and two tiles that appear when something waits for you: «Awaiting my review» and «Awaiting my approval».
- **Team numbers (for those with a team scope):** Team: overdue, Team: stale, Team: finished (this week).
- **Ticket numbers:** Tickets I sent, still open; Awaiting my confirmation; Awaiting my reply.
- **My current tasks:** the nearest open tasks by due date, with a bar that divides your open tasks by status.
- **My tickets:** what you sent and is still open, what waits for your reply, and what waits for your confirmation.
- **Charts:** open tasks by status, tasks finished on time and late, my tickets by status, and the employees (active, IDs and contracts).
- **The task matrix:** your open tasks in four squares by importance and urgency: «Important and urgent» (start with these), «Important, not urgent» (plan them before they become urgent), «Urgent, not important» (finish them fast or hand them to someone), «Neither» (do them when there is time).
- **Employee statistics:** Employees, Active, IDs expired or expiring (within 30 days), Contracts ending soon (within 30 days), and a «Need a unit» tile when an employee has no unit.

### How to

**Find what needs your attention**


1. Open Home and look at the tiles with an alert tone (red or yellow): overdue items, and what waits for your reply, confirmation or approval.
2. Press the tile to open what it counts.
3. Do what is needed and come back to Home to see the number go down.

**Set your priorities with the matrix**


1. Look at the «Important and urgent» square and start with its tasks.
2. Plan the «Important, not urgent» tasks before their date comes close.
3. If you are a manager, switch «View» to «My team's tasks» to see your team's tasks.

### Business rules

- A task is «important» when its priority is high, and «urgent» when its date is near or past or it was marked urgent. (FR-49)
- The numbers and sections are counted from your scope only; nothing outside it enters any number.
- The «Awaiting my review» and «Awaiting my approval» tiles show only when something waits for you.
- The employee statistics are about other people, so an ordinary employee (scope «Own record only») does not see them.
- A greeting with your first name appears at the top of the page.

### Tips

- If a section does not appear, its key is not yours or its page is hidden from your role; check «My access».
- A number «0» is not a fault: it means nothing waits for you.
