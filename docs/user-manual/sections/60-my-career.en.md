## My career path

«Career path» is your own page. It shows the path of your job title in five sections, always in the same order: job description, performance evaluation, career development, learning plan and what is required of you. From here you also send proofs of the learning units you finished, follow your badges and your learning hours, ask for learning outside the plan, and (in the cycle) evaluate yourself. HR prepares the content once for each title; you read it and acknowledge it.

![My career path](../images/en/18-my-career.png)

### Who sees it

- View permission: `career_profile.view` (View my career path), scope: all (it only ever shows your own path).
- Default roles: the **Employee** role (given to everyone) and the head role of every unit hold it, together with the keys of your own path listed below.
- It does not need platform admin mode.
- The link «Career path» sits right under «Home» in the side menu. If HR has not set the path of your title as ready, you see the card «Your career path is not ready yet» instead of the content, and the link appears as soon as it is ready.

### What you can do

| Action | What happens | Permission |
|---|---|---|
| Open the page and read the five sections | Shows the path of your title, your progress cards and your acknowledgement | `career_profile.view` (View my career path) |
| Acknowledge the path | Records your acknowledgement with your name, the content version and the date | `career_acknowledge.create` (Acknowledge my career path) |
| Export the learning units | Downloads the table of units of your learning plan (scope, columns, file type) | `career_learning.export` (Export the learning units of my path) |
| Send a proof / Send again | Opens the proof dialog for a unit and sends it for approval | `career_learning.upload` (Send a proof for a learning unit) |
| Tick «Done» on a required item | Marks the item as done in the «Required» section | `career_required.tick` (Mark a required item as done) |
| Request learning outside the plan | Opens the learning request dialog (see the page «Development requests») | `career_requests.create` (Send a development request) |
| Self-evaluation, my result, objection and milestones | Appear in the evaluation section when a cycle is open (see the pages of the evaluation cycle and the team evaluation) | `performance.self_evaluate` (My self-evaluation in the evaluation cycle), `performance.object` (Object to the result of my evaluation), `performance.export` (Export a copy of my evaluation result), `performance.milestone_ack` (Acknowledge reading the minutes of my milestone) |

### The page at a glance

- **Identity card:** your name, your job title, your unit, your direct manager, the title code split into badges (sector, department, section, unit) and your **development stage** (Foundation, Specialization, Mastery, Operational leadership, Institutional leadership), which comes from your grade and track.
- **Header badge:** «You acknowledged content version N».
- **Progress cards:** learning units done («X of Y»), hours done with the next medal, the budget spent against the cap of your stage, and the core competencies of your level that are met.
- **Five sections:** job description (summary, performance indicators, the governing indicator and responsibilities with their tasks) · performance evaluation · career development (career ladder, level path, technical competencies) · learning plan (learning units, badges, my requests) · required (items with dates, then the acknowledgement text). The learning plan tab shows a counter of done units and «Required» shows a red counter of late items.
- **Career ladder:** a rising staircase with the mark «You are here» and the next level; below it the condition to move up.
- **Level path:** the steps of the level, each with its kind of proof (course, certificate or applied at work) and its state.
- **Technical competencies:** a table of competencies against levels («Basic», «Expert» or «—» when the level does not ask for it) with a column «My level».

### How to

**Read and acknowledge the path (first sign-in, new title, or reopened by HR)**

1. Sign in. A full screen shows only your path, with the reason: «This is your first sign-in», «Your job title has changed» or «HR reopened the acknowledgement». Sign out is always available.
2. Read the first section. The button «Next: <section>» stays off until you scroll to the end of the section; a short section counts as read at once.
3. Press «Next» for each of the five sections in order. A section not yet reached is locked, and «Previous» takes you back to a section you read.
4. At the sixth step, «Acknowledgement», tick the box in the bar at the bottom (it stays off until you reach this step) and press «Acknowledge and continue».
5. You get the message «Acknowledged. You can keep using the platform.» and the platform opens.

**Send a proof for a learning unit**

1. Open «Learning plan», then «Learning units», and find the unit.
2. Press the upload icon on the row («Send a proof»), or «Send again» if it was rejected.
3. Choose the kind of proof: **Certificate** (a PDF or image, up to 10 MB), **Applied at work** (your direct manager approves it after you describe what you applied) or **Written output** (a summary or report you produced).
4. Attach the file (a certificate without a file is refused: «Attach the certificate file first»), add an optional note for the reviewer and press «Send for approval».
5. The state of the unit becomes «Waiting for approval». The hours count only after approval.

**Follow your badges and hours**

1. Open «Learning plan», then «Badges».
2. Each badge shows its threshold in hours, your progress bar and whether you reached it; the card on top shows the next medal and how many hours are missing.

**Mark a required item as done**

1. Open «Required».
2. Tick «Done» on the item. Items with a date show «Overdue», «In N days» (orange within 30 days) or «While you are in the period».

### Fields (form inputs)

The page has five forms: the acknowledgement, the proof of a learning unit, the learning request, the self-evaluation and the objection. The tick on a required item is a single box.

