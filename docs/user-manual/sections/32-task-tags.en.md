## Task tags

Every unit keeps its own tags for its tasks, for example «Reports» or «Meetings». A tag is chosen when a task is created or edited, and tasks can be filtered by it. This page lists the tags and lets authorised people add, edit and delete them.

![Task tags](../images/en/26-task-tags.png)

### Who sees it

- **View permission:** `tasks.tags_view` («View the task tags page»). Scopes you can give: own (the person's own unit), unit, unit and below, company, all.
- **Default roles:** no default role holds it, including the Employee role and the unit head role. An administrator gives it from the permissions page.
- The page does not need platform admin mode. It appears in the menu under Tasks, and can be hidden by page visibility.

### What you can do

| Action | What happens | Permission |
|---|---|---|
| Add a tag | Opens a popup to create a tag | `tasks.tag_create` (Add a task tag) |
| Edit (row icon, or click the row) | Changes the names or the status (the unit cannot be changed) | `tasks.tag_update` (Edit a task tag) |
| Delete (row icon) | Deletes the tag after confirmation | `tasks.tag_delete` (Delete a task tag) |
| Export | Exports the list (scope, columns, file type) | `tasks.export` (Export task lists) |
| Search | Searches the name or the unit | — |
| Filter by status | Shows only active or only inactive tags | — |
| Table / cards | Switches the way the list is shown | — |

The list has no import: tags are few and are added one by one.

### How to

**Add a tag**

1. Click **Add a tag**.
2. Write the name in Arabic and the name in English (the English name can be filled in automatically while you type Arabic).
3. Choose the unit the tag belongs to.
4. Keep «Active (shown when tasks are created)» ticked, then save.

**Stop using a tag without deleting it**

1. Click the row, untick «Active», and save.
2. The tag no longer appears when tasks are created, and old tasks keep it.

**Delete a tag**

1. Click the delete icon on the row.
2. Read the confirmation «Delete the tag?» and confirm.

### Fields (form inputs)

**Add a tag / Edit the tag** (the dialog keeps the title «Add a tag» or «Edit the tag»; the menu item is «Task tags» and the list column is «Tag»)

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Unit | The unit the tag belongs to. Only people of that unit, and the units below it, will be offered the tag when they create tasks. It is chosen only when adding; an existing tag cannot be moved to another unit. | Yes (adding) | One of the units in the scope of your `tasks.tag_create` key. |
| Arabic name | The name shown in Arabic. | Yes | 2 to 120 characters. |
| English name | The name shown in English; filled in automatically while you type the Arabic name, and you may change it. | Yes | 2 to 120 characters. |
| Active (offered on new tasks) | Whether people can choose the tag on new tasks. Untick it to stop using the tag without losing it from old tasks. | No | Ticked by default. |

### Workflow

A tag has a short life, and it works behind the tasks that use it.

1. A person with `tasks.tag_create` clicks **Add a tag**, chooses the unit, writes the two names and saves. The tag is **active** at once.
2. When someone creates a task, the «Tag» list offers the active tags of their unit and of the units above it. The person chooses one (or none). The tag is also checked again when the task is saved.
3. Colleagues with an open task in the same tag may join the conversation of each other's tasks (reading, writing and replying by default).
4. To retire the tag, a person with `tasks.tag_update` unticks «Active». Old tasks keep it; new tasks no longer offer it.
5. To remove it, a person with `tasks.tag_delete` clicks the delete icon and confirms. A tag that tasks use is refused: turn it off instead.

| Status | Meaning | Who can move it (permission key) | Moves to |
|---|---|---|---|
| Active | Offered on new tasks. | Edit: `tasks.tag_update`. | Inactive, Deleted. |
| Inactive | Hidden from new tasks; old tasks keep it. | Edit: `tasks.tag_update`. | Active, Deleted. |
| Deleted | Removed from the list; allowed only when no task uses it. | Delete: `tasks.tag_delete`. | Final. |

**Automatic things:** nothing runs on a schedule. The tag is checked when a task is created or edited (it must be active and belong to a unit of the creator or of the assignee). Adding, editing and deleting a tag are recorded in the audit log.

**What each person sees:** a person with `tasks.tags_view` sees the tags of the units in the scope of the key (own = their own unit). Everyone who creates a task sees, in the form, only the active tags of their unit and above. The tag name appears on the task cards and in the tag filter of the lists.

### Business rules

- A tag belongs to **one unit** only. The New task form offers the active tags of the creator's unit and of the units above it; a tag is accepted when it belongs to such a unit of the creator or of the assignee. (FR-54)
- Both names (Arabic and English) are required.
- Only **active** tags are offered when creating tasks.
- If tasks use a tag, **deactivate** it instead of deleting it; the confirmation message says so.
- Your permission scope decides which units' tags you may add, edit or delete: «own» means your own unit; wider scopes reach the units below you, the company, or everything.
- The tags also decide who may see the conversation of a task: a colleague with an open task in the same tag may read, write and reply in that task's conversation (see Task details and conversation).
- Changes are recorded in the audit log.

### Tips / common problems

- The tag list is empty when creating a task: your unit and the units above it have no active tag yet. Ask someone with `tasks.tag_create` to add one.
- You cannot delete a tag: tasks use it. Turn it off.
