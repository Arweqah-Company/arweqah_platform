## Evaluation cycle

«Evaluation cycle» is the HR page that runs the yearly performance evaluation. The fiscal year runs from April to March. HR uploads the evaluation file (the template of each of the five development stages, the grade scale and the fiscal-year card), checks that the cycle is ready, opens it, moves it from stage to stage by its dates, keeps the catalog of the extra component and the automatic reminders, and closes it at the end.

![Evaluation cycle](../images/en/23-performance-cycle.png)

### Who sees it

- View permission: `performance.cycle_view` (View the «evaluation cycle» page), scope: all.
- Default roles: none of the standard roles holds it except the **Administrator**; the platform manager gives it, with the keys below, to the HR role from the permissions page. Administrative permissions that wait for platform admin mode work only while the mode is on.
- Menu: the group «Career file», item «Evaluation cycle».
- Before the cycle opens the page is in view mode; employees see «The evaluation cycle has not been opened yet» in their own page.

### What you can do

| Action | What happens | Permission key (label) |
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

1. Press «Move the cycle to the next stage» when a stage ends (the cycle also follows the dates).
2. When the objections are decided, press «Close the cycle» and confirm.

**Add a reminder**

1. In «Automatic reminders» press «Add a reminder».
2. Choose the kind, the days, the title and text in Arabic (English is optional) and save.

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
