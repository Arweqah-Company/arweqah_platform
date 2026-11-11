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
3. Write the Arabic and English names, choose the grade (L1 to L9), the track (Management, Professional, Projects, Advisory, Support) and, optionally, the title it reports to. You may add more than one title to the unit in the same dialog, and choose which role the permissions are copied from (default: the «Employee» role).
4. Save. The title code is built and a role named after the title is made.

#### Read a title card

1. Click the title's row.
2. «Meaning of the code» breaks the code into sector, department, section and unit, then the grade and track, then the sequence.
3. «Who is the direct manager?»: choose the employee's company (among the companies that have holders of the title) and the chain from the title upward appears.

#### Import titles

1. Press «Import» and download the template: title code (empty for a new title), unit code, the two names, grade, track, reporting-title code, and the duties, qualifications and indicators in Arabic and English (one item per line).
2. Fill the file and upload it, then read the preview: «New titles / Updated / Unchanged» and the rejected rows with their reasons.
3. Confirm the import (limit 1000 rows).

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
