## Ticket setup

Here the leader of a unit decides whether the unit receives tickets, what the sender reads about it, which kinds of ticket it takes, who handles each kind, and how long each step may take. Any unit of the organization structure (sector, department, section, unit, office) can be a ticket desk.

![Ticket setup](../images/en/28-ticket-setup.png)

### Who sees it

- **View permission:** `tickets.setup_view` («View the ticket setup page»). Scopes: own (the units you lead and every unit below), unit, unit and below, company, all.
- **Needs platform admin mode:** yes. Without it the page only says that admin mode must be turned on.
- **Default roles:** the head role created automatically for every unit holds the setup keys at «unit and below». Ordinary employees do not.
- You see only the units inside your scope; a person with scope «all» sees every unit.

### What you can do

| Action | What happens | Permission key (label) |
|---|---|---|
| Choose the unit | Shows the setup of that unit (a tree picker, with search) | `tickets.setup_view` |
| Change reception, descriptions, durations and Save | Saves the unit's settings | `tickets.setup_edit` (Edit a unit's reception and durations) |
| Add type | Opens a popup for a new kind of ticket | `tickets.type_create` (Add a ticket type) |
| Edit type (pencil icon) | Changes a type | `tickets.type_update` (Edit a ticket type) |
| Delete type (bin icon) | Deletes or deactivates a type | `tickets.type_delete` (Delete a ticket type) |

The page has two tabs: **Settings** and **Types**.

### How to

**Switch on a desk**

1. Turn on platform admin mode and open **Ticket setup**.
2. Choose the unit. Under the picker you see «Manager: …»; if there is none, set the manager in the organization structure first.
3. In **Settings**, set the reception status to «Active» and write the description the sender will read (Arabic and English).
4. Set the durations and click **Save**.

**Add a ticket type**

1. Open the **Types** tab and click **Add type**.
2. Write the name and the description (Arabic and English).
3. Choose the assignee: the employee who receives tickets of this kind. Leave it empty and the unit manager handles them.
4. Optionally set a special duration in working days; leave it empty to use the unit's usual duration.
5. Tick «Personal type» if the type is for complaints or private matters; a personal type must have an assignee. Keep «Active type» ticked and save.

**Pause reception**

1. In **Settings** choose «Paused» (the unit shows as disabled with a message, and you resume it by hand) or «Stopped» (the unit is not shown to anyone).
2. Save. Tickets already open continue to be handled as usual.

### Business rules

- **Reception status:** Active (the unit appears and receives tickets), Paused (appears disabled with a message), Stopped (not shown to anyone). A unit with no manager cannot be activated. (FR-36)
- Nothing is accepted before the unit's start date.
- **Durations** (all whole numbers of days, each with its limits shown on screen) (FR-36, FR-41):
  - the usual completion time, in working days (Friday and Saturday are off); default 3
  - the earliest date a sender may ask for, default 0
  - automatic close after a close request, default 4
  - the time allowed to reopen a closed ticket, default 7
  - a ticket counts as stale after, default 14
- A type has a name, a description, an assignee, an optional special duration and a flag for personal. If no assignee is set, the unit manager handles the ticket.
- **Personal types** are invisible to the unit manager and to platform administrators; they need an active assignee. (FR-38)
- **Deleting a type:** if tickets already use it, it is only deactivated and keeps its tickets; otherwise it is deleted. The message tells you which happened.
- A unit that takes tickets (active or paused) or has open tickets cannot be moved or deleted in the organization structure.
- The unit manager is chosen in the organization structure, not on this page.
- Changes are recorded in the audit log.

### Tips / common problems

- «This page works in platform admin mode»: turn the mode on from the top of the page.
- «Active» is refused: the unit has no manager yet.
- A sender says the unit is not offered: check that reception is Active, the start date has come, and the unit has at least one active type.
