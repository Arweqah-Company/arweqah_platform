## Calibration and approval

«Calibration and approval» is the page where one person compares the scores that managers gave, adjusts them by half points with a written reason, then approves the results, tells every employee individually and decides the objections that employees raise. Employees never see scores before this page's approval and the individual notification.

![Calibration and approval](../images/en/24-performance-calibration.png)

### Who sees it

- View permission: `performance.calibration_view` (View the «calibration and approval» page), scope: all.
- Who holds it: the platform manager gives it, from the permissions page, to HR (who see the page **read only**) and to the person who calibrates and approves. Nobody holds it by default except the **Administrator**; it is not in the head role of units.
- The two working keys `performance.calibrate` and `performance.approve` are meant to be held by **one person**, appointed by the platform manager from the permissions page. HR sees the page without editing: it can neither calibrate nor approve.
- Administrative permissions that wait for platform admin mode work only while the mode is on.
- Menu: the group «Career file», item «Calibration and approval».

### What you can do

| Action | What happens | Permission |
|---|---|---|
| Open the page, search and filter | Two tabs: «Calibration» and «Approval and objections»; the distribution chart of levels; the table; search by employee name; filters: level, career stage, score adjusted | `performance.calibration_view` (View the «calibration and approval» page) |
| Open a row | A details window with the breakdown of the score | `performance.calibration_view` (View the «calibration and approval» page) |
| Adjust the score (sliders icon) | Opens «Calibration adjustment»: adjustment in points and a reason; shows the score after calibration | `performance.calibrate` (Calibrate the scores of employees and finish calibration) |
| Finish calibration and send it to approval | Moves the cycle to the approval stage; scores can no longer be adjusted | `performance.calibrate` (Calibrate the scores of employees and finish calibration) |
| Approve the results and tell everyone individually | Freezes each employee's final result, notifies them and starts the objection window | `performance.approve` (Approve the results and decide the objections) |
| Accept an objection and return it to the manager | The evaluation goes back to the manager | `performance.approve` (Approve the results and decide the objections) |
| Reject an objection | Rejects it with a reason the employee reads | `performance.approve` (Approve the results and decide the objections) |
| Approve the revised evaluation | Approves the evaluation the manager redid after an accepted objection | `performance.approve` (Approve the results and decide the objections) |
| Export the list | Downloads the calibration list | `performance.calibration_export` (Export the calibration and approval list) |

A button without its key is hidden; a button whose stage is not on is dimmed and explains («Available in the calibration stage only», «Available in the approval stage only»).

### How to

**Calibrate scores**

1. Open the page in the calibration stage. The notice bar «you can calibrate the employees' scores before the deadline» leads you here.
2. Look at «Distribution of the levels» and the table: employee, title, direct manager, manager's score, adjustment, score after calibration and level.
3. For a score to adjust, press the sliders icon of the row. Enter the adjustment (from −10 to +10 in steps of 0.5) and the reason (at least 5 characters), then «Save».
4. If a line shows «Waiting for the manager», that employee's manager has not sent the evaluation yet; calibration cannot be finished before.
5. Press «Finish calibration and send it to approval» and confirm.

**Approve and tell everyone**

1. Open the tab «Approval and objections» in the approval stage.
2. Check the distribution and the table of scores.
3. Press «Approve the results and tell everyone individually» and confirm: «Each employee's final result is frozen and they are told; the objection window (five working days) begins.»

**Decide an objection**

1. In «Objections» read the employee, the item, the reason and the state.
2. Press «Accept and return to the manager» (the manager redoes the evaluation and sends it again), or «Reject», write the reason (at least 10 characters) and confirm.
3. After the manager sends the revised evaluation, press «Approve the revised evaluation». That score is then final.
4. When every objection is decided, HR closes the cycle from the evaluation cycle page.

### Fields (form inputs)

**Calibration adjustment (dialog «Calibration adjustment: <employee>», sliders icon on a row)**

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Adjustment (points) | How many points to add to (or take from) the manager's score so that scores are fair between managers. The dialog shows «Manager's score» and, live, «Score after calibration» | Yes (zero means no adjustment) | From −10 to +10 in half-point steps («Enter a multiple of 0.5 between −10 and +10.»). Score after calibration = manager's score + adjustment, never below 0 and never above the cap of the stage |
| Reason | Why you adjusted; the employee sees it after the notification | Yes for any adjustment other than zero (setting zero clears it) | From 5 to 500 characters («Write the reason (at least 5 characters).») |

**Reject an objection (dialog «Reject the objection of <employee>»)**

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Reason for rejecting | Why the objection is refused; the employee reads it in their result | Yes | From 10 to 1,000 characters |

Accepting an objection and approving the revised evaluation are buttons with no input.

**Search and filters of the calibration table**

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Search the calibration | By employee name | No | Up to 100 characters |
| Level | Narrows by the level of the score after calibration | No | A level of the grade scale |
| Career stage | Narrows by the development stage of the employee | No | Stage 1 to 5 |
| Score adjusted | Only the scores you changed, or only those you did not | No | Yes or No |

### Workflow

This page owns three parts of the cycle (the whole cycle is in the page «Evaluation cycle»): **calibration**, **approval** and the **decision on objections**.

**A. Calibration**

