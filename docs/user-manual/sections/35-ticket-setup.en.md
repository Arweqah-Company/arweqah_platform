## Ticket setup

Here the leader of a unit decides whether the unit receives tickets, what the sender reads about it, which kinds of ticket it takes, who handles each kind, and how long each step may take. Any unit of the organization structure (sector, department, section, unit, office) can be a ticket desk.

![Ticket setup](../images/en/28-ticket-setup.png)

### Who sees it

- **View permission:** `tickets.setup_view` («View the ticket setup page»). Scopes: own (the units you lead and every unit below), unit, unit and below, company, all.
- **Needs platform admin mode:** yes. Without it the page only says that admin mode must be turned on.
- **Default roles:** the head role created automatically for every unit holds the setup keys at «unit and below». Ordinary employees do not.
- You see only the units inside your scope; a person with scope «all» sees every unit.

### What you can do

| Action | What happens | Permission |
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

### Fields (form inputs)

**Unit picker**

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Unit | The unit whose setup you want to see or change. Under it you read «Manager: …». | Yes | A unit inside your scope (tree picker with search). A unit without a manager shows «This unit has no manager yet: assign one in the organization structure to activate it.» |

**Settings tab: reception**

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Reception status | Decides whether employees can send tickets to the unit now. | Yes | «Active» (listed and receives tickets), «Paused for now» (listed but disabled with a message; you resume it by hand), «Stopped» (not listed for anyone). Existing tickets are handled as usual in every state. A unit without a manager cannot be set to Active. |
| Accepts personal requests (the unit manager does not see them) | Lets the unit take personal types (complaints, private matters). | No | Tick box. Without it, personal types of this unit are refused. |
| Unit description for the sender (Arabic) / (English) | The sentence the employee reads when choosing this unit: what the unit does and what to send it. | No | Up to 500 characters each. The English one is filled from the Arabic when left empty. |

**Settings tab: durations** (each a whole number of days, with its limits shown under the field)

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Usual completion time | The time the unit normally needs. It pre-fills the sender's needed-by date and is shown to senders. In working days (Friday and Saturday are off). | Yes | 1 to 60; default 3. A type may override it. |
| Earliest date that can be asked for | The minimum lead: a sender cannot ask for a date earlier than today plus this. In working days. | Yes | 0 to 30; default 0. |
| Automatic closing after a closing request | Days after «Request closing» when the system closes the ticket if the sender has not answered. In calendar days. | Yes | 1 to 30; default 4. |
| Time allowed for reopening | Days after closing during which the sender may reopen. In calendar days. | Yes | 1 to 60; default 7. |
| A ticket is stale after | Days without any activity on an open ticket before it is marked «Stale» and the unit is reminded. In calendar days. | Yes | 1 to 90; default 14. |

**Types tab: Add type / Edit the type**

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Name in Arabic / Name in English | The name of the kind of request, shown to the employee when they send. | Yes | 2 to 120 characters each. The English one is filled from the Arabic when left empty. |
| Description in Arabic / in English | One line telling the employee when to choose this type. | No | Up to 300 characters each. |
| Assignee | The employee who receives and handles tickets of this type, and who is notified when one arrives. Empty means the unit manager handles them. | Only for a personal type | An active employee of the unit's company (search by name or number). |
| Own duration in working days | The usual time for this type only; it pre-fills the sender's date. Empty uses the unit's usual completion time. | No | 1 to 60 whole days. |
| Personal type: the unit manager does not see it, only the sender and the assignee | Makes every ticket of this type private to its sender and its assignee. | No | Tick box. Needs an assignee, and the unit must accept personal requests. |
| Active type | An inactive type is no longer offered to senders; its old tickets stay. | No | Tick box, on by default. |

### Workflow

**How a unit becomes a ticket desk**

1. **The unit leader** turns on platform admin mode and opens **Ticket setup**, then chooses the unit. A unit that was never set up shows the defaults (reception stopped, durations 3 / 0 / 4 / 7 / 14).
2. In the organization structure someone sets the unit's **manager** (not on this page); a unit without a manager cannot be activated.
3. In **Settings** the leader sets reception to «Active», writes the description and the durations, and presses **Save**. The settings are stored and the change is recorded in the audit log.
4. In **Types** the leader adds the kinds of request, each with its assignee and optional own duration, and presses **Save**.
5. From now on employees see the unit when they press **New ticket**: it is listed if reception is Active (or Paused, disabled), its start date has come, and it has at least one active type. The ticket workflow then follows the Tickets page.
6. When the leader changes the settings later, only new tickets use the new values; changing a type's assignee affects new tickets, and also open personal tickets whose old assignee is no longer active (the manager is told how many moved, never which).

| Status (reception) | Meaning | Who can move it (permission key) | Moves to |
|---|---|---|---|
| Active | The unit is listed and receives tickets | The unit leader: `tickets.setup_edit` (needs a manager) | Paused for now; Stopped |
| Paused for now | Listed but disabled with a message; resumed by hand | The unit leader: `tickets.setup_edit` | Active; Stopped |
| Stopped | Not listed for anyone (the starting state of a new unit) | The unit leader: `tickets.setup_edit` | Active; Paused for now |

| Type | Meaning | Who can move it (permission key) | Moves to |
|---|---|---|---|
| Active | Offered to senders | `tickets.type_update` | Inactive (untick «Active type») |
| Inactive | Hidden from senders; its tickets stay | `tickets.type_update`, or `tickets.type_delete` on a type that has tickets | Active |
| Deleted | Removed (only when no ticket uses it) | `tickets.type_delete` | none |

**Automatic things**

- The settings drive the automatic parts of the ticket workflow: automatic closing, the stale reminder, the reopen window, the needed-by date and the first-response clock.
- Reception rules are checked at the moment of sending: paused, not started or no manager refuses the ticket with a clear message.
- Deleting a type that has tickets only deactivates it, and the message says so.
- A unit that takes tickets (active or paused) or has open tickets cannot be moved or deleted in the organization structure.
- Every change of settings and every type added, edited or removed is recorded in the audit log.

**What each person sees**

- **The unit leader** (head role at «unit and below») sees and sets up their unit and every unit below it, in platform admin mode.
- **A company-wide or platform administrator** sees the units inside the scope of their keys (all units at «all»).
- **Employees and senders** never see this page; they only see the result: the unit, its description, the types and the usual time in the «New ticket» window.

### Business rules

- **Reception status:** Active (the unit appears and receives tickets), Paused (appears disabled with a message), Stopped (not shown to anyone). A unit with no manager cannot be activated. (FR-36)
- Nothing is accepted before the unit's start date.
- **Durations** (all whole numbers of days, each with its limits shown on screen) (FR-36, FR-41):
  - the usual completion time, in working days (Friday and Saturday are off); default 3
  - the earliest date a sender may ask for, in working days, default 0
  - automatic close after a close request, in calendar days, default 4
  - the time allowed to reopen a closed ticket, in calendar days, default 7
  - a ticket counts as stale after, in calendar days, default 14
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
