## Manage notices

The page of the publisher and the unit leader: the writer writes a notice and sends it for approval, follows its publishing, and sees who acknowledged and who did not. No notice is published before the leader of the writer's unit approves it.

![Manage notices](../images/en/33-notices-manage.png)

### Who sees it

- **View permission:** `notices.manage_view`. A writer sees the notices of their channel (scope «own»), a unit leader what the unit's people wrote and below, a platform administrator everything. Anything outside is shown as «not found».
- **Default roles:** the «Notice writer» role of each channel (given when the writer is added in «Publishing channels») and the head role of each unit.
- No platform admin mode is needed.

### What you can do

| Action | What happens | Permission |
|---|---|---|
| New notice | The writing window: channel, publish date, type, title, text, audience, attachments | `notices.create` |
| Edit | Edit your draft or a rejected notice | `notices.edit` |
| Send for approval | Goes to your unit leader once the fields are complete | `notices.submit` |
| Delete | Deletes a draft after a confirmation | `notices.delete` |
| Pin / unpin | One published notice shows on everyone's home page | `notices.pin` |
| Archive | The notice leaves «My notices»; the acknowledgement report stays | `notices.archive` |
| Edit as a new version | The published notice is hidden from employees until the leader approves the new version | `notices.revise` |
| Cancel the edit and bring back the old version | The published version is visible at once and your edit is deleted | `notices.revise_cancel` |
| Acknowledgements tab | Who got it, who acknowledged, who did not | `notices.ack_report` |
| Export acknowledgements | Exports the list | `notices.ack_export` |
| Export the notices list | The rows or all results | `notices.export` |

There is no import: a notice is written and approved, not made from a file. A row's icons depend on the notice's state and your keys.

### How to

**Write a notice**

1. Click **New notice**. Choose the channel (only yours are listed), the publish date (today or later) and the type: announcement or policy to acknowledge.
2. Write the Arabic title (the English one fills in automatically) and the text.
3. Choose the audience: all employees, or units (and below), titles and groups; every active unit, every job title and every group of people is offered to any writer whatever their other permissions (with search by name); «Reaches N employees» shows.
4. Attach up to 5 files, then **Save as draft** or **Send for approval** (off until the fields are complete, with the reason beside it).

**Edit a published notice:** click the «Edit as a new version» icon and confirm; the notice is hidden from employees, then edit and send. To go back, click «Cancel the edit and bring back the old version».

**Follow a notice:** click the row to open the details: text, approval (a timeline with names, dates and the rejection reason), audience, acknowledgements.

### Business rules

- A writer does not approve their own notice; it goes to the leader of the unit above, or to a platform administrator when there is none.
- A rejected notice returns as a draft with a required reason; for a new version the published one stays hidden until it is edited and approved or the edit is cancelled.
- No extra reminder: the only notification is at publishing, in batches for a large audience.
- The platform administrator sees every active channel when writing a new notice and may write in all of them without being added as a writer; everybody else writes only in the channels they were added to.
