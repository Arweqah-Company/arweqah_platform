## Platform basics

This page explains the ideas that come back on every page of the platform. Once you know them, any new screen is easy to understand.

### Companies and one structure for the group

- The platform serves several **companies** of the group, and every employee belongs to one company.
- **The organization structure is one for the whole group:** sectors, departments, sections and units, and every employee belongs to one of them. A unit may be shared between companies.
- Every unit has a **head** (the leader), set from the employee form or by job title. The head of a unit automatically receives a role made for that unit.
- This structure decides «who is under whom», and permission scopes are built on it.

### Roles

- A **role** is a group of permissions given to a person. A person can hold several roles.
- Roles that come with the system: **Employee** (every employee has it: the pages of their own account, their own tickets and tasks) and **System Admin** (every permission at the widest scope).
- Some roles are **automatic**: the system grants them by a rule (such as «head of a unit» or «job title»), so they change when your position or title changes.
- A permission can also be added to one person, a group of roles or a group of people. The «My access» page shows where each of your permissions comes from.

### Scope: how far a permission reaches

Every permission has a **scope** that says which records it covers. For example, «View employees» with a different scope gives different results.

| Scope | Meaning | Example |
|---|---|---|
| Own record only | Only what concerns you | An employee sees their own tasks |
| Their unit | The unit you belong to (or manage) | A colleague sees their section's team |
| Their unit and 1 level below (up to 5 levels) | Your unit and a set number of levels below it | A sector head sees the departments directly under them |
| Their unit and below | Your unit and every unit under it | A department head sees all its sections and units |
| Their whole company | Every unit of your company | HR in one company |
| All companies | Everything in the group | System administrator |

> When a unit-based scope falls on a unit shared between companies, your permission reaches only the employees of your own company.

### Permissions

- **Every page has a view key, and every button or action has its own key** (create, edit, delete, approve, reject, export, import…).
- **The platform hides what you do not have:** a page whose key you lack is not in your menu, and a button whose key you lack is not on the page.
- **What is outside your scope looks as if it does not exist:** if you open a record outside your scope you get «not found» (404), not «forbidden», so you cannot even tell whether the record exists.
- If you need a permission, ask your administrator and give its name as shown on «My access».

### Platform admin mode

The administration pages (roles, permissions, page visibility, list management, audit log, settings…) appear only while **platform admin mode** is on. A person who may use it works as an ordinary employee until they switch it on. This protects them from changing something important by mistake.

1. Press «Platform admin mode» at the top of the page. The button shows only for people who hold `admin_mode.use` («Use platform admin mode»).
2. Enter a **fresh code** from the authenticator app. A code already used is refused, so wait for the next one if needed. Backup codes are not accepted here.
3. The administration pages appear and the button reads «Admin mode on». To stop, press «Turn off platform admin mode».

- The mode stops by itself after **30 minutes without admin activity**; a message tells you, and you switch it on again when needed.
- Repeated wrong codes lock the attempts for a few minutes.
- The permissions of your administrative role (such as System Admin) are not counted on «My access» and do not work unless the mode is on.

### Signing in as another employee

A feature for system administrators only, **off by default** and switched on in Settings → Security. When on, a person who holds `impersonation.start` («Sign in as another employee») and is in platform admin mode can work as any active employee, to see what they see and solve their problem.

- The button «Sign in as this employee» is on the employees list and on the employee's page. After you confirm, a fixed bar shows: «You are working as … — signed in by …» with a «Back to my account» button.
- The session ends when you go back to your account, or by itself after some idle minutes (30 by default).
- **What is refused inside the session:** turning on admin mode, changing the employee's security (authenticator, devices, sessions), their roles, groups and access, their account status, and the security settings.
- Everything done is recorded in the audit log under the employee's name with the administrator's beside it, and the employee is notified afterwards.

### The welcome tour

At your first sign-in the platform highlights its real elements one by one and explains each. You can skip it and restart it from «Restart the tour». The details are in the section «The welcome tour».

### Language and page direction

- The platform is in Arabic (right to left, the default) and in English (left to right).
- Switch the language with the button in the top bar or from «Profile». Your choice is saved in your account for every device.

### Light and dark theme

Choose «Light», «Dark» or «Follow the device» with the button in the top bar or from «Profile». Every page works in both themes.

### Ways to view lists

- Every list shows as a **table** or **cards** with the «View» switch, and some lists have a third view that suits their data: a **Kanban board** for tasks and tickets, and a **chart** and an **icicle chart** for the organization structure.
- The platform remembers the last view you chose for each list.

### Search and filters

- Above every list is a **search box** that searches the texts the table shows.
- Beside it are **filters** for everything that can narrow the list: status, owner, unit, type, dates, yes/no. Applied filters are shown and each can be removed; «Clear filters» removes them all.

### Export and import

- **Export:** an «Export» button on every list. You choose the **scope** (the rows shown on the page, or all results of the current search and filters), the **columns** and the file type (Excel or CSV). It needs the export key of that page.
- **Import:** on lists whose records can be created from a file (such as employees and companies). You download the template (it has drop-downs with the system's options), fill it in and upload it. The system checks the file, tells you how many rows are valid and what is wrong in each row, and imports only the valid ones.
- Anywhere that asks for a file or a picture uses the **file drop box**: drag the file onto it or click to browse; it checks the file type and the largest size.

### Row actions are icons

At the end of every row are icons, one for each action on it (edit, delete, open…). Hold the pointer over an icon to see its name. Clicking anywhere on the row itself opens its details in a page or a dialog.

### Notifications

The bell in the top bar alerts you to what concerns you, and every notification is on the «Notifications» page. Some also reach you by e-mail, and the e-mail never carries the text of conversations. The details are in the section «Notifications».

### The four message colors

Every message on the platform (a notice in the page, a pop-up message or a status badge) has one of four colors, with an icon, so the meaning never rests on color alone:

| Color | Meaning |
|---|---|
| Blue (petrol) | Information |
| Yellow | Warning |
| Red | Error |
| Green | Success |

### The audit log

The platform records sensitive operations: sign-ins, changes to employees, roles and permissions, work on tasks and tickets… who did what and when, in sentences you can understand and in categories. Secrets are never recorded. It is read by people who hold the audit-log view key, in platform admin mode.
