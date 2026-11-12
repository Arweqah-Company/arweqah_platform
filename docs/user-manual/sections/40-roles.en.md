## Roles and permissions

### What this page is

A role is a set of permissions given to everyone who holds it. On this page you see all the roles of the platform, how each one is given (by hand or automatically) and how many people hold it. You can create a new role or change the permissions of an existing one. Each permission inside a role has a scope that decides which records it covers. The page has two tabs: «Roles» and «Exceptions».

![Roles and permissions](../images/en/09-roles.png)

### Who sees it

| Item | Detail |
|---|---|
| View key | `roles.view` (View the roles and permissions page) for the Roles tab, and `exceptions.view` (View the exceptions page (what was given outside the job title)) for the Exceptions tab |
| Default scope | All |
| Platform admin mode | Required. The page appears in the menu only after you turn it on; if you open it without the mode, a message asks you to turn it on |
| Default roles that hold it | The built-in «System Admin» role holds every key of the platform at the «All» scope. The «Employee» role, the unit head roles and the job title roles do not hold the keys of this page. The other administrative roles (for example «Platform manager», «Platform configurator», «Platform auditor») start with no permissions, and an administrator gives them what is needed on the Permissions page |

> If you do not hold the key of a tab, the tab does not show. If you hold none, you see «You have no permission on any tab here.»

### What you can do (Roles tab)

| Action | What happens | Permission |
|---|---|---|
| «New role» | Opens a window to create a role with Arabic and English names, a description and its permissions | `roles.create` (Add a role) |
| Open a role (click the row or the edit icon) | Opens the edit window: names, description, assignment and the permission matrix | `roles.update` (Edit a role and its permissions) |
| Delete icon | Deletes the role after you confirm; its holders lose its permissions at once | `roles.delete` (Delete a role) |
| «Refresh members now» | Recalculates the members of the automatic roles right away and shows how many changes were made | `roles.sync_auto` (Refresh the members of the automatic roles now) |
| Export button | Exports the list of roles to a file after you choose the scope, the columns and the file type | `roles.export` (Export roles) |
| Search, filters, table/cards switch | Narrow the list by name, description, or unit and company. Filters: type (built-in/custom), assignment, kind, company, has holders | No extra key |

> The add button and the row actions do not show to people without the matching keys. The delete icon never shows on built-in roles, nor on job title and unit head roles.

List columns: name, number of permissions, unit and company (for job title roles), number of users, assignment (automatic/manual), kind, and a «Built-in» badge.

### Kinds of roles

| Kind | Who holds it | How it is managed |
|---|---|---|
| Manual | Whoever HR or a manager gives it to | From the employee form or the Permissions page |
| Automatic (rule) | «Employee»: everyone added to the platform. «Direct manager»: everyone who has people reporting to them. «Collaborator base»: people whose relation type has limited access | The rule refreshes the members after every change to employees and every night |
| Job title | Everyone who holds the title | The role is created with the title, carries its name and is removed with it |
| Unit head | The manager/leader of the unit | Created with the unit as «Head of {unit}» and starts with the default head permissions |

### How to

**Create a role**

1. Open «Roles & permissions» (after turning on platform admin mode) and press «New role».
2. Type the Arabic name; the English name is filled in automatically and you can edit it. Both names are required (at least two characters).
3. Add a short description and choose the assignment (manual or automatic).
4. Tick the permissions needed, choose the scope of each, then press «Save».

**Change the permissions of a role**

1. Click the role's row.
2. Use «Search permissions» to find a permission by its name or key.
3. Tick or untick the permission and change its scope in the list beside it. «Select all permissions» and «Clear all» save time.
4. Beside «Edit employees» there is a «Fields they may change» button to choose which fields of the employee record its holder may change.
5. Press «Save».

**Refresh the automatic roles at once**

1. Press «Refresh members now».
2. A message shows the number of changes, or «Members are up to date, nothing changed».

### Fields (form inputs)

