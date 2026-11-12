## Team evaluation

«Team evaluation» is the manager's page in the evaluation cycle. You evaluate the members of your team in the manager's stage: the direct manager first, then the upper manager reviews and may change it. For each person you enter the results scores and rate the behaviours, and you see the final score live. A button on each row records the minutes of the milestones of the year.

![Team evaluation](../images/en/25-performance-team.png)

### Who sees it

- View permission: `performance.team_view` (View the «team evaluation» page), scopes: unit and below, all. The default scope is **unit and below**.
- Default roles: the **head role of every unit** holds the view, evaluate and export keys at «unit and below», and also the milestone keys. The Employee role does not hold them.
- It does not need platform admin mode.
- Menu: the group «Career file», item «Team evaluation». People outside your unit and below do not exist for you: the system answers as if the record was not found.
- Before the cycle opens the page says «The evaluation cycle is not open yet».

### What you can do

| Action | What happens | Permission key (label) |
|---|---|---|
| Open the page, search and filter | The stage stepper, the chain note, the notices, and the team table; search by employee name; filters: scope («Everyone below me, all levels» or «Direct reports only») and evaluation status («Waiting for your evaluation», «Evaluated») | `performance.team_view` (View the «team evaluation» page) |
| Evaluate / View (pencil or eye icon, or a click on the row) | Opens the evaluation window of the employee; after the manager's stage it is read only | `performance.team_view` (View the «team evaluation» page) |
| Save a draft, send the evaluation, save a change | Saves what you entered, or sends the evaluation to the next step | `performance.team_evaluate` (Evaluate team members and send the evaluation) |
| Milestones (calendar icon) | Opens the milestones of the member; record or edit the minutes of a milestone | `performance.milestone_view` (View the team's milestones and their minutes) and `performance.milestone_record` (Record the minutes of a milestone for a team member) |
| Export the list | Downloads the team evaluation list | `performance.team_export` (Export the «team evaluation» list) |

### How to

**Evaluate a team member**

1. Open **Team evaluation**. The banner says how many of your team are waiting for your evaluation, and the notice box says for example «<name> sent their self-evaluation and is waiting for your review»; the name opens the evaluation.
2. Press «Evaluate» on the row (or click the row). If the button is dimmed, click it to read the reason.
3. Read the note on top: the employee's self-evaluation, if sent, is shown under each behaviour and does not bind you.
4. **Results:** enter a score from 0 to 100 for each criterion (each criterion shows its share).
5. **Behaviours:** choose a level for each behaviour (Always, Often, Sometimes, Rarely, Never) and write the note; the note is required at «Always», «Rarely» and «Never».
6. **Extra component:** «Learning» is automatic; tick the catalog items the employee claimed that you accept.
7. Watch the live card of the final score. Press «Save draft», then «Send the evaluation». If you are the direct manager, the evaluation then goes to the upper manager, then calibration.

**Review as the upper manager**

1. Wait until the direct manager has sent the evaluation (otherwise the button explains «Waiting for the review of <manager> (their direct manager) first»).
2. Open the evaluation of the direct manager, review it and change it if needed, then send it. The scores then go to calibration.

**Record the minutes of a milestone**

1. Press the calendar icon of the member and choose the milestone.
2. For a short review answer «Where are we?», «What is in the way?» and **The agreed action** (required, at least 5 characters). For a pulse write a short note.
3. Press «Save the minutes». The employee is told and acknowledges reading them.

### What the employee sees (their own page)

- Before the manager's stage ends the employee's evaluation is «under review»: **no scores are shown before the individual notification** after approval (FR-119).
- In the self-evaluation stage the employee presses «Start the self-evaluation», rates the behaviours in the same five levels, writes achievements for each results criterion (without a score) and picks catalog items. They can change it until their manager starts.
- Milestones appear in the employee's tab «Milestones» with a button «I read the minutes».

### Business rules

- **Who evaluates whom** (FR-120): every manager evaluates everyone below them, direct and indirect, at every level.
- **One chain:** the employee evaluates themselves, the direct manager reviews and adjusts, the upper manager reviews and may change the direct manager's evaluation, then calibration and approval. An indirect report cannot be evaluated before their direct manager's review.
- **Why a button may be blocked (always shown with its reason):** the cycle is not open yet; the manager's stage has not started (the current stage is named); waiting for the direct manager's review first; the manager's stage is over (read only). Only when an employee's evaluation is returned after an accepted objection can it be edited again.
- **Scoring:** results are scored from 0 to 100 per criterion; behaviours use Always = 100, Often = 75, Sometimes = 50, Rarely = 25, Never = 0, and the average is taken. Basic = results × their weight + behaviour × theirs (the weights belong to the development stage of the employee, for example 60/40 for Foundation). Then learning (approved learning hours against the hours of the stage, up to 10 points), internal initiatives and contribution to growth (each up to its cap) are added. The final score never goes above the cap of the stage (for example 125 for Foundation) (FR-121).
- **Grade scale:** exceptional from 110, exceeds expectations 95 to 109.9, meets expectations 80 to 94.9, needs improvement 65 to 79.9, below expectations under 65.
- **Behaviour notes:** required at Always, Rarely and Never, at least 5 characters, for both employee and manager.
- **The sent button stays off while a field is invalid;** the server refuses an evaluation with wrong fields or when the stage is over.
- **The employee's self-evaluation does not bind the manager.**
- **Milestones** are a fixed calendar: short reviews on 15 January and 15 July, pulses on 15 March and 15 September, and the warning grade in October that does not run this year; their dates can be changed by HR in the evaluation cycle page. The minutes carry no scores. Recording them again clears the employee's acknowledgement.
- **Reminders:** the manager is reminded every N days of the evaluations waiting for them, and of milestones whose minutes are not recorded; reminders stop once the work is done and are never sent on Friday or Saturday.
- Like every list the page has search, filters, the table / cards switch and export.

### Tips and common problems

- The button is dimmed: click it and read the reason, it is one of the blocks above.
- A person of your team is missing: they are outside your unit and below, or have no evaluation in this cycle («Nobody in your team has an evaluation in this cycle»).
- The send failed: check the fields (scores from 0 to 100, notes where required) and that the manager's stage is still on.