**Acknowledgement (the last step, in the bar at the bottom)**

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| «I have read my career path and acknowledge it» (tick box) | Your statement that you went through the five sections of your path | Yes, to continue | Off until you reach the sixth step. It is recorded with your name, the content version you read and the date. The button is «Acknowledge and continue» |

**Send a proof of completion (dialog opened from a learning unit)**

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Kind of proof | How you show that you finished the unit. It decides who reviews it | Yes (the first one, «Certificate», is chosen at the start) | «Certificate» (the certificate file), «Applied at work» (your direct manager approves it after you describe what you applied) or «Written output» (a summary or report you produced from the learning) |
| Choose the proof file | The evidence itself, dropped in the box or picked with a click | Yes for a «Certificate» («Attach the certificate file first»); optional for the other two | One file, PDF, PNG or JPEG, up to 10 MB |
| Note for the reviewer (optional) | A few words that help the reviewer (for «Applied at work» say what you applied and where) | No | Up to 500 characters |

The hours of the unit (its minutes in the plan) are not typed: they come from the unit and count toward your hours, your badges and the «Learning» part of your evaluation only after approval.

**Learning request (the button «Request learning outside the plan»)**

The dialog «Learning request» has four fields: «Course name», «Cost in riyals», «Is the course in your learning plan?» and «Retention agreement for funded training». Each one is explained in the table of the page «Development requests».

**Mark a required item as done**

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| «Done» (tick box on an item of «Required») | Your own statement that you did what the item asks | No | Tick or untick; saved at once. An item with a past date and no tick counts as late |