**The role window** («New role» / «Edit role», needs `roles.create` or `roles.update`)

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Arabic name | The name people see in Arabic on roles lists and employee forms | Yes | 2 to 120 characters. Locked for job title and unit head roles, whose names follow their title or unit |
| English name | The same name in English | Yes | 2 to 120 characters. Filled in automatically from the Arabic name while you type, and you can edit it. Locked for job title and unit head roles |
| Description | A short sentence on what the role is for, so the next administrator understands it | No | Up to 500 characters |
| Assignment | How the role is given: **Manual** (HR or an administrator gives it to people) or **Automatic** (a rule or a setup in the system gives it) | No (a new role starts as Manual) | Manual, Automatic. Locked when the role already has a rule (a rule role cannot become manual) |
| Search permissions | Finds a permission in the matrix by its name or key | No | Free text |
| Permission tick box | Whether the role holds that permission. Every page has a «view» key and every button its own key | No | Up to 500 permissions per role. «Select all permissions» / «Clear all» act on the visible list |
| Scope (beside each ticked permission) | How far the permission reaches: which records it covers | Yes, for each ticked permission | Only the scopes that permission allows: Own record only, Their unit, Their unit and 1 to 5 levels below, Their unit and below, Their whole company, All companies. You cannot choose a scope wider than your own |
| «Fields they may change (N)» (only beside «Edit employees») | Opens a window to choose which fields of the employee record the holder may change | No | See the next table |

**The window «The fields a holder of «Edit employees» may change»**

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Search the fields | Finds a field by name | No | Free text |
| Field tick boxes, grouped | Each ticked field may be changed by the holder | No | Groups: Personal details, Contact, Work, Identity and name, Contract and insurance, Pay and account, Notes, Structure and relation. A summary says «may change N of M fields» |
| Basic / All / None | Shortcuts for the whole list | No | «Basic» is the contact and personal data and is where a new permission starts |
| Select all / Clear all (per group) | Ticks or clears one group | No | You cannot add a field you cannot change yourself. Unit, job title and manager also need «Change placement from a date» |

**Roles list toolbar**

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Search roles | Finds roles by name or description | No | Free text |
| Filters | Narrow the list | No | Type (built-in / custom), Assignment, Kind, Company, Has holders / No holders |
| Scope (in the «Export data» window) | How many rows go into the file | Yes | «The rows shown on this page (N)» or «All results of the current search and filters (N)»; a single export holds a limited number of rows and the window says when it caps |
| Columns | Which columns to put in the file | Yes, at least one | «Select all» / «Clear selection»; the window shows «N of M columns» |
| File type | The format of the file | Yes | Excel (.xlsx) or CSV (.csv) |

**The window «End date of the exception»** (Exceptions tab, «Change the end date», needs `exceptions.update`)

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| End date | The last day the exception holds. After it, it is taken back by itself | No (empty or «Remove the end date» means no end date) | A date that is today or later (Riyadh time); a date in the past is refused |
| «Remove the end date» | Makes the exception permanent until someone takes it back | Not a field | Needs no typing |

**Exceptions tab toolbar:** search by person, what was given or who gave it; filters Kind (Role, Personal permission, Group of roles), Given by, Ending (within 7 / 14 / 30 / 60 days, or no end date). «Take it back» asks for a confirmation only.

### Workflow

**The life of a role and its permissions**

1. **An administrator** turns on platform admin mode (a fresh authenticator code, valid for a period of activity) and opens «Roles & permissions».
2. **They** press «New role» (`roles.create`), type the Arabic and English names and a description, choose the assignment, tick the permissions and choose the scope of each, then press «Save». The platform saves the role and records it in the audit log. Nobody is notified.
3. **The role is given** to people: by HR on the employee form (`employees.assign_roles`), by a rule (the automatic roles), or through a group of roles. For a person it may carry an **end date**, typed beside the role on the employee form.
4. **The administrator** later opens the role (`roles.update`) to change its permissions. The change reaches every holder at once.
5. **Exceptions:** whatever is given outside the job title (a manual role, a personal permission, a group of roles) is listed in the Exceptions tab with its end date. An administrator with `exceptions.update` changes the date, or takes it back at once with `exceptions.revoke` after confirming.
6. **Every night** the platform takes back the exceptions whose last day has passed and records each one in the audit log.
7. **Deleting** a role (`roles.delete`, after confirming) makes its holders lose its permissions at once.

| Status of an exception | Meaning | Who can change it (permission key) | Moves to |
|---|---|---|---|
| No end date | Holds until someone takes it back | `exceptions.update` (set a date), `exceptions.revoke` (take it back) | Has an end date, or taken back |
| Has an end date | Holds through its last day (Riyadh time) | `exceptions.update` (change or remove the date), `exceptions.revoke` | No end date, ending soon, or taken back |
| Ending soon | Ends within 7 days; shown with a warning badge | Same | Ended |
| Ended and taken back | The last day passed; the permission is gone from that moment | Nobody; the platform does it overnight | Removed from the list |

**Automatic things**

