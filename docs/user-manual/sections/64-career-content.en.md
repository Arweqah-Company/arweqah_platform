## Career-path content

«Career-path content» is the HR page that prepares the career path of each job title. The job titles are listed with the state of each one's path. For a title you upload its **title file** (one file with the job description, the career development, the learning plan and the required items), review what the system read from it, fix details by hand, then set the path **Ready** so that the people holding the title see it and are asked to acknowledge it. The page also reopens the acknowledgement, imports the learning links from an Excel file and exports the list.

![Career-path content](../images/en/22-career-content.png)

### Who sees it

- View permission: `career_content.view` (View the career-path content), scope: all.
- Default roles: none of the standard roles holds it except the **Administrator**. The platform manager gives it, with the keys below, to the HR role from the permissions page. Administrative permissions that wait for platform admin mode work only while the mode is on.
- Menu: the group «Career file», item «Career-path content». The Employee role does not see it.

### What you can do

| Action | What happens | Permission |
|---|---|---|
| Open the page, search and filter | The titles as a column of buttons (name, code, state); search by title or code; filters on unit, grade, track and path state | `career_content.view` (View the career-path content) |
| Edit a path by hand | The workspace of the title (seven tabs): description, ladder and path, technical competencies, learning plan, required, evaluation, shared lists; «Save changes» raises the content version. Without the edit key the workspace is read only | `career_content.edit` (Edit the career-path content of a job title) |
| Preview the path (eye icon) | Shows the path as the holders of the title see it, without a name, progress or acknowledgement | `career_titlefile.preview` (Preview a career path as the employee sees it) |
| Upload the title file | Opens the dialog «Upload the title file»: choose a txt, docx or pdf file or paste its text, press «Extract», review, then «Save the extracted content» | `career_titlefile.upload` (Upload a title file and read the career path from it) |
| Analyse with AI | Offers the AI to place the parts of a file the fixed reader could not | `career_titlefile.ai` (Analyse a title file with AI) |
| Set the path ready / Set back to draft | Shows the path to the holders (and asks them to acknowledge), or hides it again | `career_titlefile.publish` (Set a career path ready or back to draft) |
| Reopen the acknowledgement for its holders | Asks every holder of the title to acknowledge the path again, with a reason | `career_acknowledge.reopen` (Reopen the acknowledgement of a career path for a title's holders) |
| Import learning links | Imports an Excel file of learning links (title code, period, unit, link) | `career_content.import` (Import learning-unit links from a file) |
| Export the list | Downloads the list of titles and the state of their paths | `career_content.export` (Export the list of titles and the state of their paths) |

### How to

**Build the path of a title from its file**

1. Open **Career-path content** and click the title in the list. The panel shows its name, code, content version and state.
2. Press «Upload the title file». Choose a txt, docx or pdf file (it is read in your browser) or paste the text (up to 200,000 characters).
3. Press «Extract». The table shows each part (job description, career development, learning plan, required) as «Sound» or «Needs review», with counts (indicators, responsibilities, ladder levels, learning units, learning minutes...) and the reader's notes; text that is not content (such as «Next», «Back», «Print») is skipped and listed.
4. If everything is sound, press «Save the extracted content». The content version goes up. Saving stays off while any part needs review.
5. If the reader could not place the parts, use «Analyse with AI» (see the rules), review the result in the same table, then save.

**Set the path ready for its holders**

1. Open the title. The panel lists what is missing, or says «Every part is complete: the path can be set ready».
2. Press «Set the path ready». The window says how many holders will see it and be asked to acknowledge.
3. Confirm. The holders see the path and read it on their next sign-in.
4. To hide it, press «Set the path back to draft»: nothing the people acknowledged is deleted.

**Reopen the acknowledgement**

1. Open the title and press «Reopen the acknowledgement for its holders (N)».
2. Write a reason (at least 5 characters) and press «Confirm».
3. The holders must acknowledge again when they sign in, and cannot use the platform before.

**Import learning links**

1. In the page header press the import button and choose the Excel file (download the template first; it has the columns «Title code», «Period», «Unit name», «Link»).
2. Review the preview: how many units will get a new link and how many stay as they are; each refused row shows its number and its reason.
3. Confirm. The content version of the titles changed goes up.

### Fields (form inputs)

HR has four forms here: the title file, the workspace of a title (five editors), the reopening of the acknowledgement and the import of learning links. Texts of the path are written once, in the language of the title file (Arabic).

**Upload the title file (dialog «Upload the title file: <title>»)**

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Choose the title file | The one file that holds the job description, the career development, the learning plan and the required items of the title. It is read in your browser | One of the two (file or text) | txt, docx or pdf |
| Or paste the text of the file | The same content as text, when the file cannot be read | One of the two (file or text) | Up to 200,000 characters |

Then «Extract» reads it, the table shows each part as «Sound» or «Needs review», and «Save the extracted content» saves only when every part is sound. «Analyse with AI» is an extra button (see the rules).

**Workspace of a title, tab «Job description»**

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Job summary | A short paragraph of what the job is for | Yes to set ready | Up to 2,000 characters |
| Indicator (job performance indicators) | One measure the job is judged by | At least one to set ready | Up to 300 characters each, up to 30 |
| Governing indicator (tick) | Marks the indicator that governs the job | No | One tick for the indicator that governs |
| Responsibility | A duty of the job | At least one to set ready | Up to 200 characters, up to 40 responsibilities |
| Its tasks | The tasks of that responsibility | No | One per line, up to 400 characters each, up to 30 |

**Tab «Ladder and path»**

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Level (a step of the career ladder) | The grade of the step | Yes for each step | L1 to L9, up to 9 steps |
| Title (of the step) | The job title at that level | Yes | Up to 120 characters |
| Current title (radio) | Marks where the holders of this title stand on the ladder (shown as «You are here») | One step marked | One only |
| Condition to move up | What the employee must do to go to the next level | Yes to set ready | Up to 600 characters |
| Unit / Title (of the path) | The unit and title the level path belongs to | No | Up to 200 characters each |
| Step n: heading, Content, Kind of proof | The steps of the level path: each with a heading, what it asks and the kind of proof (course, certificate or applied at work) | Yes for each step | Up to 9 steps; heading up to 80, content and kind of proof up to 300 characters |
| Documented output of this level / Certificates at the end of the level | What the level should produce and which certificates it ends with | No | Up to 600 characters each |

**Tab «Technical competencies»**

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Column n name (Competency levels) | The levels at which competencies are asked (for example «L9 Recruitment coordinator»). The first column is the current level and is what «My level» is compared with | Yes for each column | Up to 12 columns, up to 40 characters each |
| Competency | A technical competency of the title | Yes | Up to 120 characters, up to 60 |
| Value at each column | What the competency asks at that level | Yes (starts «—») | «Basic», «Expert», «Not required» or «—» (stored in the words of the file) |

**Tab «Learning plan»**

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Period name | A year or period of the plan | Yes | Up to 80 characters, not repeated, up to 10 periods |
| Priority | How important the unit is | Yes | The file's words: إلزامي (mandatory), ضروري (necessary), أساسي (basic) |
| Unit | The name of the course or unit | Yes | Up to 300 characters, up to 60 units a period |
| Provider | Who gives it | No | Up to 300 characters |
| Duration | How long it is, as written; it is turned into minutes and shown under the field. These minutes become the hours the employee earns | Yes | Up to 60 characters; a duration nobody understands is refused («The duration is not understood») |
| Language | The language of the unit | Yes | The file's words: عربي (Arabic), إنجليزي (English) |
| Link | Where the employee opens the unit | No | Empty, or a link starting with `https://` (up to 500 characters) |
| Badge name / Its condition / Hours | A medal: its name, its condition and the approved hours that earn it | Yes (at least one badge to set ready) | Name up to 120, condition up to 300, hours 1 to 2,000, up to 8 badges |
| How the badge is awarded | The rule of the badges in words | No | Up to 1,000 characters |

**Tab «Required»**

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| When | The period the item belongs to (for example «Before 10 March») | Yes | Up to 160 characters, up to 30 items |
| Item text | What the employee must do | Yes (at least one line) | One per line, up to 400 characters each, up to 10 lines |
| Last day | The date after which the item is late | No | A date; empty means «While you are in the period» |
| Acknowledgement text | The sentence the employee agrees to when acknowledging | Yes to set ready | Up to 500 characters |

The tabs «Evaluation» and «Shared lists» hold no input here: the evaluation belongs to the evaluation cycle page.

**Reopen the acknowledgement (dialog «Reopen the acknowledgement»)**

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Reason | Why the holders must acknowledge again (it is kept in the audit) | Yes | From 5 to 300 characters. Possible only for a path that is «Ready» |

**Import learning links (the import button of the page)**

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Title code | The code of the title, as in the list (for example OPS.01.01.01-L9P-01) | Yes | Up to 40 characters |
| Period | The name of the period in the learning plan | Yes | Up to 80 characters |
| Unit name | The name of the unit in that period | Yes | Up to 300 characters |
| Link | The https address the employee opens | No | `https://` address up to 500 characters; empty clears the link |

The file is an Excel sheet (download the template first), up to 1,000 rows. A first review shows how many units get a new link and the reason of every refused row; nothing changes until you confirm.

**Search and filters of the list:** search by title or code; filters on unit, grade, track and path state.

### Workflow

The content of a title lives in two states, **Draft** and **Ready**, and a version number that grows at every save.

1. HR opens the title in the list and presses «Upload the title file».
2. The file is read: «Extract» fills the review table. Nothing is saved yet. If a part «Needs review», fix it (or press «Analyse with AI», then review) and extract again.
3. HR presses «Save the extracted content»: the content is saved (a path that was never set ready stays a **draft**; one already ready stays ready) and the version goes up. Any detail can then be edited by hand in the workspace and saved with «Save changes» (the version goes up again).
4. When the panel says «Every part is complete: the path can be set ready», HR presses «Set the path ready» and confirms the number of holders.
5. The holders see the path on their next sign-in and must acknowledge it (see «My career path»). HR may press «Preview» at any time to see it as they will.
6. When the content changes later, or HR needs everyone to read it again, HR presses «Reopen the acknowledgement for its holders» with a reason.
7. To hide the path, HR presses «Set the path back to draft»: nothing the people acknowledged is deleted.

| Status | Meaning | Who can move it (permission key) | Moves to |
|---|---|---|---|
| Draft (or no content) | Saved or empty; the holders do not see it | HR: `career_titlefile.upload`, `career_content.edit` (save), `career_titlefile.publish` | Ready (when complete) |
| Ready | The holders see it and acknowledge it | HR: `career_titlefile.publish` (back to draft); `career_content.edit` keeps it ready and raises the version | Draft |
| Acknowledgement reopened | Holders must acknowledge again at their next sign-in | HR: `career_acknowledge.reopen` | The holders acknowledge (`career_acknowledge.create`) |

**Automatic things**

- **No notice is sent** when a path is set ready or the acknowledgement is reopened: the holders meet it at their next sign-in (the platform is held back until they acknowledge).
- **Versions:** every save raises the content version; an acknowledgement records the version read; a save on a stale version is refused.
- **Audit:** uploads, AI analyses (without the text of the file), saves, ready and draft changes and reopenings are recorded with who and when.

**What each person sees:** HR (with `career_content.view`) sees every title and its state; the holders of a title see only their own path, and only when it is Ready; an employee never sees this page.

### Business rules

- **One file per title:** description, development, learning plan and required items; the performance evaluation is not in this file because it belongs to the development stage and is uploaded once from the evaluation cycle page (FR-113).
- **Nothing is saved before you review it,** and a file with a part that needs review is not saved. The checks include: missing summary, indicators or responsibilities; a ladder without a marked current title; missing level-path steps, condition to move up, competencies, learning units, badges or required items or acknowledgement text; a learning period whose total does not match its units; a title code in the file that is not this title's code; and text over a limit or a duration nobody can read.
- **A path can be set ready only when it is complete** (description, development, learning plan with at least one unit and one badge, required items and the acknowledgement text). A draft may be saved incomplete, but never with a link that does not start with `https://` or a period without a name.
- **Ready or draft:** the holders of a title see the path only when it is ready; back to draft hides it without deleting what they acknowledged.
- **Content versions:** every save raises the version, and the acknowledgement of an employee records the version. If someone else changed the content after you opened it, your save is refused («Close the window, open it again and redo your edit»).
- **AI reading (FR-126, FR-127):** the fixed reader always comes first and is free. The button «Analyse with AI» shows only when an AI service is switched on in the settings and you hold the AI key. Nothing is sent unless you press it, and the text of the file (company data, not employees' data) goes to that service. You review the result before anything is saved; texts that are not in the file word for word are listed to be checked. Durations and dates are always computed by the system. Up to 6 analyses per hour per person.
- **Reopening needs a reason** and is recorded in the audit log.
- **Learning links** must start with `https://`; an empty link clears it. A row is refused when the title code or the period or the unit is not found, the unit name is repeated in the period, or the row repeats a unit already named above.
- Audit: uploads, AI analyses (without the text of the file), saves, ready and draft changes and reopenings are recorded.

### Tips and common problems

- «Save» is off: extract the file first, or fix the parts listed under «Parts that need review».
- «The text could not be read»: try pasting the text of the file.
- The path cannot be set ready: the panel names the missing parts.
- You see the workspace but cannot edit it: you do not hold `career_content.edit`.
