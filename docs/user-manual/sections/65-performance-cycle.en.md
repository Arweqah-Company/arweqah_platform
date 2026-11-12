## Evaluation cycle

«Evaluation cycle» is the HR page that runs the yearly performance evaluation. The fiscal year runs from April to March. HR uploads the evaluation file (the template of each of the five development stages, the grade scale and the fiscal-year card), checks that the cycle is ready, opens it, moves it from stage to stage by its dates, keeps the catalog of the extra component and the automatic reminders, and closes it at the end.

![Evaluation cycle](../images/en/23-performance-cycle.png)

### Who sees it

- View permission: `performance.cycle_view` (View the «evaluation cycle» page), scope: all.
- Default roles: none of the standard roles holds it except the **Administrator**; the platform manager gives it, with the keys below, to the HR role from the permissions page. Administrative permissions that wait for platform admin mode work only while the mode is on.
- Menu: the group «Career file», item «Evaluation cycle».
- Before the cycle opens the page is in view mode; employees see «The evaluation cycle has not been opened yet» in their own page.

### What you can do

| Action | What happens | Permission |
|---|---|---|
| Open the page and read the stages, dates and readiness | The stepper of the stages, the readiness card, the stage dates, the catalog, the reminders and the evaluation file | `performance.cycle_view` (View the «evaluation cycle» page) |
| Open the evaluation cycle and notify employees | Asks for the fiscal year, takes a snapshot of the templates and starts the self-evaluation stage | `performance.cycle_manage` (Open the evaluation cycle, move it on and change its dates) |
| Move the cycle to the next stage | The cycle moves on and never goes back | `performance.cycle_manage` (Open the evaluation cycle, move it on and change its dates) |
| Change a stage date (pencil icon) | Saves the new date or range, checks the order, records it in the audit and notifies the people affected | `performance.cycle_manage` (Open the evaluation cycle, move it on and change its dates) |
| Close the cycle | After a confirmation the cycle is closed for good; your name and time are saved | `performance.cycle_close` (Close the evaluation cycle) |
| Upload the evaluation file | Dialog to read a txt, docx or pdf file (or pasted text) and save the five stages, the scale and the card | `performance.template_upload` (Upload the evaluation file (stage templates, grade scale, fiscal card)) |
| Analyse the file with AI | Lets the AI place the parts of the file; you review before saving | `performance.template_ai` (Analyse the evaluation file with AI) |
| Edit, add or delete a part of the file | A form for each stage template, the grade scale and the fiscal-year card; delete a stage template | `performance.template_edit` (Add, change and remove the parts of the evaluation file (stages, grade scale, fiscal card)) |
| Export the evaluation file list | Downloads the list of the seven parts | `performance.template_export` (Export the list of the evaluation file) |
| Add or delete a catalog item | Items of the extra component for this year (initiatives, contribution to growth) | `performance.catalog_manage` (Manage the extra-component catalog) |
| Export the catalog | Downloads the catalog | `performance.catalog_export` (Export the extra-component catalog) |
| Add, change, switch on or off, delete a reminder | The automatic reminders of the cycle | `performance.reminders_manage` (Add, change and remove the automatic reminders of the evaluation cycle) |
| Export the reminders | Downloads the reminders | `performance.reminders_export` (Export the automatic reminders of the evaluation cycle) |

Buttons that cannot work now stay visible but dimmed, and a click explains why («The cycle has not been opened yet», «The cycle is closed»...).

### The stages of the cycle

Each stage is a button in the stepper; clicking it explains who works in it, what happens and the date, and takes you to its screen.

| Stage | Who works | What happens | Usual date |
|---|---|---|---|
| Self-evaluation | The employee | Rates their behaviours, writes their achievements, picks from the catalog; the manager is notified | Until 10 March |
| Manager's evaluation | The direct manager, then the upper manager | Reviews the self-evaluation and enters results and behaviour scores; indirect reports follow their direct manager's review | After the self-evaluation |
| Calibration | The holder of the calibration key | Compares scores between managers and adjusts with a written reason | 21 to 24 April |
| Approval | The holder of the approval key | Approves the results and decides on objections | 27 April |
| Individual notification | The system | Tells each employee their result, with an exportable copy | 30 April |
| Objection window | The employee and the approval holder | One reasoned objection on one item | Five working days |
| Closed | The system | The cycle is closed and results stay in the employee's record | — |

### How to

**Prepare and open the cycle**

1. Press «Upload the evaluation file». Choose a txt, docx or pdf file or paste the text, then press «Extract».
2. Read the table: for each of the five stages the basic split (results/behaviour), the shares of the criteria, the extra component and the cap, the behaviours and the state «Sound» or «Needs review»; and the shared parts (grade scale, fiscal-year card). Press «Save the evaluation of all stages» when everything is sound.
3. Look at «Readiness to open the cycle»: each stage, the grade scale and the fiscal-year card must read «Uploaded»; the catalog should have items; and someone should hold the calibration key and someone the approval key (a warning only).
4. Press «Open the evaluation cycle and notify employees», confirm the fiscal year (the next fiscal year is proposed) and press «Open the cycle».