- **Every night at 03:00 (Riyadh)** the members of the automatic roles are recalculated; they are also refreshed after every change to employees. «Refresh members now» (`roles.sync_auto`) does it at once.
- **Every night at 03:10 (Riyadh)** ended exceptions are taken back and written to the audit log.
- The job title role is created, renamed and removed with its title, and the unit head role with its unit.
- Every creation, change, deletion, refresh, end date change and take-back is written to the audit log with the actor's name.

**What each person sees:** the page shows only in admin mode, and only the tabs and buttons whose keys the person holds. A person can give only what they hold themselves, at a scope no wider than their own.

### Business rules

- **Scopes:** every permission is given with a scope: «Own record only», «Their unit», «Their unit and 1 level below» up to 5 levels, «Their unit and below», «Their whole company», «All companies». The list offers only the scopes the permission itself allows. If a person holds the same permission from several sources, the widest scope wins (FR-80).
- **Outside the scope:** a record outside a person's scope appears to them as if it did not exist («not found»), not as forbidden.
- **Job title and unit head roles** follow their title or unit: their name and members cannot be changed by hand, they cannot be deleted or assigned manually. Only their permissions and description can be edited. A job title role starts as a copy of the permissions of a role chosen when the title was created (default «Employee») and an administrator edits it afterwards (FR-68, FR-69).
- **A role with a rule** cannot become manual and cannot be assigned by hand.
- **Built-in roles** (such as «Employee» and «System Admin») cannot be deleted.
- **The «Employee» role** is given automatically to every new employee. It is stored like any other role: it can be removed on the employee form and does not come back by itself (FR-43).
- **Head role permissions:** every new unit gets a head role that starts with the leader's own account pages and the people, tasks, tickets, team evaluation and career path of the unit and below. Existing roles change only when an administrator edits them.
- **Deleting:** when a role is deleted, all its holders lose its permissions at once.
- **Audit:** every creation, change, deletion and refresh is recorded in the audit log under the name of who did it.
- **Giving what you do not hold:** nobody can give another person a permission at a wider scope than they hold themselves.

### Groups of roles and groups of people

Both are managed from the «Permissions» page (see its section); each action has its own key.

| Action | What happens | Permission |
|---|---|---|
| View groups of roles | They appear on the Permissions page | `role_groups.view` (View groups of roles on the permissions page) |
| Add a group of roles | Bundles roles that go together under one name | `role_groups.create` (Add a role group) |
| Edit a group of roles | Change its name and its roles | `role_groups.update` (Edit a role group) |
| Delete a group of roles | People it was given to lose what came through it | `role_groups.delete` (Delete a role group) |
| View groups of people | They appear on the Permissions page | `user_groups.view` (View groups of people on the permissions page) |
| Add a group of people | Chosen people who get the same permissions | `user_groups.create` (Add a user group) |
| Edit a group of people | Change the name and the members | `user_groups.update` (Edit a user group and its members) |
| Delete a group of people | Members lose what came through it | `user_groups.delete` (Delete a user group) |

- A **group of roles** is given to a person (from the employee form, with the permission `employees.assign_groups`, never beyond what the giver holds) and they then hold all its roles. Permissions placed on the group reach the people it is given to and everyone who holds one of its roles (FR-46).
- A **group of people** is a set of people you choose by name or e-mail; all of them get the group's permissions.

### The Exceptions tab

It lists everything given to a person **outside** what their job title brings: manual roles, personal permissions and groups of roles, each with its last day, so no permission is forgotten. Columns: person, kind (role/personal permission/group of roles), given, scope, given by, given on, ends on.

| Action | What happens | Permission |
|---|---|---|
| «Change the end date» | Sets the last day the exception holds, or removes the date | `exceptions.update` (Change the end date of an exception) |
| «Take it back» | Takes it back at once after you confirm; the person loses what it gives | `exceptions.revoke` (Take an exception back) |
| Export | Exports the list | `exceptions.export` (Export the exceptions) |

- Filters: kind, given by, «Ends within 7/14/30/60 days», «No end date». Search by person, what was given or who gave it. Table and cards views are available.
- An exception holds **through** its last day (Riyadh time). After it the permission is gone at once, and the platform takes the row back overnight and records it in the audit log. An exception ending within 7 days shows a warning badge.
- A date in the past is not accepted.
- The «Employee», job title and unit head roles are not exceptions (FR-70).
- The end date is set when the role is given on the employee form (a date beside each ticked role) or from this list.

### Tips and common problems

- **I do not see the page in the menu:** turn on «Platform admin mode» at the top of the page (a fresh code from your authenticator app is needed), and check that you hold `roles.view` and that the page is not hidden from your roles.
- **I cannot give an employee a role:** you can only give what you hold the keys of, and job title and head roles are calculated automatically.
