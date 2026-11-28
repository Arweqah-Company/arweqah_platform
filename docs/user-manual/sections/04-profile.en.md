## Profile

Your own page: here you set **the look and language of the platform**, edit your **contact details**, see your **work details** as HR keeps them, and restart the welcome tour if you wish.

![Profile](../images/en/14-profile.png)

### Who sees it

- View key: `profile.view` («View my profile»), and edit key `profile.update` («Edit my contact details and preferences»). Their scope is «all» because they concern your own account only.
- Held by everyone who has the **Employee** role, by unit heads, and by everyone who holds the «collaborator base».
- You find it in your account menu (press your name in the top bar, then «Profile»).
- It does not need platform admin mode.

### What you can do

| Action | What happens | Permission |
|---|---|---|
| Choose the theme: Light, Dark, Follow the device | The platform's look changes at once and is saved in your account | `profile.update` (Edit my contact details and preferences) |
| Choose the language: العربية, English | The language and the page direction change at once and your choice is saved | `profile.update` |
| Choose how your task summary and reminders reach you (channel: notice, e-mail or both) | The choice is saved and applies to the daily summary, the reminders and the late alert | `tasks.notice_settings` (Set my task summary and reminders) |
| Turn the daily summary on or off and pick its hour (Riyadh time) | The summary comes at that hour each day; an hour that has already passed today means tomorrow | `tasks.notice_settings` |
| Turn the task reminders on or off | Off: no reminder before or on the due date and no late alert for you; other task notices are unchanged | `tasks.notice_settings` |
| Edit the personal phone | Your contact number is saved | `profile.update` |
| Edit the personal e-mail | Your personal e-mail is saved | `profile.update` |
| Edit the name in English (in «Basic data», beside the Arabic name, with its own «Save the name» button) | Your English name is saved | `profile.update` |
| «Request a change» on the basic data card (Arabic name, gender, nationality, birth date, marital status) | A request with only what you changed goes to HR; your data does not change until HR approves, and you get a notice of the decision | `profile.update_basic` (Request a change of my basic data) |
| «Cancel the request» | Your request is cancelled while it waits, so you can send another | `profile.update_basic` |
| «Save changes» | Saves the contact details and shows «Changes saved» | `profile.update` |
| «Restart the tour» | The welcome tour starts again from the beginning | Not needed (every employee) |
| The «Security and authenticator app» link | Takes you to the Security page | `security.view` (View the security page) |

### How to

**Change the language or theme**


1. Open «Profile» from your account menu.
2. In the «Appearance» section choose the theme (Light, Dark, Follow the device) and the language.
3. The choice applies at once and is saved for all your devices.


**The profile follows the employee page (FR-222):** the fields you change here (personal phone, personal e-mail, English name) are the same ones the «edit employees» permission gives you for your own record on the employee page. A field the permission does not give shows locked (lock mark) and is not sent, and when no field is left open «Save changes» disappears. The basic data the permission gives you are changed directly on the employee page (the «Edit on the employee page» button on the basic data card, which shows only to someone who also holds «View employees»; otherwise those details stay in «Request a change»); «Request a change» stays for the rest only and disappears when all of them are direct.

**Update your contact details**


1. In the «Contact details» section type the **personal phone** in international format, such as `+966501234567`.
2. Type the **personal e-mail**, then press «Save changes». (An empty box shows `+9665XXXXXXXX` in a faded colour: the shape of an example, not a saved number.)
3. To change the **name in English** type it in the «Basic data» section beside the Arabic name (English letters and spaces only), then press «Save the name», which appears once it changes.
3. Press «Save changes».

**Set your task summary and reminders (FR-215…FR-218)**


1. In the «Task summary and reminders» section choose the **channel**: a notice in the platform (the default), e-mail, or both.
2. Keep «A daily summary of my tasks» on and choose its **time** (Riyadh time, default 08:00). The summary lists your open tasks, those due today and the overdue ones; you get none on a day you have no open task.
3. Keep «Remind me about my tasks, those I follow and my team's» on to be reminded before the due date, on its morning and when it is late.
4. Press «Save». The e-mail carries the task number only, never its title. Without the key `tasks.notice_settings` the section is not shown.

**See your work details**


In the «Work details» section you read: employee number, company, unit, job title, direct manager, work e-mail and start date. These are **read-only**.

### Fields (form inputs)

The page has two forms. The appearance choices save the moment you pick them; the contact form saves with «Save changes». All fields need the key `profile.update` («Edit my contact details and preferences»); without it the contact fields are shown but cannot be changed.

**Appearance**

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Theme | How the platform looks to you: bright, dark, or following your phone or computer | No (one is always chosen) | Light, Dark, Follow the device. Saved on your account, so every device shows it |
| Language | The language of the screens and the direction of the page (right-to-left for Arabic) | No (one is always chosen) | العربية, English. Saved on your account |

**Contact details**

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Personal phone | A number HR can reach you on outside work | No (leave it empty to clear it) | International format with a plus sign, 7 to 15 digits after it, such as `+966501234567`; no spaces |
| Personal e-mail | An e-mail outside the company for contacting you | No (leave it empty to clear it) | A well-formed e-mail up to 255 characters; it must **differ from your work e-mail** |
| Full name in English | How your name is written in English on documents and screens | No (leave it empty to clear it) | Up to 255 characters; English letters and spaces only (a hyphen or apostrophe inside a name is fine, no doubled separators), starting with a letter |

**Work details** (employee number, company, unit, job title, direct manager, work e-mail, start date) are not fields: they are shown for reading only and HR changes them.

### Workflow

1. **You** open «Profile» from your account menu.
2. **You** pick the theme and the language. The platform applies them at once and saves them to your account; no button is needed.
3. **You** edit the personal phone or the personal e-mail (and the English name from «Basic data»). The form checks each field as you type or leave it, and «Save changes» stays disabled while a field is wrong.
4. **You** press «Save changes». The platform checks the same rules again, saves them on your employee record and shows «Changes saved».
5. **The audit log** records «Edited their own profile» (category «Employees»). Nobody else is notified.
6. **HR** sees the new contact details on your employee record; HR alone changes the Arabic name and the work details.

There are no statuses: a change is saved at once or refused with a message under the field.

**Automatic things:** the theme and language are applied on every device you sign in on; nothing is sent by e-mail.

**What each person sees:** only your own profile, whatever your scope is. A person whose account has no employee record sees only the appearance choices. A platform administrator who signs in as you cannot change your profile.

### Business rules

- **Basic data with approval:** one pending request at a time, carrying only the fields that changed. If HR rejects it you see its reason (when written) and may send a new one. The birth date must be in the past and the age between 18 and 70. The request and the decision are audited by field names, never values.
- You edit directly only three things: the personal phone, the personal e-mail and the English name. **HR updates the rest of the employee record.**
- The phone must be in international format (such as +966501234567) or «International format, e.g. +966501234567» is shown; the e-mail must be well formed; the English name is English letters and spaces only.
- The theme and language are saved **in your account**, not in the browser, so they appear as you chose on any device.
- If your account is not linked to an employee record, only the appearance settings are shown, with a note saying so.
- Changing your details is recorded in the audit log.

### Tips

- The «Save changes» button does not show? You do not hold `profile.update`; ask the system administrator.
- Changing the Arabic name or the work details is asked from HR.
