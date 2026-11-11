## Task categories

Every department keeps its own categories for its tasks, for example «Reports» or «Meetings». A category is chosen when a task is created or edited, and tasks can be filtered by it. This page lists the categories and lets authorised people add, edit and delete them.

### Who sees it

- **View permission:** `tasks.tags_view` («View the task tags page»). Scopes you can give: own (the person's own department), unit, unit and below, company, all.
- **Default roles:** no default role holds it, including the Employee role and the unit head role. An administrator gives it from the permissions page.
- The page does not need platform admin mode. It appears in the menu under Tasks, and can be hidden by page visibility.

### What you can do

| Action | What happens | Permission key (label) |
|---|---|---|
| Add category | Opens a popup to create a category | `tasks.tag_create` (Add a task tag) |
| Edit (row icon, or click the row) | Changes the names, the department or the status | `tasks.tag_update` (Edit a task tag) |
| Delete (row icon) | Deletes the category after confirmation | `tasks.tag_delete` (Delete a task tag) |
| Export | Exports the list (scope, columns, file type) | `tasks.export` (Export task lists) |
| Search | Searches the name or the department | — |
| Filter by status | Shows only active or only inactive categories | — |
| Table / cards | Switches the way the list is shown | — |

The list has no import: categories are few and are added one by one.

### How to

**Add a category**

1. Click **Add category**.
2. Write the name in Arabic and the name in English (the English name can be filled in automatically while you type Arabic).
3. Choose the department the category belongs to.
4. Keep «Active (shown when tasks are created)» ticked, then save.

**Stop using a category without deleting it**

1. Click the row, untick «Active», and save.
2. The category no longer appears when tasks are created, and old tasks keep it.

**Delete a category**

1. Click the delete icon on the row.
2. Read the confirmation «Delete the category?» and confirm.

### Business rules

- A category belongs to **one department** only. People creating a task see the categories of their department. (FR-54)
- Both names (Arabic and English) are required.
- Only **active** categories are offered when creating tasks.
- If tasks use a category, **deactivate** it instead of deleting it; the confirmation message says so.
- Your permission scope decides which departments' categories you may add, edit or delete: «own» means your own department; wider scopes reach the units below you, the company, or everything.
- The categories also decide who may see the conversation of a task: a colleague with an open task in the same category may read, write and reply in that task's conversation (see Task details and conversation).
- Changes are recorded in the audit log.

### Tips / common problems

- The category list is empty when creating a task: your department has no active category yet. Ask someone with `tasks.tag_create` to add one.
- You cannot delete a category: tasks use it. Deactivate it.
