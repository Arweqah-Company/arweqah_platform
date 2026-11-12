## My access

A page where you read **what you may do on the platform now, and which role or group gives you each permission**, and how far each permission reaches. It is yours alone and nobody else sees it. It is the first place to open when you ask: «why do I not see this page?» or «why can I not use this button?».

![My access](../images/en/15-my-access.png)

### Who sees it

- View key: `my_access.view` («View my access page»), and the export key `my_access.export` («Export my access»). Their scope is «all» because the page concerns your own account.
- Held by everyone with the **Employee** role, by unit heads, and by the collaborator base. You find it in your account menu. It does not need platform admin mode.

### What you can do

| Action | What happens | Permission |
|---|---|---|
| Read «My roles» | You see your roles, each marked «Automatic from the system» or «Given to you» | `my_access.view` (View my access page) |
| Browse the table | You see every permission: «What you can do», «Area», «Reach» and «Source», grouped by area | `my_access.view` |
| Search | By permission, area or source | `my_access.view` |
| Filters: Area, Reach, Source | Narrow the list | `my_access.view` |
| «Turn on platform admin mode» from the notice | Shown to someone with a hidden administrative role (see the rules) | `admin_mode.use` (Use platform admin mode) |
| «Export» | Exports your list of permissions to Excel or CSV | `my_access.export` (Export my access) |

### Table columns

| Column | Meaning |
|---|---|
| What you can do | The name of the permission (every page and every button) |
| Area | The section it belongs to: tasks, tickets, employees… |
| Reach | How far it goes: own record only, their unit, their unit and below, their whole company, all companies, or «their unit and N level(s) below» |
| Source | Where it came from: a role, a group of roles, a group of people, or «given to you directly» |

### How to

**Find out why you do not see something**


1. Open «My access».
2. Type in the search what you want (such as «export» or «employees»).
3. If you do not find it, you do not hold it; ask the system administrator and give its name as written on this page.
4. If you find it, look at «Reach»: you may hold it at a narrower reach than you thought (for example «Own record only»).

**Find the source of a permission**


Look at the «Source» column. If it is an automatic role (such as head of a unit), it changes when your position in the structure changes.

### Fields (form inputs)

The page is read-only. It has a search box, three filters, the export window and the code window of platform admin mode.

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Search my permissions | Finds permissions by the permission, the area or where it comes from | No | Free text |
| Area | Narrows to one section of the platform (tasks, tickets, employees…) | No | The areas of the permissions you hold |
| Reach | Narrows to permissions of one reach | No | Own record only, their unit, their unit and 1 to 5 levels below, their unit and below, their whole company, all companies |
| Source | Narrows to permissions that come from one place | No | A role, a group of roles, a group of people, or given to you directly |
| Scope (in the «Export data» window) | How many rows go into the file | Yes | «The rows shown on this page (N)» or «All results of the current search and filters (N)»; a single export holds a limited number of rows and the window says when it caps |
| Columns | Which columns to put in the file | Yes, at least one | «Select all» / «Clear selection»; the window shows «N of M columns» |
| File type | The format of the file | Yes | Excel (.xlsx) or CSV (.csv) |

**The window «Turn on platform admin mode»** (opened from the notice, only if you may use admin mode)

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Authenticator app code | A fresh code that proves it is really you before the administrative pages and permissions appear | Yes | Exactly 6 digits from the app (a backup code is not accepted); a new code each time and a code already used is refused; after several wrong tries it locks for a few minutes |

### Workflow

1. **You** open «My access» from your account menu. The platform reads your roles, groups and personal permissions once after sign-in.
2. **You** read «My roles» (each marked «by the system» or «given to you») and the table of everything you may do, with its area, reach and source.
3. **You** search or filter when you look for one permission, for example «export».
4. **If something is missing,** you send the permission's name (and the export if you wish) to the system administrator, who gives it from the Permissions page or the employee form.
5. **If a notice says your administrative role is hidden,** you press «Turn on platform admin mode», enter a fresh code, and the hidden permissions appear.
6. **The page refreshes** by itself when admin mode changes.

| Status of admin mode | Meaning | Who can change it (permission key) | Moves to |
|---|---|---|---|
| Off | You work as an ordinary employee; administrative permissions are hidden | You, with a fresh code (`admin_mode.use`, «Use platform admin mode») | On |
| On | The administration pages show and their permissions count | You, by turning it off (`admin_mode.use`) | Off |
| Ended by itself | 30 minutes passed without admin activity | Nobody; the platform ends it | Off (turn it on again when needed) |

**Automatic things:** admin mode ends by itself after 30 minutes without admin activity, and each admin action moves the time forward; turning it on and off, and its automatic end, are recorded in the audit log.

**What each person sees:** only your own permissions. Nothing here is edited; changes are made by the administrator elsewhere.

### Business rules

- It is read-only; permissions are not edited here but on the permissions or roles page by the system administrator.
- If you have an **administrative role** (such as System Admin), its permissions are **hidden here** until you turn on platform admin mode, and a notice says so with the turn-on button.
- If you hold one permission from several sources, the one with the widest reach counts.
- Nobody can give another person a wider permission than they hold themselves.
- The page is read once after sign-in and refreshed when admin mode changes.

### Tips

- A long table? Use the search and filters, or switch the view to cards.
- Send the export to the system administrator when you ask for a permission, so they see exactly what you hold.
