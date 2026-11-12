## Job titles

The «Job titles» page gathers every job title of the group in one list with its code, grade, track and headcount. Click a title to open its «card»: the code broken into its parts, the development stage, the duties, qualifications and indicators, the holders in each company, and the «Who is the direct manager?» chain.

![Job titles](../images/en/05-job-titles.png)

### Who sees it

- View key: `job_titles.view` («View the job titles page and their cards»). Scope: all.
- The page is not part of the default «Employee» role or of the unit head role; it is given to a role from the roles or permissions page (for example HR and the System Admin).
- You see the titles of the units whose structure you see (the same rule as the structure page); holders of «See the whole structure» see all. The headcount is counted for your company, and for every company in the full view.
- The add, edit and delete buttons show in «platform admin mode» and for whoever holds each button's key. Export and import have their own keys.

### What you can do

| Action | What happens | Key (label on the permissions page) |
|---|---|---|
| Open the card (click the row or name) | Shows the title card | `job_titles.view` |
| Search and filters | Search by name or code; filters: sector, department, section, grade, track, vacancy | `job_titles.view` |
| Table / cards switch | Changes how the list is drawn | `job_titles.view` |
| Add title | Chooses the unit, then the name, grade, track and the title it reports to | `job_titles.create` (Add a job title) |
| Edit | Changes the name and the reporting title, and sets grade and track once | `job_titles.update` (Edit a job title) |
| Edit the content | Writes duties, qualifications and indicators | `org.titles_edit_content` (Edit the content of a job title) |
| Delete | Deletes a title nobody holds | `job_titles.delete` (Delete a job title) |
| Export | Downloads the titles of the current search and filters | `job_titles.export` (Export job titles) |
| Import | Adds or updates titles from a file | `job_titles.import` (Import job titles from a file) |

### How to

#### Add a title

1. Switch platform admin mode on and press «Add title».
2. Choose the unit (only units that accept titles are listed), then «Next».
3. Write the Arabic and English names, choose the grade (L1 to L9), the track (Management, Professional, Projects, Consulting, Support) and, optionally, the title it reports to. You may add more than one title to the unit in the same dialog, and choose which role the permissions are copied from (default: the «Employee» role).
4. Save. The title code is built and a role named after the title is made.

#### Read a title card

1. Click the title's row.
2. «Meaning of the code» breaks the code into sector, department, section and unit, then the grade and track, then the sequence.
3. «Who is the direct manager?»: choose the employee's company (among the companies that have holders of the title) and the chain from the title upward appears.

#### Import titles

1. Press «Import» and download the template: title code (empty for a new title), unit code, the two names, grade, track, reporting-title code, and the duties, qualifications and indicators in Arabic and English (one item per line).
2. Fill the file and upload it, then read the preview: «New titles / Updated / Unchanged» and the rejected rows with their reasons.
3. Confirm the import (limit 1000 rows).

### Fields (form inputs)

A star (*) on screen marks a required field.

#### Add a title

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Unit | The unit the title belongs to; its code starts the title's code and its employees hold the title in it | Yes (first step, then «Next») | Only units whose type accepts titles (never a sector) |
| Arabic name | The title as shown in Arabic; the role made for the title is named after it | Yes | 2 to 120 characters |
| English name | The title in English; follows the Arabic as you type | Yes | 2 to 120 characters |
| Grade | The level of the title, L1 to L9; it is part of the code and gives the development stage | Yes | L1 to L9. Set once, then locked |
| Track | The career track, also part of the code | Yes | Management, Professional, Projects, Consulting, Support. Set once, then locked |
| Reports to | The higher title this one reports to; it is how an employee's direct manager is found | No | Search by name or code. Never itself, and never a loop |
| Copy permissions from a role | The title's role starts with this role's permissions (edited later on the roles page); shown to who may choose it | No | A role you could hand out; default: the «Employee» role |

You may add several titles in one dialog with «Add a title» (up to 50); the last row cannot be removed.

#### Edit the title

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Arabic name, English name | The title's names | Yes | 2 to 120 characters each |
| Grade, Track | Shown only for an older title that has no code yet: choose both once to build the code | Both or none | L1 to L9 and a track; locked once chosen |
| Reports to | Changes the reporting line | No | A title other than itself; no loops; «No reporting line» clears it |
| Active title | Untick to stop using the title | No | A tick. The last active title of a unit that accepts employees cannot be stopped |

#### Edit the content (title card)

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Responsibilities, Qualifications, Performance indicators | The duties, the required qualifications and the indicators the person is measured by, in Arabic and in English; one item per line | No | Up to 30 items of up to 400 characters per language. Every save raises the content version |

#### Import titles