1. HR moves the cycle to the calibration stage. The holder of `performance.calibrate` opens the page: the table shows, for each employee, the manager's score (the upper manager's sent score, else the direct manager's), the adjustment, the score after calibration and the level, with the chart of the distribution of the levels.
2. For each score to adjust, the holder presses the sliders icon, enters the adjustment and a reason, and saves. A row «Waiting for the manager» has no sent evaluation yet.
3. When every evaluation has a sent manager score, the holder presses «Finish calibration and send it to approval» and confirms. The cycle moves to Approval and scores can no longer be adjusted.

**B. Approval**

1. In the approval stage the holder of `performance.approve` opens the tab «Approval and objections», checks the distribution and the scores.
2. The holder presses «Approve the results and tell everyone individually» and confirms. Each final result is frozen (final score, level, breakdown, adjustment and its reason), the last day of objections is set (five working days from the notification) and the cycle moves to Individual notification.
3. Every employee is notified and sees their result for the first time. HR may then open the «Objection window» stage.

**C. Objections**

1. The employee raises one objection on one item. The approvers are notified («A new objection to an evaluation result»).
2. The approver reads the employee, the item and the reason, and chooses: **Reject** (with a reason of 10 characters or more), or **Accept and return to the manager**.
3. If accepted: the evaluation goes back to the direct manager as a draft (and the upper manager's too), the calibration adjustment of that employee is removed, and the employee and the direct manager are notified. The direct manager revises and sends; then the upper manager reviews and sends again.
4. The approver presses **Approve the revised evaluation**: the result is recomputed from the managers' new scores, replaces the old one and the employee is notified. It is final.
5. When no objection is pending, HR closes the cycle.

| Status / Stage | Meaning | Who can move it (permission key) | Moves to |
|---|---|---|---|
| Calibration stage | Scores can be adjusted | `performance.calibrate` (adjust, finish) | Approval |
| Approval stage | The results wait for approval | `performance.approve` (approve) | Individual notification |
| Objection: With the approver | The employee raised it; waiting for a decision | `performance.approve` (accept or reject) | Back with the manager, or Rejected |
| Objection: Back with the manager | Accepted; the manager redoes the evaluation | The managers: `performance.team_evaluate` (revise and send, then the upper manager reviews) | Waiting for the revised evaluation to be approved |
| Objection: Waiting for the revised evaluation to be approved | Both managers sent again | `performance.approve` (approve the revised evaluation) | Revised evaluation approved |
| Objection: Revised evaluation approved | The new result is final | — | — |
| Objection: Rejected | Refused with a reason (final) | — | — |

**Automatic things**

- **Notices:** all employees on approval; the approvers on a new objection; the employee on each decision on their objection; the direct manager when an evaluation comes back; the holders' reminder every N days in the calibration and approval stages (set in «Evaluation cycle»).
- **Window:** an objection is refused after the last day (checked at the moment of the request, no job); Friday and Saturday are not counted.
- **Audit:** every adjustment (score before and after, without the reason text), the finishing of calibration, the approval, each objection and each decision are recorded.

**What each person sees:** the holder of the keys sees all employees (scope all); HR with only the view key sees the page read only; an employee never sees this page, only their own result and the state of their objection; the direct manager sees an evaluation again only when it comes back to them.

### Business rules

- **Score shown for calibration** (FR-122): the upper manager's sent score if there is one, otherwise the direct manager's. Only evaluations that the direct manager sent are calibrated.
- **Adjustment:** from −10 to +10 in half-point steps; **a written reason of at least 5 characters is required for any non-zero adjustment** (setting it back to zero clears the reason). Score after calibration = manager's score + adjustment, never below 0 and never above the cap of the stage, rounded to one decimal. It is allowed only in the calibration stage and only for the calibration key holder; every change is recorded in the audit (score before and after, without the reason text), and the employee sees the adjustment and its reason after notification.
- **Finishing calibration** needs every evaluation sent by its direct manager, and moves the cycle through the same step HR uses.
- **Approval** works only in the approval stage. It freezes the result of each employee (final score, level, breakdown, adjustment and reason) and notifies each one individually. The employee's own page carries no score before that notification; the answer itself omits it.
- **Objection window** (FR-123): five working days from the notification (Friday and Saturday are off). After the last day a new objection is refused.
- **One objection per employee,** on one item (a results criterion, a behaviour or the extra component), with a reason of at least 10 characters. States: with the approver, back with the manager, waiting for the revised evaluation to be approved, revised evaluation approved, rejected.
- **After an accepted objection** the direct manager redoes the evaluation, then the upper manager reviews, then the approver approves the revised evaluation; rejecting an objection needs a reason, and the approval becomes final.
- **The cycle cannot be closed while an objection is still open or being redone.**
- The approver is notified of a new objection, and the bar of the page tells the key holders when the calibration or approval deadline is near.
- The grade scale, the levels and the formula of the score are explained in the page «Evaluation cycle»: basic (results and behaviour by the weights of the stage) plus learning, initiatives and growth, up to the cap of the stage.

### Tips and common problems

- You cannot edit as HR: HR sees the page read only; the keys to calibrate and approve belong to one appointed person.
- «Could not save»: check that the calibration stage is on and the employee's manager has sent the evaluation.
- The adjustment is refused: it must be a multiple of 0.5 between −10 and +10 and have a reason.
