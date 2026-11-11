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
