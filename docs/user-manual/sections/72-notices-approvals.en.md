## Waiting for my approval

The notices written by the people of your unit and below and sent for your approval. You review the text, the audience and the publish date as they are, then approve or reject. They are not published before you approve.

![Waiting for my approval](../images/en/34-notices-approvals.png)

### Who sees it

- **View permission:** `notices.approve_view` at scope «unit and below». A count shows beside it in the sidebar.
- **Default roles:** the head role of each unit.
- Anything outside your scope is shown as «not found».

### What you can do

| Action | What happens | Permission |
|---|---|---|
| View | Opens the notice details (a side-by-side comparison for a new version) | `notices.approve_view` |
| Approve | After a confirmation: «It will be published on {date} to N employees» (a new version at once) | `notices.approve` |
| Reject | With a required reason of five characters that goes back to the writer | `notices.reject` |
| Export | The rows or all results | `notices.export` |

There is no import: a notice is not made from a file.

### How to

1. Open the page; each row shows the title, type (and a «Version 2» badge for edits), writer and unit, when it was sent, publish date and audience.
2. Click the row to read the details.
3. Click **Approve** and confirm, or **Reject** and write the reason (the button stays off until five characters).

### Business rules

- You do not approve a notice you wrote: it goes to the leader of the unit above.
- Approving or rejecting a notice whose state changed before you shows an error and does nothing.
- Search by title or writer; filter by channel, type, writer and sent date.