**Change the date of a stage**

1. In «Stage dates» press the pencil of the row.
2. Fill «From (or a single day)» and, if it is a range, «To».
3. Press «Save the date». If the order is wrong the dialog says why (for example «The date is before the end of the stage ahead of it»).

**Move on and close the cycle**

1. Press «Move the cycle to the next stage» when a stage ends (stages never move by themselves: the dates only schedule the work and the reminders).
2. When the objections are decided, press «Close the cycle» and confirm.

**Add a reminder**

1. In «Automatic reminders» press «Add a reminder».
2. Choose the kind, the days, the title and text in Arabic (English is optional) and save.

### Fields (form inputs)

HR has eight forms here. The first four set up the evaluation file; the others run the cycle. Basic idea of the score, so the fields make sense: the **basic** score is the results score (0 to 100 per criterion, weighted by the criteria shares) times the **results weight**, plus the behaviour score times the **behaviour weight** (the weights are percentages, so the sum is divided by 100: scores 80 and 75 with weights 60 and 40 give 78); then the **extra component** (learning, internal initiatives, contribution to growth) is added up to its points; the final score never goes above the **cap** of the stage.

**Upload the evaluation file (dialog «Upload the performance evaluation file (all stages)»)**

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Evaluation file | One file that holds the five stages, then the grade scale and the fiscal-year card. Read in your browser | One of the two (file or text) | txt, docx or pdf |
| Text of the evaluation file | The same content pasted as text | One of the two (file or text) | Up to 200,000 characters |

«Extract» shows a table (basic split, criteria shares, extra and cap, behaviours, state «Sound» or «Needs review»). «Save the evaluation of all stages» is on only when every part is sound.

**Template of a stage (form «Template of stage n»; five stages, one for each development stage)**

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Name of the stage | The development stage this template is for (Foundation, Specialization, Mastery, Operational leadership, Institutional leadership) | Yes | 1 to 120 characters |
| Results weight | How much of the basic score the results are worth | Yes | 0 to 100 |
| Behaviour weight | How much of the basic score the behaviours are worth | Yes | 0 to 100. Basic = results weight + behaviour weight (shown; it is computed, not typed) |
| Evaluation rule (who evaluates) | The rule of the stage in words | No | Up to 600 characters |
| Component / Points (extra component) | A part added on top of the basic score (for example learning, initiatives, growth) and the most it can add | No | Name 1 to 120 characters, points 0 to 100, up to 10 components. Cap = basic + the points of the components (shown; computed) |
| Criterion / Share % (results criteria) | What the manager scores from 0 to 100, and how much each criterion weighs inside the results part | Yes, at least one | Name 1 to 160 characters; shares 0 to 100 and they must add up to 100 («Sum of the shares: n of 100»); up to 30 |
| What the results mean in this stage | An explanation shown to employees and managers | No | Up to 1,000 characters |
| Code / Behaviour / The evaluator's question (behaviours) | A behaviour rated from «Always» to «Never», with the question the evaluator answers | Yes, at least one; every behaviour needs its question | Code like B1.1, unique, up to 20 characters; name 1 to 160; question up to 600; up to 40 behaviours |

**Grade scale (form «Grade scale»)**

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Name of the level | A level of the final score (for example «Meets expectations») | Yes | 1 to 80 characters |
| From / To | The lowest and the highest final score of the level | Yes (the highest level has no «To», the lowest has no «From») | Numbers; the ranges must follow one another from the highest to the lowest without overlapping; two to ten levels |
| What it means | A sentence explaining the level | No | Up to 400 characters |

**Fiscal-year card (form «Fiscal-year card»)**

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Kind of each month (April to March) | Whether the month is a milestone or a month of daily follow-up | Yes, for the twelve months | «Milestone» or «Daily follow-up» |
| Month / Text of the note (notes) | A note about a month, shown on the card | No | Month up to 40 characters, text up to 600, up to 30 notes |

**Open the evaluation cycle (dialog «Open the evaluation cycle»)**

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Fiscal year | The fiscal year (April to March) the cycle is for. The next fiscal year is proposed | Yes | A four-digit year from 2020 to 2100; one cycle only for a year, and none while another is open |

**Change a stage date (dialog «Change a date»)**

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| From (or a single day) | The day the stage or event starts (or its only day) | Yes | A date. It may not be before the end of the stage ahead of it, nor past the start of the stage behind it |
| To (optional) | The last day, when it is a range | No | A date not before «From» |

