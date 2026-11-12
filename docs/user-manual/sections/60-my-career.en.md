## My career path

«Career path» is your own page. It shows the path of your job title in five sections, always in the same order: job description, performance evaluation, career development, learning plan and what is required of you. From here you also send proofs of the learning units you finished, follow your badges and your learning hours, ask for learning outside the plan, and (in the cycle) evaluate yourself. HR prepares the content once for each title; you read it and acknowledge it.

![My career path](../images/en/18-my-career.png)

### Who sees it

- View permission: `career_profile.view` (View my career path), scope: all (it only ever shows your own path).
- Default roles: the **Employee** role (given to everyone) and the head role of every unit hold it, together with the keys of your own path listed below.
- It does not need platform admin mode.
- The link «Career path» sits right under «Home» in the side menu. If HR has not set the path of your title as ready, you see the card «Your career path is not ready yet» instead of the content, and the link appears as soon as it is ready.

### What you can do

| Action | What happens | Permission key (label) |
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