**Self-evaluation (the button «Start the self-evaluation», in the evaluation section while the cycle is in its first stage)**

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| My rating (one for each behaviour of your stage) | How often you showed the behaviour, on the same scale your manager uses. It is the employee's own view and gives your manager a starting point | Yes to send (a draft may keep it empty) | «Always» (100), «Often» (75), «Sometimes» (50), «Rarely» (25), «Never» (0) |
| Note (one for each behaviour) | The reason for your rating, with an example | Yes at «Always», «Rarely» and «Never»; optional at the other levels | At least 5 characters when required, up to 500 |
| My achievements for each results criterion (no score) | What you achieved against the criterion and the evidence. You give no score: only the manager scores the results | No | Up to 1,000 characters for each criterion |
| Internal initiatives (tick the items of this year's catalog) | The internal initiatives you took part in. Each item has points (1 to 10) | No | Only items of the catalog of the open cycle and of the right kind; up to 30 |
| Contribution to growth (tick the items of this year's catalog) | The ways you contributed to growth. Each item has points (1 to 10) | No | Same as above |
| Learning (not typed) | Calculated by the system from your approved learning hours against the hours of your stage | — | Automatic |

What the self-evaluation does: it carries **no score of its own** and does not bind your manager. Your manager reads it before the evaluation; the manager's scores, with the extra component the manager accepts, make the final grade.

**Objection to the evaluation result (the button «Object to a criterion or behaviour», after the individual notification)**

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Item | The one part of the result you disagree with | Yes | A results criterion, a behaviour, or one of the three parts of the extra component (Learning, Initiatives, Growth) |
| Reason for the objection | Why you think the item is wrong, with the facts | Yes | From 10 to 1,000 characters |

You have **one objection** in all, and only within five working days of the notification.

### Workflow

**1. Acknowledging the path**

1. HR sets the path of your title «Ready», or you sign in for the first time, or your title changes, or HR reopens the acknowledgement. The platform is held back and shows only your path.
2. You read the five sections in order, using «Next» after scrolling to the end of each.
3. At the sixth step you tick the box and press «Acknowledge and continue».
4. The acknowledgement is saved with your name, the content version and the date. The platform opens.

| Status | Meaning | Who can move it (permission key) | Moves to |
|---|---|---|---|
| Pending | You have no acknowledgement of the title you hold now, or HR reopened it | HR: `career_acknowledge.reopen` (reopen); the system (first sign-in, change of title) | Acknowledged |
| Acknowledged | The version you read is recorded | You: `career_acknowledge.create` | Pending again when your title changes or HR reopens it |

**2. A proof of a learning unit (your side)**

1. You press «Send a proof» on the unit, choose the kind, attach the file and press «Send for approval».
2. The unit shows «Waiting for approval» (certificate or written output), or «With the direct manager» (applied at work). The system sends no notice at this step: the proof appears in the queue of the person who decides.
3. The reviewer (or your direct manager) approves it, rejects it with a reason, or refers it to your direct manager. You are told of the decision, and you see the reason on the unit if it was rejected.
4. If it was rejected, you press «Send again» and the cycle repeats. After the third rejection of the same unit your direct manager is told.
5. When it is approved, the hours count for you at once.

| Status | Meaning | Who can move it (permission key) | Moves to |
|---|---|---|---|
| Not started | You have not sent a proof for the unit | You: `career_learning.upload` | Waiting for approval, or With the direct manager for «Applied at work» |
| Waiting for approval | With the reviewer of certificates | Reviewer: `career_certificates.approve`, `career_certificates.reject`, `career_certificates.refer` | Done, Rejected or With the direct manager |
| With the direct manager | A work application, or a proof the reviewer referred | Your direct manager: `career_team.decide` (the reviewer may also decide it) | Done or Rejected |
| Done | Approved: its hours count (final) | — | — |
| Rejected | Refused with a reason | You: `career_learning.upload` («Send again») | Waiting for approval, or With the direct manager |

See the pages «Certificate review» and «My career team» for the other side.

**3. A learning request outside the plan**

1. You fill the dialog and send it; the dialog shows who will decide and why, and what is left of your yearly budget.
2. The approver (direct manager, sector head or CEO, by cost) is told and decides: approve or reject with a reason.
3. You are told of the decision. Full steps and statuses are in the page «Development requests».

**4. Self-evaluation and result (one yearly cycle)**

1. HR opens the evaluation cycle: you are told, and «Start the self-evaluation» appears.
2. You rate your behaviours, write your achievements, pick from the catalog and press «Send my self-evaluation». Before that you may press «Save a draft». Your direct manager is told when you send it for the first time.
3. You can press «Change my self-evaluation» until your manager starts (the first stage, or the manager's stage before the manager's first save).
4. After your manager, the upper manager and the calibration, the result is approved and you are told individually: your result appears under «My result», with a printable copy.
5. If you disagree, you raise your one objection within five working days. The decision of the approver reaches you as a notice.

| Status | Meaning | Who can move it (permission key) | Moves to |
|---|---|---|---|
| Not started | Cycle open, nothing saved | You: `performance.self_evaluate` | Draft or Sent |
| Draft | A half-filled form that was not sent | You: `performance.self_evaluate` | Sent |
| Sent | Your manager was told and reviews it; you may still change it until the manager starts | You: `performance.self_evaluate` | Read only from the calibration stage on |
| Result shown | After the approval and the individual notification, within the objection window | The approval holder: `performance.approve`; you may object with `performance.object` | An objection decided (see the page «Calibration and approval») |

The whole cycle, with its stages and dates, is described in the page «Evaluation cycle».

**Automatic things**

- **Reminders:** a notice every Sunday at 08:00 (Riyadh time) when you have dated required items that are late, and the evaluation reminders HR configured (see «Evaluation cycle»).
- **Notices to you:** a proof approved or rejected (with the reason), a development request approved, rejected or moved up, the cycle opened, a date of the cycle changed, minutes of a milestone recorded, your result, the decision on your objection.
- **Audit:** proofs sent and decided, acknowledgements, self-evaluation sent or changed, objection raised are recorded.

**What each person sees:** you see only your own path, proofs, requests and evaluation; your direct manager sees your progress and proofs in «My career team» and your evaluation in «Team evaluation»; reviewers and HR see what their pages and permissions reach.

### Business rules

- **Acknowledgement is required** when you have not acknowledged the title you hold now (first sign-in, or your title changed since your last acknowledgement) or when HR reopened it after your last acknowledgement (FR-112).
- **While the acknowledgement is pending, the rest of the platform is locked:** every link in the side menu is disabled with the tooltip «read and acknowledge first», and a notice at the top says why. Only your path, sign-out and the account menu stay available.
- **You must read before you acknowledge:** the five sections are read in order; «Next» works only after scrolling to the end of the section; the acknowledgement box is off until the sixth step. Scrolling guarantees that you passed through the page, not that you read it. If the content changes while you read, the page asks you to reload and read the new version.
- A session where an administrator signs in as you is never held back and cannot acknowledge for you.
- The acknowledgement is recorded with your name, the content version and the date. When HR changes the content, its version goes up.
- **The content comes from the title, not from you:** you cannot edit it. The path is shown only when HR set it «Ready».
- **Learning units count once:** a unit approved stays yours if you move to a title that includes it. **Hours count only after approval** (FR-114).
- **A proof is one record per unit:** a proof waiting or approved is not replaced; a rejected proof is replaced by a new one («Send again»), and the page shows the reason of the rejection. After the third rejection of the same unit your direct manager is told.
- **Applied at work** goes first to your direct manager and its decision is final.
- **Badges** have thresholds in hours set by HR in the title; a badge is reached when your approved hours reach its threshold.
- **Learning outside the plan** is approved by cost: direct manager, sector head, then the CEO (see the page «Development requests»).
- A reminder is sent to you when you have dated required items that are late.
- The evaluation section explains that evaluation belongs to your development stage, not to the title; weights, criteria and grade scale show when a cycle opens. Scores are never shown before the individual notification after approval (FR-119).
- The lists on the page (learning units, my requests) have search and filters (priority, language, state), the table / cards switch and export.

### Tips and common problems

- «Next» does not work: scroll to the very end of the section; if the section has sub-tabs, a hint lists the tabs you still have to open.
- The box of the acknowledgement is off: you have not reached the sixth step yet.
- «Your career path is not ready yet»: HR has not set the path of your title as ready. Ask HR.
- A unit shows «No link yet»: HR has not added the learning link for it yet.
- The proof was not sent: check that a certificate has its file, and that the type is PDF, PNG or JPEG up to 10 MB.
