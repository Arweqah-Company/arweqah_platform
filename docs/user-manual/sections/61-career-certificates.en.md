## Certificate review

«Certificate review» is the page where the proofs that employees sent for the units of their learning plan are decided. You open a proof, look at the file and the unit, then approve it (its hours start to count), reject it with a reason, or refer it to the employee's direct manager. It is for the reviewer of learning proofs, normally the employee development officer.

![Certificate review](../images/en/19-career-certificates.png)

### Who sees it

- View permission: `career_certificates.review` (View the certificate review page and its files), scope: all. The review scope is all employees; it is not narrowed by unit.
- Default role: **Employee development officer** (made once by the platform when it does not exist yet, with the five certificate keys). The platform manager can add the keys to any other role or person from the permissions page.
- It does not need platform admin mode for the officer role.
- Menu: the group «Career file», item «Certificate review».

### What you can do

| Action | What happens | Permission |
|---|---|---|
| Open the page, search and filter | Lists the proofs; search by employee or unit; filters: kind of proof (certificate, applied at work, written output) and state | `career_certificates.review` (View the certificate review page and its files) |
| Open the proof (eye icon or a click on the row) | A review window: the employee, the unit, the kind of proof, the hours that will count, the date sent, the file with an open button and the note of the employee | `career_certificates.review` (View the certificate review page and its files) |
| Approve (check icon) | The proof becomes approved and the hours of the unit count for the employee | `career_certificates.approve` (Approve the proof of a learning unit) |
| Reject with a reason (X icon) | The proof is rejected, the reason is saved and the employee is told | `career_certificates.reject` (Reject the proof of a learning unit with a reason) |
| Refer to the direct manager (arrow icon) | The proof goes to the employee's direct manager to decide | `career_certificates.refer` (Refer a proof to the direct manager) |
| Export the list | Downloads the list (scope, columns, file type) | `career_certificates.export` (Export the list of certificates) |

A button you do not hold the key for is hidden; the approve, reject and refer buttons show only on a proof that can still be decided.

### How to

**Approve a proof**

1. Open «Certificate review». The page says «You review the proofs of every employee here».
2. Search by the name of the employee or the unit, or filter by the kind of proof or the state.
3. Click the row to open the proof. Read the details and press «Open the file» to see the certificate.
4. Press «Approve». You get «The proof was approved.» and the hours of the unit count.

**Reject a proof**

1. Open the proof, or press the X icon on its row.
2. Write the reason (at least 5 characters). The window says how many times this unit was rejected before.
3. Press «Reject the proof». The employee is told, sees the reason on the unit and can send a new proof.

**Refer a proof to the direct manager**

1. Open the proof that is waiting for approval.
2. Press «Refer to the direct manager». The state becomes «With the direct manager».
3. The manager decides it from «My career team». You can still decide it yourself if you need to.

### Fields (form inputs)

The only form of this page is the rejection dialog. Approving and referring are buttons with no input. The search and the filters narrow the list.

**Reject the proof (dialog «Reject the proof»)**

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Reason for rejection | Why the proof is refused, in words the employee can act on: the employee reads it on the unit and in the notice | Yes | From 5 to 500 characters (shorter shows «Write a reason of at least 5 characters.»). The dialog also says how many times this unit was rejected before |

**Search and filters of the list**

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Search the proofs | Narrows the list by the name of the employee or the unit | No | Up to 120 characters |
| Kind of proof | Narrows by how the proof was given | No | Certificate, Applied at work, Written output |
| State | Narrows by where the proof stands | No | Waiting for approval, With the direct manager, Done, Rejected |

### Workflow

A proof is one record for one employee and one unit, run by the machine `career.certificate`.

1. The employee presses «Send a proof» on a unit and sends it with a kind, a file (certificate) and an optional note.
2. A **certificate** or a **written output** starts «Waiting for approval» with the reviewer (this page). An **applied at work** proof starts «With the direct manager» and goes to «My career team», not to this queue first.
3. The reviewer opens the proof, reads the file and the unit, and chooses: **Approve** (the hours of the unit count), **Reject with a reason**, or **Refer to the direct manager**.
4. A referred proof waits for the manager, who approves or rejects it from «My career team». The reviewer can still decide it meanwhile.
5. The employee is told of an approval or a rejection (with the reason). After the third rejection of the same unit the employee's direct manager is told too.
6. A rejected proof is replaced by the next one the employee sends (the same record, with a new run and the count of rejections kept).

| Status | Meaning | Who can move it (permission key) | Moves to |
|---|---|---|---|
| Waiting for approval | Sent; with the reviewer | `career_certificates.approve` (approve), `career_certificates.reject` (reject), `career_certificates.refer` (refer) | Done, Rejected or With the direct manager |
| With the direct manager | A work application, or a proof the reviewer referred | The manager: `career_team.decide`; the reviewer may also decide it with the approve and reject keys | Done or Rejected |
| Done | Approved; the hours of the unit count and a unit counts once (final) | — | — |
| Rejected | Refused with a reason; the number of rejections is kept | The employee sends a new proof: `career_learning.upload` | Waiting for approval, or With the direct manager |

Two people deciding at once: the first decision wins and the second gets «The decision could not be made: someone else may have decided it. Refresh the page.»

**Automatic things**

- **Notices:** the employee is told when a proof is approved or rejected (the reason is in the notice); the direct manager is told after the third rejection of the same unit. Sending a proof and referring it send no notice; the proof appears in the queue of the person who decides.
- **Audit:** sending, approving, rejecting and referring a proof are recorded with who and when.
- There is no timer on a proof: it waits for a person.

**What each person sees:** the reviewer sees the proofs of all employees (scope all); the direct manager sees only the referred proofs of the people under them in «My career team»; the employee sees the state and the reason on their own unit.

### Business rules

- **Proofs and who decides** (FR-114): a proof is one record per employee and per learning unit. A **certificate** and a **written output** start with the reviewer. An **applied at work** proof starts with the employee's direct manager, and the manager's decision is final.
- **States of a proof:** not started, waiting for approval, with the direct manager, done, rejected.
- **Hours count only once approved,** and a unit counts once for the employee.
- **A rejection needs a reason of at least 5 characters;** the employee reads it. A rejected proof is replaced by the next one the employee sends; the number of rejections is kept.
- **After the third rejection of the same unit the employee's direct manager is told.**
- **A decision taken by someone else meanwhile** is refused: the page says «The decision could not be made: someone else may have decided it. Refresh the page.»
- A proof of a unit that was removed from the plan shows «A unit no longer in the plan».
- The name of whoever decided and the time are saved with the proof.
- The review scope is all employees for now; narrowing it is not offered.
- Like every list, the page offers the table / cards switch, search, filters and export.

### Tips and common problems

- The list is empty: «No proofs are waiting for review» means nothing was sent or everything was decided.
- The approve button is missing on a row: the proof was already decided, or your role lacks the key.
- You see the page but cannot approve: your role holds the view key only. Ask the platform manager for the approve and reject keys.
