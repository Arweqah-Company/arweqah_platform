## Career-path content

«Career-path content» is the HR page that prepares the career path of each job title. The job titles are listed with the state of each one's path. For a title you upload its **title file** (one file with the job description, the career development, the learning plan and the required items), review what the system read from it, fix details by hand, then set the path **Ready** so that the people holding the title see it and are asked to acknowledge it. The page also reopens the acknowledgement, imports the learning links from an Excel file and exports the list.

### Who sees it

- View permission: `career_content.view` (View the career-path content), scope: all.
- Default roles: none of the standard roles holds it except the **Administrator**. The platform manager gives it, with the keys below, to the HR role from the permissions page. Administrative permissions that wait for platform admin mode work only while the mode is on.
- Menu: the group «Career file», item «Career-path content». The Employee role does not see it.

### What you can do

| Action | What happens | Permission key (label) |
|---|---|---|
| Open the page, search and filter | The titles as a column of buttons (name, code, state); search by title or code; filters on unit, grade, track and path state | `career_content.view` (View the career-path content) |
| Edit a path by hand | The workspace of the title (seven tabs): description, ladder and path, technical competencies, learning plan, required, evaluation, shared lists; «Save changes» raises the content version. Without the edit key the workspace is read only | `career_content.edit` (Edit the career-path content of a job title) |
| Preview the path (eye icon) | Shows the path as the holders of the title see it, without a name, progress or acknowledgement | `career_titlefile.preview` (Preview a career path as the employee sees it) |
| Upload the title file | Opens the dialog «Upload the title file»: choose a txt, docx or pdf file or paste its text, press «Extract», review, then «Save the extracted content» | `career_titlefile.upload` (Upload a title file and read the career path from it) |
| Analyse with AI | Offers the AI to place the parts of a file the fixed reader could not | `career_titlefile.ai` (Analyse a title file with AI) |
| Set the path ready / Set back to draft | Shows the path to the holders (and asks them to acknowledge), or hides it again | `career_titlefile.publish` (Set a career path ready or back to draft) |
| Reopen the acknowledgement for its holders | Asks every holder of the title to acknowledge the path again, with a reason | `career_acknowledge.reopen` (Reopen the acknowledgement of a career path for a title's holders) |
| Import learning links | Imports an Excel file of learning links (title code, period, unit, link) | `career_content.import` (Import learning-unit links from a file) |
| Export the list | Downloads the list of titles and the state of their paths | `career_content.export` (Export the list of titles and the state of their paths) |

### How to

**Build the path of a title from its file**

1. Open **Career-path content** and click the title in the list. The panel shows its name, code, content version and state.
2. Press «Upload the title file». Choose a txt, docx or pdf file (it is read in your browser) or paste the text (up to 200,000 characters).
3. Press «Extract». The table shows each part (job description, career development, learning plan, required) as «Sound» or «Needs review», with counts (indicators, responsibilities, ladder levels, learning units, learning minutes...) and the reader's notes; text that is not content (such as «Next», «Back», «Print») is skipped and listed.
4. If everything is sound, press «Save the extracted content». The content version goes up. Saving stays off while any part needs review.
5. If the reader could not place the parts, use «Analyse with AI» (see the rules), review the result in the same table, then save.

**Set the path ready for its holders**

1. Open the title. The panel lists what is missing, or says «Every part is complete: the path can be set ready».
2. Press «Set the path ready». The window says how many holders will see it and be asked to acknowledge.
3. Confirm. The holders see the path and read it on their next sign-in.
4. To hide it, press «Set the path back to draft»: nothing the people acknowledged is deleted.

**Reopen the acknowledgement**

1. Open the title and press «Reopen the acknowledgement for its holders (N)».
2. Write a reason (at least 5 characters) and press «Confirm».
3. The holders must acknowledge again when they sign in, and cannot use the platform before.

**Import learning links**

1. In the page header press the import button and choose the Excel file (download the template first; it has the columns «Title code», «Period», «Unit name», «Link»).
2. Review the preview: how many units will get a new link and how many stay as they are; each refused row shows its number and its reason.
3. Confirm. The content version of the titles changed goes up.

### Business rules

- **One file per title:** description, development, learning plan and required items; the performance evaluation is not in this file because it belongs to the development stage and is uploaded once from the evaluation cycle page (FR-113).
- **Nothing is saved before you review it,** and a file with a part that needs review is not saved. The checks include: missing summary, indicators or responsibilities; a ladder without a marked current title; missing level-path steps, condition to move up, competencies, learning units, badges or required items or acknowledgement text; a learning period whose total does not match its units; a title code in the file that is not this title's code; and text over a limit or a duration nobody can read.
- **A path can be set ready only when it is complete** (description, development, learning plan with at least one unit and one badge, required items and the acknowledgement text). A draft may be saved incomplete, but never with a link that does not start with `https://` or a period without a name.
- **Ready or draft:** the holders of a title see the path only when it is ready; back to draft hides it without deleting what they acknowledged.
- **Content versions:** every save raises the version, and the acknowledgement of an employee records the version. If someone else changed the content after you opened it, your save is refused («Close the window, open it again and redo your edit»).
- **AI reading (FR-126, FR-127):** the fixed reader always comes first and is free. The button «Analyse with AI» shows only when an AI service is switched on in the settings and you hold the AI key. Nothing is sent unless you press it, and the text of the file (company data, not employees' data) goes to that service. You review the result before anything is saved; texts that are not in the file word for word are listed to be checked. Durations and dates are always computed by the system. Up to 6 analyses per hour per person.
- **Reopening needs a reason** and is recorded in the audit log.
- **Learning links** must start with `https://`; an empty link clears it. A row is refused when the title code or the period or the unit is not found, the unit name is repeated in the period, or the row repeats a unit already named above.
- Audit: uploads, AI analyses (without the text of the file), saves, ready and draft changes and reopenings are recorded.

### Tips and common problems

- «Save» is off: extract the file first, or fix the parts listed under «Parts that need review».
- «The text could not be read»: try pasting the text of the file.
- The path cannot be set ready: the panel names the missing parts.
- You see the workspace but cannot edit it: you do not hold `career_content.edit`.
