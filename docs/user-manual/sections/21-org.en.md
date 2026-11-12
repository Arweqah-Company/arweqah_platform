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

### Fields (form inputs)

A star (*) on screen marks a required field.

#### Add a unit

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Parent | Where the unit sits: «Arweqah Alreyadah (the top)» or another unit. It decides the unit's code, the types allowed and what the unit inherits | Yes | An active unit (or the top) under which the rules table allows a new unit |
| Type | The kind of unit (sector, department, section, unit, office, or a type the admin added). It decides the slot of the code, and whether the unit takes job titles and employees | Yes | Only the types the rules table allows under that parent |
| Unit code (three letters) | The letters every code under this unit starts with | Yes, only when the parent is the top | Three capital English letters, such as OPS |
| Arabic name | The name shown in Arabic | Yes | 2 to 120 characters |
| English name | The name shown in English; it follows the Arabic as you type | No (the Arabic name is used if left empty) | 2 to 120 characters |
| Start date | The day the unit started (or will start) working | Yes | From 1980-01-01 up to two years ahead |
| Management type | «Inherited from the parent», «Shared» or «Per company»: who manages the employees under the unit (see Business rules) | Yes | «Inherited» is not offered directly under the top, where a choice between the other two is needed |

The dialog also shows the suggested code and which companies will see the unit; nothing there is typed.

#### Edit the unit

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Arabic name, English name | The unit's names | Yes | 2 to 120 characters each |
| Start date | The day the unit started working | Yes | From 1980 up to two years ahead |
| Unit manager | Offered as the direct manager of the unit's employees. A unit with a leader row follows its leader; the manager typed here counts only while the unit has no leader row | No | Any employee |
| The unit is working | Untick to stop the unit (a unit is stopped by a date, not deleted) | No | A tick |
| Effective from | When a change of names or of «The unit is working» starts | Yes (today by default) | Today or later. A later day makes a «scheduled» version applied by the nightly job |
| Reason for the change | Kept in the unit's history and the audit log | Yes, when a name, the switch or a later date is changed | 3 to 500 characters |

The type, the parent and the code are not changed here (use Move and Set code).

#### Move the unit

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| New parent | The place to move the unit under; the code stays as it is | Yes | Only places the rules table allows for this type, never the unit itself or anything under it |

#### Set the unit's code (units made before codes existed)

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Unit code | Sets the code once; it never changes afterwards | Yes | The form OPS.03.03.01 (three capital letters, then three groups of two digits); not used by another unit. «Use the suggestion» fills it |

#### Change how the unit is managed

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Management type | «Inherited from the parent», «Shared» or «Per company» | Yes | Inherit is not allowed for a sector or a unit directly under the top |
| Reason for the change | The reason is audited with the number of units and employees affected | Yes | 3 to 500 characters |

#### Assign a leader or acting leader («Leaders» tab)

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Kind | Leader, or Acting leader (covers a window while a leader exists) | Yes | Leader, Acting leader |
| Company | The company the leader leads for | Yes | For a shared unit only the group company; for a per-company unit the company of the person |
| Employee | The person who leads | Yes | An active employee of the chosen company (search by name or number) |
| Title in the unit | The job title the leader takes in this unit; they move to the unit with it from the start day | Yes for a leader (not asked for an acting leader) | An active job title of the unit |
| Starts on | The first day | Yes | Today or later |
| Ends on | The last day | Yes for an acting leader; empty = no end for a leader | Not before the start day |
| Reason | Shown in the unit's history | No | 3 to 500 characters when written |

«End» (an in-force leader): **Last day** (today or later) and **Reason** (3 to 500 characters), both required.

#### Charter («Charter» tab)

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Purpose | Why the unit exists, in Arabic and English | No | Up to 2000 characters per language |
| Outputs, In scope, Out of scope, Limits | What the unit delivers, what is inside and outside its work, and its limits; one item per line, in both languages | No | Up to 30 items of up to 400 characters per language |
| Effective from | When the charter takes effect | Yes | Today or later |
| Reason for the change | Kept in the history | Yes | 3 to 500 characters |

#### Structure divisions

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Arabic name, English name (of a new division) | A new unit type for the whole group | Yes | Not a name already used |
| Takes titles and employees | Whether units of this type may hold job titles and employees | No | A tick (a sector never does) |
| The tick table «Who is created under whom» | A tick means the child type may be created under that parent type; it never moves existing units | No | A sector only under the top; no office under an office |

Job titles of a unit are added from the «Titles» tab with the dialog described in the «Job titles» section.

### Workflow

#### The life of a unit

1. **The platform admin** (admin mode on, `org.unit_create`) presses «Add unit», chooses the parent, type, names, start date and management type, and saves.
2. **The system** gives the unit its code from the type slot, writes it to the audit log, and refreshes the automatic roles: the unit gets its own **head role** («leader of the unit»).
3. **HR / the admin** adds job titles in the «Titles» tab (`job_titles.create`); each title gets its code and its own role.
4. **A leader** is assigned from the «Leaders» tab (`org.leaders_manage`) from today or a later day. From the start day the leader holds the unit's head role, is placed in the unit with the chosen title, and becomes the manager of the unit's employees of that company (in a shared unit, the group-company leader manages the employees of all companies) (a leader's own manager is the nearest leader above).
5. **Employees** are placed in the unit from the employee form. A per-company unit shows in a company's structure when its first employee is placed there; a shared unit shows to every company when the first employee of any company is placed in it.
6. **The unit changes:** edit (names and the «working» switch are dated), move (immediate, audited, code unchanged), change management type (with a reason; managers of other companies' employees are recomputed), charter edits (dated). A unit is stopped by a date; it is deleted only when it has no sub-units and no employees.
7. **Who is told:** nobody is e-mailed or notified from this page. Every change goes to the unit's History tab and the audit log with who, when and why.

#### Statuses

| Status | Meaning | Who can change it (permission key) | Moves to |
|---|---|---|---|
| In force | The unit works | `org.unit_update` | Stopped |
| Stopped | The unit was switched off (immediately or on a date) | `org.unit_update` | In force |
| Scheduled change | A dated change of name, switch or charter waits for its day | `org.unit_update` / `org.charter_edit` | Applied by the nightly job |
| Empty | No employees in the unit | placing employees (`employees.update`) | In force with employees |
| No leader | Employees of a company are in the unit and nobody leads it for them | `org.leaders_manage` | A leader assigned |

A leader row has its own status: **Scheduled** (starts later; may be removed), **In force** (may be ended with a last day) and **Ended**.

#### Automatic things

- Every night, Riyadh time: **00:15** dated unit changes whose day came are applied and the leaders that started or ended are refreshed (the head role and the unit's manager follow); **00:10** employees' managers are recomputed from the leaders and the reporting line of titles; **03:00** automatic roles are refreshed (also right after any change to the structure).
- No e-mails are sent from this page. Everything is audited.

#### What each person sees

- Every employee sees their own company's structure: units with employees of their company under them, the units above up to the top, and shared units that have employees, with a note of how many units are hidden.
- Holders of «See the whole structure» (`org.view_full`) see every unit, even empty ones.
- The buttons show only in admin mode and only for who holds each key. A leader sees the unit and below through the head role.

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
