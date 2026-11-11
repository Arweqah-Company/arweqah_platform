## My career team

«My career team» shows managers the career paths of the people under them: how much of the mandatory and necessary learning they finished, their approved learning hours and what they are late in. It is a view for follow-up: you do not edit anyone's path here. You decide here only a proof that was referred to you, and you record the level a team member reached in a technical competency.

It is not a page of its own any more: it is the tab **«My career team»** of the **Employees** page (the old link to «My career team» takes you there).

### Who sees it

- View permission: `career_team.view` (View «my career team»), scopes: unit, unit and below, company, all. The default scope is **unit and below**.
- Default roles: the **head role of every unit** (made automatically from the structure) holds the view, decide and export keys at «unit and below». The Employee role does not hold them.
- It does not need platform admin mode.
- With the key `directory.view` as well, the table adds the columns unit, company, work e-mail and work phone. With `directory.view` only (no career key) the tab shows only the colleagues of your own unit.
- A person outside your scope does not exist for you: the system answers as if the record was not found.

### What you can do

| Action | What happens | Permission key (label) |
|---|---|---|
| Open the tab, search and filter | Lists the people in your scope with the numbers of their path; search by name; filter by state (regular, late) | `career_team.view` (View «my career team») |
| Open a member (eye icon or a click on the row) | A window with three cards (mandatory and necessary done, approved hours, late items), the proofs waiting for a decision and the competencies of the title | `career_team.view` (View «my career team») |
| Approve a proof referred to you | The proof becomes approved and its hours count for the employee | `career_team.decide` (Decide a proof referred to the direct manager) |
| Reject a proof referred to you | Rejects it with a reason (at least 5 characters); the employee is told | `career_team.decide` (Decide a proof referred to the direct manager) |
| Record a competency level | Records «Basic» or «Expert» for a competency of the member's title, or takes the record back | `career_competency.record` (Record a competency level for a team member) |
| Export the list | Downloads the table (scope, columns, file type) | `career_team.export` (Export the «my career team» list) |

### How to

**See who is late**

1. Open **Employees**, then the tab **«My career team»**.
2. If some people are late, a warning on top says «N of your team are late in what is required».
3. Filter the state by «Late», or read the column «Late» (a red number of late items).
4. Click a row to open the member and see what is late.

**Decide a proof that was referred to you**

1. Open the member. The list «Proofs waiting for a decision» shows the proofs.
2. Only a proof referred to the direct manager can be decided here (the work applications of your team, or a proof the reviewer referred).
3. Press «Approve», or press «Reject with a reason», write the reason (5 characters at least) and confirm.

**Record a competency level**

1. Open the member and go to «Competencies of the title».
2. For each competency the title asks for, choose the recorded level («Basic» or «Expert»). The employee sees it in the column «My level».
3. To undo, press «Take back».

### Business rules

- **Only the direct-manager chain sees the career file of a person:** a person outside your unit and below is not shown (FR-115).
- **Read only:** «you do not edit their career file from here». The only decisions here are on proofs referred to you and the competency levels.
- **Progress columns:** the share of mandatory and necessary units done (a bar), approved hours out of the hours of the year, the number of late items and the state: **Regular**, **Late** or **No ready path** (the person's title has no ready path; such people are left out of the list).
- **Late** means a required item with a date that is past and not ticked by the employee.
- **A work-application proof starts with the direct manager** and the manager's decision is final. After the third rejection of the same unit the manager is told.
- **A competency counts as met** when the level you recorded is at least the level the title asks for in the employee's current level. Levels are recorded by hand: approving a proof does not set them (FR-117).
- Approved hours count only after approval, a unit once.
- The list has search, a state filter, the table / cards switch and export; the number of rows follows your scope.

### Tips and common problems

- The tab is missing in Employees: your role holds neither `career_team.view` nor `directory.view`, or the page was hidden for your role.
- Someone you expect is not in the list: they are outside your unit and below, or their title has no ready career path.
- The contact columns are missing: they need the key `directory.view` too.
