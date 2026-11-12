## Companies

The «Companies» page shows the companies of the group with each company's code, Arabic and English names, headcount and status. From here the platform admin adds a company, edits it, deletes it if it has no employees and no units, and imports or exports companies.

![Companies](../images/en/06-companies.png)

### Who sees it

- View key: `companies.view` («View the companies page»).
- The page needs «platform admin mode»; it does not show in the side menu outside it. It is not part of the default Employee or unit head roles, and is given from the roles page (to the System Admin and whoever they choose).
- Every button has its own key and shows only for whoever holds it.

### What you can do

| Action | What happens | Key (label on the permissions page) |
|---|---|---|
| Search and filters | Search by code or name; status filter (active / inactive) and «Has employees / No employees» | `companies.view` |
| Table / cards switch | Changes how the list is drawn | `companies.view` |
| Add company | Opens the add form | `companies.create` (Add a company) |
| Edit (pencil or click the row) | Edits the code, the two names and the status | `companies.update` (Edit a company) |
| Delete (bin) | Deletes the company after a confirmation | `companies.delete` (Delete a company) |
| Export | Downloads the companies (scope, columns, file type) | `companies.export` (Export companies) |
| Import | Adds companies from an Excel or CSV file | `companies.import` (Import companies from a file) |

### How to

#### Add a company

1. Switch platform admin mode on and open «Companies».
2. Press «Add company».
3. Write the code (English letters, digits and hyphen, 2 to 20), the Arabic and English names, and keep «Active company» ticked if you want it active.
4. Save. A new company starts with the default levels (sector, department, section, unit).

#### Delete a company

1. Press the delete icon on the company's row.
2. Confirm in the window. If the company has employees or units the system refuses; move or remove them first.

#### Import companies

1. Press «Import», then «Download template».
2. Fill the columns: Code, Arabic name, English name (required) and Status (yes / no, default yes).
3. Upload the file and read the preview (valid rows and rows with errors), then press «Import N rows». Only valid rows are imported, and you can download the error report.

### Fields (form inputs)

A star (*) on screen marks a required field.

#### Add / edit a company

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Arabic name | The company's name in Arabic, shown in lists and drop-downs | Yes | 2 to 120 characters |
| English name | The name in English; follows the Arabic as you type | Yes | 2 to 120 characters |
| Code | A short unique code for the company, used in lists, imports and exports | Yes | English letters, digits and hyphen, 2 to 20; written in capitals; not used by another company |
| Active company | Whether the company is active | No (ticked by default) | A tick |

#### Import companies

| Column | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Code | The company code | Yes | As above; unique, also inside the file |
| Arabic name | | Yes | 2 to 120 characters |
| English name | | Yes | 2 to 120 characters |
| Status | Whether the company is active | No (default yes) | Yes / No drop-down |

### Workflow

#### The life of a company

1. **The platform admin** (admin mode on, `companies.create`) presses «Add company» (or imports a file) and fills the code, the names and «Active company».
2. **The system** checks that the code is new, saves the company, audits it and refreshes the structure-related automatic roles. A company needs nothing else: the structure is one for the whole group, and a company sees it according to where its employees are placed.
3. **HR** then adds employees to the company (the Company field of the employee form). The employees column counts them.
4. **Edits** (`companies.update`) change the code, the names and the status; each is audited.
5. **Deletion** (`companies.delete`) is allowed only when the company has no employees and no units; the company is then removed from lists (a soft delete) and audited.
6. Nobody is e-mailed from this page.

#### Statuses

| Status | Meaning | Who can change it (permission key) | Moves to |
|---|---|---|---|
| Active | The company is in use | `companies.update` | Inactive |
| Inactive | Marked as not active (the «Active company» tick removed) | `companies.update` | Active |
| Deleted | Removed from lists; only possible with no employees and no units | `companies.delete` | none from the screen |

#### Automatic things

- Nothing runs on a schedule for companies. Create, edit and delete are written to the audit log, and a new company refreshes the automatic roles.

#### What each person sees

- The page is for the platform admin and whoever the admin gives `companies.view`, in admin mode only. The same companies fill the Company drop-downs of the employee form for whoever may add employees in their scope.

### Business rules

- A company code is unique; using an existing one is refused with «Company code is already used». (FR-19)
- A company with employees or units cannot be deleted: «Move or remove the company's employees and units first». (FR-19)
- Import: every row passes the same checks as the form, duplicates inside the file are flagged, and a row with an error is never imported. (FR-29)
- Export: you choose the rows (those shown on the page or all results of the search and filters), the columns (code, both names, employees, status) and the file type (Excel or CSV).
- The organization structure is one for the group; what each company sees of it follows where its employees are placed (see the Organization structure section).
- Editing and deleting are recorded in the audit log.

### Tips / common problems

- You do not see «Companies» in the menu? Switch platform admin mode on.
- The employees column is zero but the company cannot be deleted? It may still have units.
