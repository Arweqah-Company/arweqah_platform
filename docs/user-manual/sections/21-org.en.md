## Organization structure

The «Organization structure» page shows one tree for the whole group and all its companies: sectors, departments, sections, units and offices, with their leaders, job titles and headcount. What each company sees follows where its employees are placed. You can view it as a chart, a horizontal icicle, a table or cards, and choosing a unit opens its details beside the list.

![Organization structure](../images/en/04-org.png)

### Who sees it

- View key: `org.view` («View the organization structure»). The «Employee» role holds it automatically at scope «all».
- Every employee sees only their own company's structure: the units that have employees of their company under them, the units above them up to the top, and the shared units that have employees. A note says how many units are hidden (the ones without employees). (FR-98, FR-108)
- «See the whole structure» (`org.view_full`) shows every unit even if empty, and adds the «Employees only / Full view» switch and the «Show me a company's structure» list. By the product design it is for HR and the platform admin, and is given on the roles page.
- The buttons that change things (add, move, edit, delete and so on) show only in «platform admin mode» and only for someone who holds the key of each button.
- The head role of a unit does not list `org.view` because the general «Employee» role already holds it.

### What you can do

| Action | What happens | Key (label on the permissions page) |
|---|---|---|
| Switch the view (chart / icicle / table / cards) | Changes how the structure is drawn; your choice is remembered | `org.view` (View the organization structure) |
| Search and filters | Search by unit name, code or a job title in it; filters: type, management type, status, employees, leader | `org.view` |
| Full view and «Show me a company's structure» | Shows every unit and compares it with what one company sees (faded with a dashed border = that company does not see it) | `org.view_full` (See the whole structure) |
| Export | Downloads the units with the columns you choose | `org.export` (Export units of the structure) |
| Structure divisions | Edits the unit types and the «who may be created under whom» table | `org.levels_manage` (Edit and copy the levels of the structure) |
| Add unit / Add a unit under it | Creates a new unit with a suggested code | `org.unit_create` (Add a unit to the structure) |
| Edit (pencil) | Changes the name, start date, manager and «The unit is working», with an effective date and a reason | `org.unit_update` (Edit a unit) |
| Set code | Sets once the code of a unit made before codes existed | `org.unit_update` |
| Change management type | Turns the unit between shared and per company, with a reason | `org.unit_share` (Change how a unit is managed) |
| Move | Moves the unit under another parent | `org.unit_move` (Move a unit) |
| Delete | Deletes a unit with nothing under it | `org.unit_delete` (Delete a unit) |
| «Leaders» tab: assign a leader or acting leader, end, delete | Manages the leaders of the unit | `org.leaders_manage` (Assign unit leaders and acting leaders) |
| «Charter» tab: write / edit | Writes the purpose, outputs, scope and limits | `org.charter_edit` (Edit the charter of a unit) |
| «Titles» tab: add and edit a title | Manages the unit's job titles | `org.titles_manage` (Manage job titles) and `job_titles.create` / `job_titles.update` |

There is no import on this page on purpose: the structure is built from the screen, and job titles are imported from the «Job titles» page.

### How to

#### Read the structure

1. Choose the view with the view switch. The chart starts with the group card open; the circle under a card opens what is below it, and the chart has «Open all», «Fit», zoom and drag.
2. Card colors follow the unit type and every card carries a text badge with the type name, so meaning never depends on color alone.
3. Click a unit and its details open with the tabs: Overview, Titles, Leaders, Charter, History.

#### Add a unit

