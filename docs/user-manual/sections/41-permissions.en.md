## Permissions

### What this page is

Every page of the platform has a «view» key, and every button or action (add, edit, delete, approve, export, import…) has its own key. This page is the single place where an administrator decides what a **role**, a **group of roles**, **one person** or a **group of people** may do, and how far. You choose what the permissions go on, then tick what they may do and the scope.

![Permissions](../images/en/10-permissions.png)

### Who sees it

| Item | Detail |
|---|---|
| View key | `permissions.view` (View the permissions page) |
| Default scope | All |
| Platform admin mode | Required |
| Default roles that hold it | Only the built-in «System Admin» role (it holds every key). Other roles start without the keys of this page and an administrator gives them |


### What you can do

| Action | What happens | Permission key (label) |
|---|---|---|
| Choose «Place permissions on» (a role / a group of roles / one person / a group of people), then the name | The page shows the current permissions of what you chose | `permissions.view` (View the permissions page) |
| Tick permissions, choose their scope and save them on a **role** | They apply to everyone who holds the role | `permissions.role_update` (Set the permissions of a role) |
| Save on a **group of roles** | They apply to everyone the group is given to and everyone who holds one of its roles | `permissions.role_group_update` (Set the permissions of a group of roles) |
| Save on **one person** | They belong to that person alone, on top of what their roles and groups give | `permissions.user_update` (Set the permissions of one person) |
| Save on a **group of people** | They apply to every member of the group | `permissions.user_group_update` (Set the permissions of a group of people) |
| «New group of roles» | Creates a group bundling roles under one name | `role_groups.create` (Add a role group) |
| «Edit the group» (group of roles) | Change the name and the roles inside | `role_groups.update` (Edit a role group) |
| Delete (group of roles) | Deletes it after you confirm | `role_groups.delete` (Delete a role group) |
| «New group of people» | Creates a group of people | `user_groups.create` (Add a user group) |
| «Edit the group» (group of people) | Change the name, add and remove members | `user_groups.update` (Edit a user group and its members) |
| Delete (group of people) | Deletes it after you confirm | `user_groups.delete` (Delete a user group) |
| «Select all permissions» / «Clear all» / search | Shortcuts inside the matrix | No extra key |

> The «Save» button shows only to people who hold the save key for the kind chosen. Groups are listed according to their view keys (`role_groups.view` and `user_groups.view`).

### How to

**Place permissions on a role**

1. Turn on «Platform admin mode», then open «Permissions».
2. In «Place permissions on» choose «A role», then choose the role in the «Role» list.
3. Tick the permissions a holder of the role may use, and choose the scope of each from the list beside it.
4. Press «Save». The message «Permissions saved.» appears.

**Give one person particular permissions**

1. Choose «One person».
2. Open the «Person» list, or type a letter of the name or e-mail to narrow it, then choose the person.
3. Tick the extra permissions to give them alone. What already reaches them through their roles and groups shows with the badge «Comes from roles and groups» and its scope.
4. Press «Save».

**Create a group of roles and give it permissions**

1. Choose «A group of roles» and press «New group of roles».
2. Type the Arabic and English names and an optional description, choose the roles it bundles (search by name) and save.
3. Pick the group from the list, tick the extra permissions for it, and press «Save».

**Create a group of people**

1. Choose «A group of people» and press «New group of people».
2. Type the two names, search people by name or e-mail and add them, then save.
3. Pick the group, tick its permissions and press «Save».

### Scopes

Beside each permission is the scope list (shown only for permissions that allow more than one scope):

| Scope | Covers |
|---|---|
| Own record only | The person's own record |
| Their unit | Records of their organization unit (and the units they manage) |
| Their unit and 1 … 5 levels below | The unit and a set number of levels below it |
| Their unit and below | The unit and everything below with no limit |
| Their whole company | Every record of their company |
| All companies | Every company |

### Business rules

- **Nobody places more than they hold:** you cannot place a permission at a wider scope than yours, nor fields you cannot change yourself; the attempt is refused.
- **Permissions add up:** a person gets the total of what comes from their roles, groups of roles, groups of people and what was given to them alone; the widest wins when the same permission repeats. The matrix shows what reaches the chosen target from elsewhere, with a badge beside the permission.
- **The fields a holder of «Edit employees» may change:** beside this permission a «Fields they may change (count)» button opens a window to choose which fields of the employee record its holder may change, grouped (personal details, contact, work, identity and name, contract and insurance, pay and account, notes, structure and relation) with «Basic», «All» and «None». It starts with the basic data (contact and personal). These fields add to what other roles give the same person, apply to the records the scope reaches, and the person's own record always counts. The unit, job title and manager also need the permission «Change placement from a date».
- **Keys are declared:** every page and button has a key with Arabic and English labels; a person without a key does not see the button, and the platform refuses the action if they try another way.
- **Deleting a group:** the people it was given to (or its members) lose the permissions that came through it.
- **Audit:** every change is recorded in the audit log, with key names only (FR-47).
- **Personal permissions** later show in the «Exceptions» tab of the Roles page with their end date, if any.
- **What an ordinary employee gets:** every employee starts with the «Employee» role, which holds their account pages, tasks, tickets, team directory and the structure page. Everything else is given from this page or from the employee form.

### Tips and common problems

- **The message «This page works in platform admin mode» appears:** turn the mode on at the top of the page with a fresh authenticator code; it stops by itself after 30 minutes without admin activity.
- **The «Save» button is missing:** you need the save key for the kind you chose (role, group of roles, person or group of people).
- **I search for a person and they do not show:** type the first letter of their name or e-mail.
- **Saving was refused:** most likely you are trying to give a scope or fields wider than you hold.
