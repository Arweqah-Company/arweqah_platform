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
| Edit the personal phone | Your contact number is saved | `profile.update` |
| Edit the personal e-mail | Your personal e-mail is saved | `profile.update` |
| Edit the full name in English | Your English name is saved | `profile.update` |
| «Save changes» | Saves the contact details and shows «Changes saved» | `profile.update` |
| «Restart the tour» | The welcome tour starts again from the beginning | Not needed (every employee) |
| The «Security and authenticator app» link | Takes you to the Security page | `security.view` (View the security page) |

### How to

**Change the language or theme**


1. Open «Profile» from your account menu.
2. In the «Appearance» section choose the theme (Light, Dark, Follow the device) and the language.
3. The choice applies at once and is saved for all your devices.

**Update your contact details**


1. In the «Contact details» section type the **personal phone** in international format, such as `+966501234567`.
2. Type the **personal e-mail** and the **full name in English** (English letters and spaces only).
3. Press «Save changes».

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
3. **You** edit the personal phone, the personal e-mail or the English name. The form checks each field as you type or leave it, and «Save changes» stays disabled while a field is wrong.
4. **You** press «Save changes». The platform checks the same rules again, saves them on your employee record and shows «Changes saved».
5. **The audit log** records «Edited their own profile» (category «Employees»). Nobody else is notified.
6. **HR** sees the new contact details on your employee record; HR alone changes the Arabic name and the work details.

There are no statuses: a change is saved at once or refused with a message under the field.

**Automatic things:** the theme and language are applied on every device you sign in on; nothing is sent by e-mail.

**What each person sees:** only your own profile, whatever your scope is. A person whose account has no employee record sees only the appearance choices. A platform administrator who signs in as you cannot change your profile.

### Business rules

- You edit only three things yourself: the personal phone, the personal e-mail and the English name. **HR updates the rest of the employee record.**
- The phone must be in international format (such as +966501234567) or «International format, e.g. +966501234567» is shown; the e-mail must be well formed; the English name is English letters and spaces only.
- The theme and language are saved **in your account**, not in the browser, so they appear as you chose on any device.
- If your account is not linked to an employee record, only the appearance settings are shown, with a note saying so.
- Changing your details is recorded in the audit log.

### Tips

- The «Save changes» button does not show? You do not hold `profile.update`; ask the system administrator.
- Changing the Arabic name or the work details is asked from HR.