The dates are: final result, the two calibration meetings, approval, individual notification, objection window, last day of self-evaluation, close of the qualitative part, and the four milestones.

**Add an item to the catalog (dialog «Add an item to the catalog»)**

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Kind | Which extra part the item belongs to | Yes | «Internal initiatives» or «Contribution to growth» |
| Item | What the employee can claim (for example a named initiative) | Yes | 3 to 160 characters |
| Points | How many points the item adds to the extra component when the manager accepts it | Yes | A whole number from 1 to 10. The total of each kind stops at its cap from the evaluation file |

**Add or change a reminder (dialog «Add a reminder»)**

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Kind | Who is reminded | Yes | «Employee: self-evaluation», «Manager: an evaluation waiting for them», «Milestones», «Calibration and approval holder» |
| Days before the last day (employee) | The days before the self-evaluation deadline on which the reminder goes (for example 7, 3, 1) | Yes for the employee kind | Comma separated, each 1 to 30, up to 10 days |
| Days before the date (milestones) | How many days before each milestone date | Yes for milestones | One number, 1 to 14 |
| Every (days) (manager; calibration and approval holder) | The reminder repeats every N days while the work waits | Yes for these kinds | One number, 1 to 14 |
| Title in Arabic / Text in Arabic | What the person reads | Yes | Title 3 to 120 characters, text 3 to 600 |
| Title in English / Text in English | The English version | No (when empty the Arabic is sent) | Title up to 120, text up to 600 |
| The reminder is on | Switches the reminder on or off | No | On or off; up to 30 reminders in all |

Closing the cycle and moving it to the next stage have a confirmation and no input.

### Workflow

The cycle is a machine (`performance.cycle`) with seven stages that move one way: **Self-evaluation, Manager's evaluation, Calibration, Approval, Individual notification, Objection window, Closed**. It has no timers: **a stage never changes by its date**. The dates schedule the work and the reminders; a person presses the button that moves it.

**Before the cycle: preparation (HR)**

1. Upload the evaluation file (`performance.template_upload`), review it, save it; fix parts by hand if needed (`performance.template_edit`).
2. Add the items of the catalog (`performance.catalog_manage`), prepare the dates and the reminders (`performance.cycle_manage`, `performance.reminders_manage`).
3. Check «Readiness to open the cycle» and that someone holds `performance.calibrate` and someone `performance.approve` (a warning only).

**The cycle step by step**

1. **Open (HR, `performance.cycle_manage`):** press «Open the evaluation cycle and notify employees», confirm the fiscal year. The system takes a snapshot of the templates, keeps the dates, creates an evaluation for every employee whose title has a stage template (someone who joins later gets theirs when they open their page) and **notifies each employee**.
2. **Self-evaluation (employees):** each employee rates, writes and sends; their direct manager is notified at the first send. The employee reminder goes on its days before the last day (usually 10 March) until they send.
3. **HR moves the cycle on** («Move the cycle to the next stage»): **managers are notified** that the manager's stage began.
4. **Manager's evaluation (managers):** the direct manager scores and sends; the upper manager is notified at that first send, then reviews, may change and sends. An indirect report cannot be evaluated before the direct manager sent. The manager reminder repeats every N days while evaluations wait.
5. **HR moves the cycle on to Calibration.** The holder of `performance.calibrate` compares the scores and adjusts by half points with a reason, then presses «Finish calibration and send it to approval» (refused while any evaluation has no sent manager score). That press moves the cycle to Approval by the same step HR uses.
6. **Approval (holder of `performance.approve`):** presses «Approve the results and tell everyone individually». The system **freezes** each final result, sets the last day of objections (five working days, Friday and Saturday off), moves the cycle to **Individual notification** and **notifies the employees**: results appear in their page for the first time.
7. **Individual notification and objection window:** employees read the result and may send one objection. HR may press «Move the cycle to the next stage» to open the **Objection window** stage (employees are notified); an objection is accepted in either stage until the last day. The approver decides each objection (see the page «Calibration and approval»).
8. **Close (HR, `performance.cycle_close`):** only when no objection is pending. Your name and the time are saved and employees and managers are notified. Evaluations can no longer change.

| Status / Stage | Meaning | Who can move it (permission key) | Moves to |
|---|---|---|---|
| Not opened | No cycle, or the last one closed | HR: `performance.cycle_manage` (needs a complete evaluation file) | Self-evaluation |
| Self-evaluation | Employees evaluate themselves | HR: `performance.cycle_manage`; employees write with `performance.self_evaluate` | Manager's evaluation |
| Manager's evaluation | Direct, then upper manager score | HR: `performance.cycle_manage`; managers write with `performance.team_evaluate` | Calibration |
| Calibration | Scores compared and adjusted | The calibration holder: `performance.calibrate` (finish); HR: `performance.cycle_manage` | Approval |
| Approval | Waiting for the approval of the results | The approval holder: `performance.approve` (approving moves it on); HR: `performance.cycle_manage` | Individual notification |
| Individual notification | Results are frozen and employees read them; objections open | HR: `performance.cycle_manage` | Objection window |
| Objection window | Objections are decided | HR: `performance.cycle_close` | Closed |
| Closed | Results stay in each employee's record (final) | — | — |