1. Switch platform admin mode on, then press «Add unit» (or the «Add a unit under it» icon on the parent's row).
2. Choose the parent, then the type; the types offered are those the rules table allows.
3. Write the Arabic name (English is optional and is translated as you type) and the start date.
4. Under the top (a sector, department or office) write the unit code: three capital English letters such as OPS.
5. Choose the management type: «Inherited from the parent», «Shared» or «Per company» (a sector and anything directly under the group needs an explicit choice). The suggested code and a note on which companies will see the unit are shown.
6. Press «Save the unit».

#### Change the management type

1. Press the «Change management type» icon on the row.
2. Read the impact shown (the manager of employees of the subsidiary companies changes).
3. Write the reason and press «Confirm the change». The affected units and the number of employees whose manager was recalculated are shown.

#### Assign a leader or an acting leader

1. Open the unit, then the «Leaders» tab, and press «Assign a leader or acting leader».
2. Choose the kind (leader or acting leader), the company (for a per-company unit), the employee, their job title in the unit, the «Starts from» date and the reason.
3. An acting leader needs an end date too. Save.

### Business rules

- **Unit types:** five built-in types that cannot be removed (sector, department, section, unit, office); the platform admin can add more from «Structure divisions» (Arabic and English names, and the «Accepts titles and employees» tick). An added type shows in every company and can be removed only while no unit uses it. A sector never takes titles or employees. (FR-96)
- **Who may be created under whom:** a table of tick boxes (parent in the row, child in the column) edited from «Structure divisions». Changing the table only stops new creation; it never moves existing units. Two rules are fixed: a sector is created only under the group, and no office under an office. (FR-96)
- **The unit code** is built by unit type in four slots (sector.department.section.unit) such as `OPS.03.03.01`; a zero in a slot means there is no level of that type here. An office takes number 09 in the slot where it sits, and an added type takes the unit slot. The code does not change when the unit is moved. If no slot is free the message «No code slot is free for this type under this parent» appears. A unit made before codes gets its code once. (FR-96)
- **Management type:** «Shared» is managed once from Arweqah and the leader of the unit manages any employee under it; «Per company» means each company has its own leader and employees. It can be marked on any level and what is below inherits it unless a unit under it is marked differently. Changing it needs a reason and is audited. (FR-97)
- **When a unit shows:** a shared unit shows to all companies once the first employee of any company is placed in it; a per-company unit does not show in a company's structure until its first employee is placed. Someone with «See the whole structure» always sees it. (FR-98)
- **Leaders:** a shared unit has one leader from the group company; a per-company unit has a leader for each company from its own active employees. An acting leader holds the leader role only for their term, needs an end date and a leader in force for the whole term, cannot be the leader, and cannot overlap another acting leader. A leader starts today or later, and only a leader who has not started can be deleted (one in force is ended). When a leader is given a job title in the unit, they move to the unit with that title from the start day. The «unit leader» role is one role, not tied to a company. (FR-100)
- **A unit with employees and no leader** in their company shows the status «No leader», with a yellow notice for holders of the full view and a «Show them» button. The manager then goes up to the nearest leader above in the same company; if there is none the manager stays empty. (FR-100)
- **Charter and history:** the charter (purpose, outputs, in scope, out of scope, limits) is edited with an effective date and a reason. An edit today does not change yesterday's record; a change that starts later is kept as a «scheduled» version, applied by itself on its day, and the unit shows «Scheduled change». A change cannot start in the past or on a date that does not follow the last version. A unit is stopped by a date instead of being deleted. (FR-99)
- **Move:** immediate and audited, and the code stays the same; only places the rules allow are offered, and a sector cannot be moved. A department with an active ticket desk or open tickets cannot be moved or deleted.
- **Delete:** a unit with sub-units or employees cannot be deleted; move or remove them first. Its job titles are deleted with it.
- **The start date** is required for every unit, from 1980 up to two years ahead. (FR-35)
- Every change to the structure is recorded in the history with the date, who made it and the reason.

### Tips / common problems

- You do not see the edit buttons? Switch «platform admin mode» on from the top bar and check your role holds the key.
- A unit does not show for you? It may still have no employees of your company; holders of «See the whole structure» see it.
- A missing code on an old unit: use the «Set code» icon; it will not change afterwards.