| Column | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Title code | The title to update; empty for a new one (built from unit, grade and track) | No | Like OPS.03.03.01-L7P-01 |
| Unit code | The unit a new title belongs to | Yes for a new title with no code | A unit code that exists and accepts titles; must match the title code if both are given |
| Arabic name, English name | The names | Yes | 2 to 120 characters |
| Grade, Track | Grade (L1 to L9 or 1 to 9) and track (name in either language, or its letter) | Yes for a new title | Frozen once the code exists |
| Reports-to code | The code of the higher title (in the file or already in the system) | No | No loop, not itself |
| Responsibilities, Qualifications, Performance indicators (Arabic and English) | The content, one item per line | No | A file with these cells empty never overwrites existing content |

The import takes up to 1000 rows.

### Workflow

#### The life of a job title

1. **HR / the admin** (admin mode on, `job_titles.create`) presses «Add title», chooses the unit and fills the names, grade, track and, optionally, «Reports to» and the role to copy permissions from.
2. **The system** builds the code (`unit code-L<grade><track>-<sequence>`), creates the title's own **role** named after the title with the copied permissions (in the same save), and audits it. A title added to a unit with no code waits for the unit's code.
3. **Content:** someone with `org.titles_edit_content` writes the duties, qualifications and indicators (or they come with the import); every save raises the version, and the career profile reopens its acknowledgement at the new version.
4. **Holders:** when HR gives an employee this title (the employee form, a bulk edit, an import), the employee gets the title's role automatically, and the title's «Reports to» line decides their direct manager (the nearest higher title that has a holder in the same company).
5. **Changes:** rename, change the reporting line, or stop the title (`job_titles.update`); grade and track never change after the code exists. Deleting is possible only when nobody holds the title and it is not the last active one of its unit; its role is deleted with it.
6. Nobody is e-mailed from this page; changes are audited.

#### Statuses

| Status | Meaning | Who can change it (permission key) | Moves to |
|---|---|---|---|
| No code | An older title without grade and track | `job_titles.update` (give grade and track) | Coded |
| Coded / Active | The title is in use | `job_titles.update` | Stopped |
| Stopped | Not offered for new employees («Active title» unticked) | `job_titles.update` | Active |
| Vacant | Nobody holds it (the «Vacancy» filter) | placing an employee in it | Held |

#### Automatic things

- The code and the role are made in the same save; the role is removed with the title.
- Every night, Riyadh time, (00:10) employees' direct managers are recomputed from the reporting line of titles (a manager HR chose by hand stays); the roles of titles are refreshed with the other automatic roles at 03:00.
- A change of «Reports to» moves the automatically calculated managers of the holders (not a manager HR chose by hand) at the next recomputation.

#### What each person sees

- The page is for roles that hold `job_titles.view` (HR, administrators and heads of units; not the plain «Employee» role).
- You see the titles of the units whose structure you see; the headcount is for your company, and for every company in the full view.

### Business rules

- **The title code** looks like `OPS.03.03.01-L7P-01`: the unit code, then the grade (1 to 9) and a track letter (M management, P professional, J projects, C advisory, S support), then a sequence inside the unit. It is built when the title is added, and is never changed or reused. (FR-104)
- **Grade and track** are set once and then locked because the code is built from them. A new title needs a grade and a track. Older titles without a code keep working; their code is built when grade and track are set. A title added to a unit with no code waits for the unit's code. (FR-104)
- **No title on a sector.** A title never reports to itself or to a title that reports to it. (FR-104)
- **Development stage** is derived from grade and track: Foundation, Specialization, Mastery, Operational leadership, Institutional leadership, with the yearly hours and the budget limit; where there is no rule the card says «HR decides it» and nothing is guessed. (FR-107)
- **The direct manager** is the nearest title above that has a holder; vacant titles are skipped, and the search never goes beyond the employee's company. If there is none, the employee enters the report of units without a leader and HR assigns the manager by hand with a date and a reason. (FR-107)
- **Content:** saved in Arabic and English, one item per line (up to 30 items, 400 characters each); every save raises the content's version number and is audited. (FR-106)
- **Delete:** a title that has employees cannot be deleted; move them first. Its role is deleted with it.
- **Import:** a row is matched by code (update, or create with exactly that code) or the code is built from unit, grade and track; reporting lines are linked. A row is refused with a clear reason (unit not found, unit does not accept titles, duplicate code, sequence taken, unknown reporting title or one that makes a loop...). Nothing is written before you confirm. (FR-107)
- «Vacant» means a title with no holders; the «Vacancy» filter separates the two cases.

### Tips / common problems

- No «Add title» button? Switch platform admin mode on and check the add key.
- A unit is not in the add list? Its type does not accept titles (such as a sector); add the title in a unit below it.
- The import says «The unit has no code yet»: set the unit's code on the structure page first.
