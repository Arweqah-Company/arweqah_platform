## Ticket figures

The figures page shows how the ticket desks performed over the last 30 days: how many tickets are open, how many arrived, how fast they were answered and solved, how they ended, and what needs action today. It shows counts only.

![Ticket figures](../images/en/29-ticket-figures.png)

### Who sees it

- **View permission:** `tickets.figures_view` («View the ticket figures page»). Scopes: own (the units you lead and every unit below), unit, unit and below, company, all.
- **Needs platform admin mode:** yes.
- **Default roles:** the head role of every unit holds it at «unit and below». A platform administrator sees every unit.

### What you can do

| Action | What happens | Permission |
|---|---|---|
| Choose a unit | Shows that unit only; «All units» adds them up | `tickets.figures_view` |
| Read the indicators and tables | Counts and averages of the last 30 days | `tickets.figures_view` |

The page is for reading. It has no buttons that change data, and no export or import.

### How to

**Read the figures of one unit**

1. Turn on platform admin mode and open **Ticket figures**.
2. At the top choose the unit. The list holds every unit of the organization structure you may see, even those not set up for tickets (their numbers are zero).
3. Read the blocks from top to bottom.

**See everything together**

1. Choose «All units».
2. The figures are added up and the tables get a «Unit» column.

### Fields (form inputs)

This page has no create or edit form. It has one filter.

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Unit | Chooses whose figures you read: one unit, or every unit you may see added together. | No (default «All units») | «All units» or one unit of the organization structure inside your scope, including units not yet set up for tickets (their numbers are zero). With one unit the figures are that unit's; with «All units» they are the sum and the tables get a «Unit» column. |

### Workflow

The page does not hold a record that moves through statuses. It reads the tickets that the other two pages produce, as follows.

1. **Units are set up** on the Ticket setup page and employees send and close tickets (see Tickets).
2. **You open the page** (platform admin mode, `tickets.figures_view`) and choose the unit. The system counts the tickets of the chosen units for the last 30 days.
3. **What each number counts:**

| Block | What it counts |
|---|---|
| Open now | Tickets not closed right now |
| Incoming tickets | Tickets that arrived in the period (with «of which N personal») |
| Average time to first reply | Hours from arrival to the first answer from the unit's side |
| Average time to finish | Hours from arrival to closing |
| How tickets ended | Closed by the sender's confirmation, closed automatically, closed without being carried out, reopened after closing |
| By ticket type | Tickets of each type |
| Who handles the tickets | For each person: open, closed, average time to first reply |
| Needs action today | Not-closed tickets whose needed-by date has passed, or open ones quiet longer than the unit's stale days; up to 50, earliest needed-by first; personal tickets are never listed |

4. **A person decides what to do:** for «Needs action today» the leader opens the ticket and follows up with the handler.

There is nothing to approve, no status to move, no automatic timer and no notification on this page. The figures change as the tickets change, and the audit log of the tickets records what produced them.

**What each person sees**

- **The unit leader** sees the figures of their unit and every unit below it.
- **A company-wide or platform administrator** sees every unit inside their scope («All units» for scope «all»).
- **Requesters and handlers without the key** do not see the page. Personal tickets are counted for the unit leader but their content never appears.

### Business rules

- The period is the **last 30 days**. (FR-40)
- **Indicators:** Open now; Incoming tickets (with «of which N personal»); Average time to first reply; Average completion time, in hours.
- **How tickets ended:** closed by the sender's confirmation; closed automatically; closed without execution; reopened after closing.
- **By ticket type:** the count of tickets of each type.
- **Ticket assignees:** for each person, open tickets, closed tickets and average time to first reply.
- **What needs action today:** tickets that are overdue or stale; if there are none the page says «Nothing overdue or stale.»
- **Personal tickets** are counted in the totals but never appear in a list, so their content stays private. (FR-40)
- With one unit the figures are that unit only; with «All units» they are the sum of the units you may see.
- A unit you lead covers the units below it as well.

### Tips / common problems

- «No unit is set up yet»: set up a unit on the Ticket setup page and its numbers will appear here.
- The numbers look low: only the last 30 days are counted.
- A person does not appear under assignees: no ticket of the period was assigned to them.
