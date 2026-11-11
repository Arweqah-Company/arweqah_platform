## My access

A page where you read **what you may do on the platform now, and which role or group gives you each permission**, and how far each permission reaches. It is yours alone and nobody else sees it. It is the first place to open when you ask: «why do I not see this page?» or «why can I not use this button?».

![My access](../images/en/15-my-access.png)

### Who sees it

- View key: `my_access.view` («View my access page»), and the export key `my_access.export` («Export my access»). Their scope is «all» because the page concerns your own account.
- Held by everyone with the **Employee** role, by unit heads, and by the collaborator base. You find it in your account menu. It does not need platform admin mode.

### What you can do

| Action | What happens | Permission key |
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

### Business rules

- It is read-only; permissions are not edited here but on the permissions or roles page by the system administrator.
- If you have an **administrative role** (such as System Admin), its permissions are **hidden here** until you turn on platform admin mode, and a notice says so with the turn-on button.
- If you hold one permission from several sources, the one with the widest reach counts.
- Nobody can give another person a wider permission than they hold themselves.
- The page is read once after sign-in and refreshed when admin mode changes.

### Tips

- A long table? Use the search and filters, or switch the view to cards.
- Send the export to the system administrator when you ask for a permission, so they see exactly what you hold.
