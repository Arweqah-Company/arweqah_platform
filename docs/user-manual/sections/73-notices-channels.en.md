## Publishing channels

Any unit of the organization structure can have publishing channels, and each channel has its writers. **Making a channel sets up its writers' permissions automatically**, **adding a writer gives them at once the permissions to write in their channel only**, with no new sign-in, and removing them takes the permissions back. The batch publishing settings are set here.

![Publishing channels](../images/en/35-notices-channels.png)

### Who sees it

- **View permission:** `notices.channels_view`. You see every channel whose **unit** your keys reach: `notices.writer_add` and `notices.writer_remove` (writers), `notices.channel_add` and `notices.channel_remove` (channels).
- A unit leader holds the four keys at scope «unit and below» automatically through the unit-head role: they manage the channels of their unit and below and see all their writers. Whoever is granted a key at a wider scope from the permissions page manages them in every unit, as does a platform administrator. A channel of no unit (company-wide) is managed by a platform administrator only.
- No platform admin mode is needed.

### What you can do

| Action | What happens | Permission |
|---|---|---|
| Add a channel | Makes a channel for a unit (two names and a unit); its writers' role is made automatically | `notices.channel_add` |
| Rename a channel | Changes its name and the name of its writers' role; the unit stays | `notices.channel_add` |
| Disable or enable a channel | A disabled channel takes no new notice and its writers lose their permissions, keeping their membership and its notices; enabling brings them back | `notices.channel_remove` |
| Delete a channel | Only a channel that never had a notice; its role goes with it | `notices.channel_remove` |
| Add a writer | Adds an employee and gives them the channel's writer role | `notices.writer_add` |
| Remove a writer | Takes the role back; their drafts stay | `notices.writer_remove` |
| Batch size and gap | Saves the batch publishing settings | `notices.settings_edit` |
| Export | Exports the list of channels and the writers of a channel | `notices.channels_export` |

There is no import: a channel is made from a window that checks the name and the unit, and a writer is added from a list that checks the employee.

### How to

**Add a channel**

1. Click **Add a channel**.
2. Type its name in Arabic and in English (up to 90 characters; a name is never repeated).
3. Pick the **unit** from the list (only the units your key reaches). The unit cannot change after the channel is made.
4. Click **Add the channel**.

**A channel's writers:** click the channel's row (or the writers icon) to open its writers.

**Add a writer**

1. In the channel's writers window click **Add a writer**.
2. Type the first letter of the employee's name and pick them from the list (their title and unit show). **Add the writer** stays off until you pick from the list.
3. If a notice says they have no leader above, a platform administrator will approve their notices. Click **Add the writer**.

**Remove a writer:** the remove icon on their row, then a confirmation that says how many drafts and notices waiting for approval they have.

**Disable or delete a channel:** from the icons of its row, after a confirmation that says how many writers it has. The delete icon is off for a channel that has notices (disable it instead).

**Batch publishing:** change the batch size (1–5000) and the gap (1–60 minutes); a line shows «An audience of N employees gets the notice in X batches over Y minutes».

**Search and filters:** search by the channel's name (Arabic or English) or its unit, filter by unit and by state (active or disabled), and switch between table and cards.

### Business rules

- A writer writes only in their channel and does not approve their own notice, and nobody writes in a disabled channel.
- The writer and channel keys are checked against the **channel's unit**, so a unit head neither sees nor changes another unit's channel («not found»). The people to add as writers are the employees within your key's scope.
- The first two channels (human resources and corporate communications) are ordinary channels tied to their units.
