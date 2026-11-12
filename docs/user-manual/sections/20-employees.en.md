## Employees

The «Employees» page is the directory of employee records and their sign-in accounts. From here HR adds a new employee, edits their details, deactivates an account or ends the contract, and sees an employee's unit, job title and manager through time. A second tab, «My career team», shows the colleagues of your unit. What you see on the page follows your permissions and scope.

![Employees](../images/en/03-employees.png)

### Who sees it

- View key: `employees.view` («View employees»). Scope: own, unit, unit and below, company or all.
- The «Employee» role (everyone gets it automatically) holds it at scope «own»: an employee sees only their own record.
- The head role of a unit (made automatically for every unit of the structure) holds it at «unit and below», together with the employee history (placement and changes).
- HR roles and the System Admin role are set on the roles page; the HR roles start with no permissions until an administrator sets them.
- The page does not need «platform admin mode». Every button shows only for someone who holds its key.
- The «My career team» tab shows for whoever holds «View my team (colleagues of my unit)» (`directory.view`) or «View «my career team»» (`career_team.view`), unless an administrator hid the page from the role.

### What you can do

| Action | What happens | Key (label on the permissions page) |
|---|---|---|
| Add employee | Opens the two-step form; a sign-in account is created and an activation invitation is sent | `employees.create` (Add employees) |
| View (eye icon or click the row) | Opens the employee page | `employees.view` (View employees) |
| Edit (pencil) | Opens the form to change the fields you are allowed | `employees.update` (Edit employees) |
| Deactivate / Activate (power icon) | Stops the employee signing in and ends their sessions at once, or gives sign-in back | `employees.deactivate` (Deactivate and activate employees) |
| Sign in as the employee (icon) | An administrator works as the employee to see what they see | `impersonation.start` (Sign in as another employee) |
| Select several, then «Bulk edit» | Changes unit, job title, manager, work location, work mode or relation type for many | `employees.bulk_update` (Edit many employees at once), plus `employees.assign_change` when changing unit, title or manager |
| Export | Downloads the list (you choose scope, columns and file type) | `employees.export` (Export employees) |
| Import | Adds employees from an Excel or CSV file with a template | `employees.import` (Import employees from a file) |
| Update from file | Updates existing employees by employee number | `employees.update` (Edit employees) |
| Roles / Groups (on the employee page) | Sets the employee's roles or groups of roles | `employees.assign_roles` (Assign employee roles), `employees.assign_groups` (Give an employee groups of roles) |
| End contract | Records the end date and reason | `employees.terminate` (End an employee's contract) |
| Resend invitation | Sends a new activation link by e-mail | `employees.resend_invite` (Resend the activation link) |
| Reset authenticator app | Ends the employee's sessions and sends a link to link the app again | `employees.reset_authenticator` (Reset the authenticator app) |
| Change photo | Adds, changes or removes the employee's photo | `employees.photo_update` (Change an employee's photo) |
| «History» tab | Shows unit, job title and manager through time and the log of changes | `employees.history_view` (View an employee's history) |
| Cancel a waiting change (in History) | Cancels a change that waits for its day | `employees.assign_change` (Change an employee's unit, job title or manager from a date) |
| See ID, IBAN and salary | The values show instead of being hidden | `employees.view_sensitive` (View sensitive data) |

Above the list there is a search by name, number or e-mail, and filters: company, status, relation type, unit (after choosing a company), job title (after choosing a unit), contract type, nationality, gender, work mode, marital status, residency status, contract starts from / until, «ID expiring soon», «Contract ending soon», «Needs a unit». You can switch between the table and cards. Row actions are icons at the end of each row.

### How to

#### Add a new employee

1. Press «Add employee» at the top of the page.
2. In the first step «Employee details» fill the sections: Work, Contact, Personal, Contract, Salary and cost, Notes. Required fields carry a star, and an error appears under the field as you type.
3. Choose the company, then the unit, then the job title (a new employee needs a unit and a job title). The unit's manager is proposed as direct manager; you can change or clear it.
4. Press «Next: roles». The «Employee» role and the role of the chosen job title are ticked from the start; untick them or add other roles (each role may have an optional last day). This step shows for people who may assign roles.
5. Press «Save and send invitation». The sign-in account is created and the employee receives an e-mail with the activation link; they link the authenticator app with a QR code and get backup codes. The link works for 72 hours and only once.

> If the e-mail could not be sent, the employee is still saved and a message asks you to use «Resend invitation».

#### Edit an employee or change their unit

1. Open the employee's row and press «Edit».
2. Fields you may not change are locked, with a note.
3. When you change the unit, job title or manager the form asks for «Effective from» (today or a later day) and «Reason for the change». A later change waits for its day and then takes effect by itself; it shows in the «History» tab.
4. Press «Save».

#### Bulk edit

1. Select employees with the boxes at the start of each row (or the page box; limit 500).
2. A bar «N employees selected» appears; press «Bulk edit».
3. Choose the company (so its units are offered), then the values to change. What you leave empty stays as it is. To change unit, title or manager give «Effective from» and «Reason for the change». You can also tick «Remove the direct manager».
4. Press «Preview»: you see «N would change» and «N would be refused» with the reason for each person. Nothing is saved in the preview.
5. Press «Apply to N employees». One person's refusal does not stop the others.

#### Deactivate an account or end a contract

1. To deactivate: press the deactivate icon on the row, or «Deactivate» on the employee page, and confirm. The employee can no longer sign in and their sessions end at once. You can activate it again later.
2. To end the contract: open the employee page and press «End contract», choose the end date and the reason (write it if the reason is «Other»), then «Confirm end of contract».

### Fields (form inputs)

A star (*) on screen marks a required field. The form is in two steps: «Employee details» (the sections below) then «Roles». Fields you may not change are locked with a note. The people you can pick in drop-downs, and the units and titles offered, follow your scope.

#### Add / edit employee: Work

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Company | The company the person works for. It decides which units and job titles are offered next, and «Company on the contract» is filled with it | Yes | One of the companies in your scope. Changing it clears the unit and title |
| Relation type | How the person relates to the company (employee, collaborator...). Some relation types are marked «limited» in the system lists: they need an end date and the person gets the collaborator base role instead of the «Employee» role | No | A value from the list |
| Unit | Where the person sits in the organization structure. It decides their scope (what they see as «unit» or «unit and below»), who their manager is, the head role if they lead it, and their place in the org chart | Yes | A unit of the chosen company that accepts employees. Enabled after you choose the company |
| Job title | The person's post in that unit. It gives them the role made for the title, places them in the reporting line of titles (which proposes their manager) and shows in the career pages | Yes | A title of the chosen unit. Enabled after you choose the unit |
| Leader of this unit | Makes the person the leader of the unit they are placed in, from today (or their start date if later); they then get the unit's head role | No | A tick; shows only for who holds `org.leaders_manage`. Refused with nothing saved if the leader rules do not allow it |
| Direct manager | Who the employee reports to; what needs the manager's decision goes to them, and the employee shows as their report. A new employee gets the unit's manager as a proposal; you may change or clear it | No | Any employee (search by name or number); not the person themselves |
| Effective from | (Edit only, shows once you change the unit, title or manager) the day the change starts | Yes, then | Today or a later day. A later day waits and is applied by the nightly job |
| Reason for the change | (Same condition) why; shown in the employee's history | No | Up to 500 characters |
| Work location | Free text such as the office or city | No | Up to 255 characters |
| Work country | The country of work; it proposes the salary currency | No | A value from the list |
| Work mode | How the person works | No | On-site, Hybrid, Remote |

#### Contact

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Work email | The sign-in identity and the Microsoft account. The activation invitation is sent to it | Yes | A valid e-mail up to 255 characters, on an allowed domain (default arweqah.sa; Settings → Security), not used by another employee. Locked when editing |
| Personal email | A private address for contact | No | A valid e-mail, different from the work email. A plain employee may edit it on their own record |
| Work phone | Work mobile | No | International format, e.g. +966501234567. A plain employee may edit it on their own record |
| Personal phone | Private mobile | No | Same format. A plain employee may edit it on their own record |

#### Personal

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Employee number | The number HR uses to name the person (also the key of «Update from file» and of the manager column in imports) | Yes | Up to 50 characters, unique |
| Full name | The name shown everywhere, in Arabic | Yes | Up to 255 characters |
| Name in English | Filled automatically from the Arabic name as you type; correct it if needed. A plain employee may edit it on their own record | No | English letters, spaces, hyphen or apostrophe, no doubled separators |
| Gender | | No | Male, Female |
| Date of birth | Used to check age | No | In the past; age from 18 to 70; the person must be 18 at the start date |
| Nationality | Also decides the ID number rule for some ID types | No | A value from the list |
| Marital status | | No | A value from the list |
| Residency status | | No | A value from the list |
| ID type | The kind of identity document | No (see rules) | Shown only to who holds `employees.view_sensitive`. Required once an ID number is typed |
| ID number | The document number, stored encrypted | No (see rules) | Shown only to who holds `employees.view_sensitive`. Checked by the ID type (and nationality for some types); required with the ID type; one number per ID type across the system |
| ID expiry date | Feeds the «ID expiring soon» badge and filter (30 days) | No | After the birth date |

#### Contract

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Start date | The first day of the relationship; the history of unit, title and manager starts from it | Yes | A date (not before the person turned 18) |
| End date | The last day of a fixed contract; sign-in stops the day after | Only if the contract type or relation type needs one | After the start date. Moving or removing a passed end date can give sign-in back |
| Contract type | The kind of contract | No | A value from the list; some types require an end date |
| Describe the contract type | Free description | Yes, when the type is «Other» | Up to 255 characters |
| Company on the contract | The legal employer | No | A company; proposed from the company chosen above |
| Profession | The profession on the contract | No | Up to 255 characters |
| Registered in GOSI | Whether the person is registered with GOSI | No | A tick. Opens the three fields below |
| Company registered in GOSI | The company the registration is under | No | A company |
| GOSI registration date | | Yes, when registered | Not before the start date |
| GOSI system | | Yes, when registered | A value from the list |
| Qiwa contract | Whether the contract is on Qiwa | No | A tick |
| Medical insurance | Whether the person has medical insurance | No | A tick. Opens the next field |
| Company registered for health insurance | | No | A company |
| Termination reason | Why the relationship ends | No (shows once an end date is set) | A value from the list. Needs the end date |
| State the reason | | Yes, when the reason is «Other» | Up to 255 characters |

#### Salary and cost (shown only to who holds `employees.view_sensitive`)

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Monthly gross salary | The monthly total before deductions, stored encrypted and never written to the audit log | No | A number from 0 to 9,999,999,999.99 |
| Currency | The currency of the salary; the work country's currency is proposed | Yes, when a salary is typed | A value from the list |
| IBAN | The bank account for payment, stored encrypted | No | Saudi IBAN: SA followed by 22 digits, checked by its check digits |

#### Notes

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Notes | A free note on the record | No | Up to 2000 characters |

#### Second step: Roles

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Default roles | The «Employee» role (badge «Everyone») and the role of the chosen job title are ticked from the start. Without «Employee» the person will not see their own pages (my account, security, notifications, tickets) | No | You may untick either |
| Other roles | Head roles of the company, manual roles and what the person already holds | No | Only roles you are allowed to give (never wider than your own permissions); up to 20 roles |
| Ends on (per role) | A last day for a role given for a limited time | No | Today or later |

> Roles can also be changed later from the employee page with «Roles» and «Groups».

#### End contract (dialog)

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| End date | The last day of service | Yes | After the start date |
| Termination reason | Why | Yes | A value from the list |
| State the reason | | Yes, when the reason is «Other» | Up to 255 characters |

#### Bulk edit (dialog)

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Company | Only decides which units are offered; a selected person from another company is refused with the reason | No | A company |
| Unit, Job title | The new placement; choose the title together with the unit | No (one value at least) | Titles must fit the unit |
| Direct manager / Remove the direct manager | Sets the same manager for all, or clears it | No | An employee, or the tick |
| Work location, Work mode, Relation type | Plain fields changed at once | No | As in the form |
| Effective from, Reason for the change | When and why a unit, title or manager change starts | Yes, with a unit, title or manager change | A day; the reason up to 500 characters |

#### Import from a file

The template has one column for each field above, with the system's lists as drop-downs, plus «Direct manager employee number». Required columns: Company, Unit, Job title, Work email, Employee number, Full name, Start date. The ID number, salary and IBAN columns are in the template only for who holds `employees.view_sensitive`. The three yes / no columns take Yes or No. «Update from file» uses the same columns without Company and Work email; only «Employee number» is required, and an empty cell leaves the record as it is.

#### Photo (dialog)

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Photo | The employee's picture, cropped square (zoom and position) before upload | No | JPEG or PNG, up to 2 MB |

### Workflow

#### What happens when HR adds an employee

1. **HR** (`employees.create`) presses «Add employee» and fills the details. The company, unit and title must be inside HR's scope, and the work e-mail, employee number and ID document must be new.
2. **HR** goes to «Roles» and presses «Save and send invitation».
3. **The system** creates the sign-in account and the record, writes the first periods of unit, title and manager (from the start date), gives the chosen roles, refreshes the automatic roles (Employee, job-title role, head role, direct-manager role) and lets the manager follow the reporting line of titles. The action is written to the audit log.
4. **The employee** receives an e-mail with the activation link (valid 72 hours, once). They open it, link the authenticator app with the QR code and keep the backup codes. After that they sign in with Microsoft or with the work e-mail plus the code.
5. If the e-mail could not be sent the employee is still saved; **HR** uses «Resend invitation» (one per minute per address).
6. **Others see:** the employee appears in the list of everyone whose scope reaches the unit. Their direct manager and head of the unit see them as a report.

#### What happens afterwards

1. **Change of unit, title or manager:** HR edits the employee with «Effective from» and a reason. Today's change is applied now; a later one waits as «pending» in the History tab (it can be cancelled with `employees.assign_change`) and a nightly job applies it on its day. The previous value is closed the day before.
2. **Lost phone:** HR presses «Reset authenticator app»; the employee's sessions end and a new invitation is sent.
3. **Deactivate:** HR (`employees.deactivate`) deactivates the account; sessions end at once. Activate gives sign-in back. Nobody can deactivate or end the contract of their own account.
4. **End of contract:** HR (`employees.terminate`) records the end date and the reason. A message is queued so the employee's open tasks go to their direct manager. Sign-in continues through the end date and stops the day after (at once if the end date is already past).
5. **Coming back:** if HR moves the end date to today or later, or removes it, the account is switched on again (for who holds `employees.deactivate`).

#### Statuses

| Status | Meaning | Who can change it (permission key) | Moves to |
|---|---|---|---|
| Active | The account can sign in | `employees.deactivate` | Deactivated |
| Deactivated | Sign-in is stopped and sessions ended | `employees.deactivate` | Active |
| Contract ended (shown as «Sign-in closed because the contract ended») | Sign-in stopped by the nightly job after the end date | `employees.terminate` (sets the end date); `employees.update` / `employees.deactivate` (moving the end date back) | Active, if the end date is moved to today or later |
| Needs a unit | A flag, not an account state: the person has no unit or no job title, so their role and reach cannot be right | `employees.update` | Cleared once the unit and the job title are chosen |

The badges «Authenticator app linked / App not linked yet», «ID expiring soon» and «Contract ending soon» are reminders, not statuses.

#### Automatic things

- Every night, Riyadh time: **00:05** accounts whose contract ended yesterday or before are deactivated and audited; **00:10** placement changes whose day came are applied, and every employee's direct manager is recomputed from the reporting line of job titles (a manager HR chose by hand stays); **03:00** automatic roles are refreshed (also after every change to employees or to the structure).
- E-mails: the activation invitation (on adding, on «Resend invitation» and on «Reset authenticator app»).
- Audit: creation, edits (field names only, never values), roles, groups, invitations, activation, deactivation and end of contract are recorded.

#### What each person sees

- A plain employee sees and edits only their own record (four fields).
- A direct manager or head of a unit sees the employees of the unit and below, when their role holds the key at that scope.
- HR sees by company or everything, as set on the roles page. A record outside the scope shows as if it does not exist.

### Business rules

- **Scope:** a record outside your scope shows as if it does not exist (no «forbidden» message). (FR-06, FR-20)
- **The work e-mail** is the sign-in identity and Microsoft account and cannot change after adding. Only allowed domains are accepted (default arweqah.sa; the list is set in Settings → Security). (FR-77)
- **Employee states:** Active, Deactivated, «Needs a unit» (no unit or no job title). Badges: «Authenticator app linked / App not linked yet», «ID expiring soon», «Contract ending soon». (FR-72)
- **Field checks:** age from 18 to 70, phone in international format such as +966501234567, a Saudi IBAN (SA and 22 digits), the ID number checked by ID type and nationality, and an end date after the start date. (FR-17, FR-18)
- **Sensitive data:** ID number, IBAN and salary are encrypted and hidden for anyone without «View sensitive data», and never written to the audit log. (FR-21)
- **Who edits what:** the list of fields a holder of «Edit employees» may change belongs to each grant (a role, a group or a person) and is set with the «Fields they may change» button on the roles and permissions pages. A plain employee edits only work phone, personal phone, personal e-mail and the English name of their own record; any other field is refused. (FR-83, FR-94)
- **The direct manager** is optional. The «Leader of this unit» tick in the work section shows for those who may assign leaders. (FR-100)
- **Deactivating** ends sessions at once. **Ending a contract:** sign-in stays through the end date and stops the next day (a daily job just after midnight, Riyadh time), and the employee's open tasks go to their direct manager. (FR-55, FR-71)
- **Reset authenticator app** ends the employee's sessions and sends a new invitation. **Resend invitation** sends a new link (one per minute per address).
- **History:** every change of unit, job title or manager closes the previous value the day before it starts, and is kept with its reason and who made it. A change cannot start in the past. (FR-89, FR-90)
- **Photo:** JPEG or PNG up to 2 MB, cropped square with zoom and position before upload; when removed, the first letter of the name shows. (FR-91)
- **«My team»:** every employee sees only the colleagues of their own unit with basic details (name, photo, job title, e-mail, phone), not the units above or below; a manager of a colleague sees more about them. Someone without a unit sees a message explaining it. (FR-92)
- **Bulk edit:** at most 500 employees; each goes through the same dated-placement rules, and the platform is told once. (FR-93)
- **Import:** download the template (its drop-downs hold the system's lists), fill it, then the preview shows errors, only valid rows are imported, and an error report can be downloaded. Every row passes the same checks as the form. (FR-29)
- **Update from file:** a row is identified by employee number; the cells you fill are what changes and an empty cell leaves the record as it is; no new employee is made in this mode. A change of unit, title or manager takes effect today with the reason «Imported from a file». (FR-95)
- **Sign in as an employee:** off by default, switched on in Settings → Security; it needs platform admin mode. The administrator works with the employee's permissions without a code; everything done is recorded under the employee's name with the administrator beside it, and the employee gets a notice afterwards. Roles, security and account status stay closed. It ends with «Back to my account» or after an idle time. (FR-85)

### Tips / common problems

- You only see your own record? That is the «Employee» role. Ask an administrator to widen the scope.
- A job title is missing from the filter? Choose the company, then the unit first; the lists follow each other.
- Badge «Needs a unit»: open Edit and choose the unit and job title.
- On a phone the table turns into one card per row.
