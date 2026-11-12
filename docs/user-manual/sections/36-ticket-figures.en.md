## Ticket figures

The figures page shows how the ticket desks performed over the last 30 days: how many tickets are open, how many arrived, how fast they were answered and solved, how they ended, and what needs action today. It shows counts only.

![Ticket figures](../images/en/29-ticket-figures.png)

### Who sees it

- **View permission:** `tickets.figures_view` («View the ticket figures page»). Scopes: own (the units you lead and every unit below), unit, unit and below, company, all.
- **Needs platform admin mode:** yes.
- **Default roles:** the head role of every unit holds it at «unit and below». A platform administrator sees every department.

### What you can do

| Action | What happens | Permission key (label) |
|---|---|---|
| Choose a department | Shows that department only; «All departments» adds them up | `tickets.figures_view` |
| Read the indicators and tables | Counts and averages of the last 30 days | `tickets.figures_view` |

The page is for reading. It has no buttons that change data, and no export or import.

### How to

**Read the figures of one department**

1. Turn on platform admin mode and open **Ticket figures**.
2. At the top choose the department. The list holds every department of the organization structure you may see, even those not set up for tickets (their numbers are zero).
3. Read the blocks from top to bottom.

**See everything together**

1. Choose «All departments».
2. The figures are added up and the tables get a «Department» column.

### Business rules

- The period is the **last 30 days**. (FR-40)
- **Indicators:** Open now; Incoming tickets (with «of which N personal»); Average time to first reply; Average completion time, in hours.
- **How tickets ended:** closed by the sender's confirmation; closed automatically; closed without execution; reopened after closing.
- **By ticket type:** the count of tickets of each type.
- **Ticket assignees:** for each person, open tickets, closed tickets and average time to first reply.
- **What needs action today:** tickets that are overdue or stale; if there are none the page says «Nothing overdue or stale.»
- **Personal tickets** are counted in the totals but never appear in a list, so their content stays private. (FR-40)
- With one department the figures are that department only; with «All departments» they are the sum of the departments you may see.
- A department you lead covers the units below it as well.

### Tips / common problems

- «No departments set up yet»: set up a department on the Ticket setup page and its numbers will appear here.
- The numbers look low: only the last 30 days are counted.
- A person does not appear under assignees: no ticket of the period was assigned to them.
