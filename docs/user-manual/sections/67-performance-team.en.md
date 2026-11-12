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

| Action | What happens | Permission |
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

### Fields (form inputs)

**Evaluation of a team member (window «Evaluation of <employee>», button «Evaluate»)**

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Results: a score for each criterion (from 0 to 100) | How well the employee met each results criterion of their development stage. Each criterion shows its share; the results score is the weighted average, and the results weight of the stage decides how much of the basic score it is worth | Yes to send (a draft may leave it empty) | A number from 0 to 100 («Enter a number from 0 to 100.») |
| Your rating (for each behaviour) | How often the employee showed the behaviour. The average of the behaviours, times the behaviour weight of the stage, is the other half of the basic score. The employee's own rating, if sent, is shown beside it and does not bind you | Yes to send | «Always» (100), «Often» (75), «Sometimes» (50), «Rarely» (25), «Never» (0) |
| Note (for each behaviour) | The reason for the rating, with an example | Yes at «Always», «Rarely» and «Never»; optional at the other levels | At least 5 characters when required, up to 500 |
| Extra component: internal initiatives and contribution to growth (tick the items the employee claimed) | The items of this year's catalog that you accept. Each adds its points, up to the cap of its kind | No | Only items of the catalog of the open cycle and of the right kind; up to 30 each |
| Learning (not typed) | Calculated by the system from the approved learning hours against the hours of the stage, up to 10 points | — | Automatic |

The card «Live final score» shows results, behaviour, basic, learning, initiatives, growth and the final score out of the cap, as you type. The buttons are «Save draft», «Send the evaluation» and, after sending, «Save the change». «Send the evaluation» stays off while a field is invalid.

**Minutes of a milestone (window «Minutes: <employee>», calendar icon)**

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Where are we? (short review) | Where the employee stands now | No | Up to 1,000 characters |
| What is in the way? (short review) | The obstacles | No | Up to 1,000 characters |
| The agreed action (short review) | What you and the employee agreed to do | Yes for a short review | At least 5 characters, up to 1,000 |
| Short note (pulse) | A brief note of the pulse | Yes for a pulse | Up to 1,000 characters |

The minutes carry no scores. «Save the minutes» tells the employee, who then ticks «I read the minutes».

**Search and filters of the team table**

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Search the team | By employee name | No | Up to 100 characters |
| Scope | Everyone below you, or only your direct reports | No | «Everyone below me, all levels» (default) or «Direct reports only» |
| Evaluation status | Only what waits for you, or what you finished | No | «Waiting for your evaluation» or «Evaluated» |

### Workflow

This page owns the manager's stage of the cycle (the whole cycle, with its stages and dates, is in the page «Evaluation cycle»).

1. HR opens the cycle and the employees send their self-evaluations. When someone sends theirs, you are notified («A self-evaluation is waiting for your review») and the notice box names them.
2. HR moves the cycle to the manager's stage; you are notified that it began. Before that, the buttons are dimmed and explain why.
3. **As the direct manager:** you press «Evaluate», enter the results scores, rate the behaviours with notes, tick the catalog items you accept, watch the live score, then «Save draft» and «Send the evaluation».
4. At your first send the **upper manager is notified** («An evaluation is waiting for your review»). The evaluation of an **indirect report** cannot be written before their direct manager sent (the button says «Waiting for the review of <manager> (their direct manager) first»).
5. **As the upper manager:** you open the evaluation the direct manager sent, review it, change it if needed and send. Each of you keeps your own copy: what the direct manager entered is never lost. If the upper manager's copy exists, its score is the one calibrated.
6. The scores then go to calibration (the page «Calibration and approval»). After the manager's stage is over the evaluation is read only.
7. **Return after an objection:** if the approver accepts an objection of one of your people, their evaluation comes back to you as a draft and you are notified. You (the direct manager) revise and send, then the upper manager reviews and sends again. This is the only time an evaluation is editable after the manager's stage.
8. **Milestones** can be recorded for each member during the cycle, apart from the stages.

| Status / Stage | Meaning | Who can move it (permission key) | Moves to |
|---|---|---|---|
| Not started | You wrote nothing for this person | You: `performance.team_evaluate` | Draft |
| Draft | A form you saved and did not send | You: `performance.team_evaluate` | Sent |
| Sent | Your evaluation was sent (you may save a change until the manager's stage ends) | You: `performance.team_evaluate`; the next reader is the upper manager, then calibration | Read only after the manager's stage (back to Draft only by an accepted objection) |
| Blocked: the cycle is not open | No cycle | HR: `performance.cycle_manage` (open it) | Blocked: stage not started |
| Blocked: the manager's stage has not started | The cycle is still in self-evaluation | HR: `performance.cycle_manage` | Open to write |
| Blocked: waiting for the direct manager | The upper manager before the direct manager sent | The direct manager: `performance.team_evaluate` | Open to write |
| Blocked: the manager's stage is over | Read only | — | — |
| Milestone: Not recorded / Recorded / Recorded and read by the employee / Does not run this year | The state of each milestone of the member | You: `performance.milestone_record`; the employee ticks `performance.milestone_ack` | Recorded, then read; recording again clears the employee's tick |

**Automatic things**

- **Notices to you:** the manager's stage began; a self-evaluation is waiting; an evaluation came back after an objection. **Notices from you:** the upper manager at the direct manager's first send; the employee when you record minutes of a milestone.
- **Reminders** (HR sets them in «Evaluation cycle»): every N days while evaluations wait for you in the manager's stage, and N days before a milestone date when the minutes are missing; they stop when the work is done and are never sent on Friday or Saturday.
- **Audit:** drafts, sends and changes of evaluations and the recording and reading of minutes are recorded.

**What each person sees:** you see your unit and below («unit and below» by default), in two scopes (direct reports only, or everyone below); a person outside it does not exist for you. The employee sees no score before approval and the individual notification; they see the minutes of their milestones and tick that they read them.

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