HR may close from any stage with `performance.cycle_close`, but never while an objection is pending.

**Automatic things**

- **Notices at each step:** the cycle opened (employees), manager's stage began (managers), individual notification began and objection window opened (employees), closed (employees and managers). A changed date of a running cycle notifies everyone the cycle evaluates and their direct managers. Calibration and approval start without a stage notice: the holders' reminder reaches them.
- **Reminders:** one daily job at 08:00 Riyadh time, never on Friday or Saturday, never twice in a day, only to people who still have the work, in-app and by e-mail, with the words HR wrote (no names, no course titles): the employee on each of its days before the self-evaluation deadline; the manager every N days in the manager's stage; the managers whose minutes of a milestone are missing, N days before the milestone date; the holders of the calibration key in the calibration stage and of the approval key in the approval stage, every N days. They stop when the cycle closes.
- **Frozen things:** the templates (a snapshot when the cycle opens) and each employee's result (at approval).
- **Audit:** opening, moving, closing, date changes, file uploads, reminder and catalog changes are recorded with who and when.

**What each person sees:** HR sees the whole page; an employee sees only their own evaluation and, only after the individual notification, their result; a manager sees their team in «Team evaluation»; the calibration and approval holder sees everyone on «Calibration and approval». No score is ever shown to an employee before approval and the individual notification. The pages «Calibration and approval» and «Team evaluation» describe the part each one owns.

### Business rules

- **HR opens the cycle** (FR-118), and a cycle cannot open before the evaluation file is complete: a template for each of the five stages, the grade scale and the fiscal-year card. Only one cycle can exist for a fiscal year.
- **The cycle takes a snapshot of the templates when it opens,** so a past year's evaluation does not change if the file changes later. A change to the file applies to the next cycles.
- **Dates can be prepared before the cycle opens.** They have usual values for the fiscal year (for example calibration 21 to 24 April, approval 27 April, individual notification 30 April, objection window 3 to 7 May, last self-evaluation day 10 March). The date check refuses a date before the end of the stage ahead of it, past the start of the stage behind it, or an end before the start.
- **A date change in a running cycle** is recorded in the audit and notifies everyone the cycle evaluates and their direct managers.
- **Four milestone dates** (short reviews in January and July, pulses in March and September) are edited in the same dates card.
- **The cycle moves one way:** stages never go back; a close is allowed from any stage.
- **Closing is refused while an objection is still under consideration.** After closing, evaluations cannot change and results stay in each employee's record.
- **Extra component:** «Learning» is automatic from the approved learning hours; «Internal initiatives» and «Contribution to growth» come from this year's catalog, each item with points (1 to 10), with a cap per kind taken from the evaluation file. An item name needs at least 3 characters. Deleting an item asks for confirmation because an employee may have picked it.
- **Evaluation file checks:** results + behaviour must make the basic total; the shares of the results criteria add up to 100; basic + extra make the cap; every stage has criteria and behaviours; every behaviour has a question for the evaluator and a code like B1.1; the grade scale has two to ten levels with clear ranges; the fiscal-year card has twelve months. A file with such a problem is not saved.
- **Grade scale:** exceptional from 110, exceeds expectations 95 to 109.9, meets expectations 80 to 94.9, needs improvement 65 to 79.9, below expectations under 65 (these are the file's values; HR can edit levels).
- **Reminders** arrive as an in-app notice and an e-mail, stop once the work is done, are never sent on Friday or Saturday and are sent by one daily job at 08:00 Riyadh time, never twice in a day. The employee's reminder is sent on the chosen days before the last day (1 to 30; for example 7, 3 and 1); the manager's every N days (1 to 14); milestones N days before their date (1 to 14); the calibration and approval holders every N days (1 to 14). Up to 30 reminders.
- **AI reading of the file:** only by pressing the button, only with an AI service on in the settings, up to 6 per hour per person; you review the result and the texts not found word for word in the file are listed.
- **Audit:** opening, moving, closing, date changes, file uploads and reminder changes are recorded.

### Tips and common problems

- «The cycle cannot open before the evaluation file is uploaded»: read the readiness card to see what is missing.
- «A cycle for this year exists already»: choose the right fiscal year.
- Warning «nobody could calibrate or approve»: ask the platform manager to give one person the calibration and approval keys.
- The action failed: the stage may have changed meanwhile; reload the page.
