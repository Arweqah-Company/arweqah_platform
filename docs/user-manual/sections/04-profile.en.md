## Profile

Your own page: here you set **the look and language of the platform**, edit your **contact details**, see your **work details** as HR keeps them, and restart the welcome tour if you wish.

![Profile](../images/en/14-profile.png)

### Who sees it

- View key: `profile.view` («View my profile»), and edit key `profile.update` («Edit my contact details and preferences»). Their scope is «all» because they concern your own account only.
- Held by everyone who has the **Employee** role, by unit heads, and by everyone who holds the «collaborator base».
- You find it in your account menu (press your name in the top bar, then «Profile»).
- It does not need platform admin mode.

### What you can do

| Action | What happens | Permission key |
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

### Business rules

- You edit only three things yourself: the personal phone, the personal e-mail and the English name. **HR updates the rest of the employee record.**
- The phone must be in international format (such as +966501234567) or «International format, e.g. +966501234567» is shown; the e-mail must be well formed; the English name is English letters and spaces only.
- The theme and language are saved **in your account**, not in the browser, so they appear as you chose on any device.
- If your account is not linked to an employee record, only the appearance settings are shown, with a note saying so.
- Changing your details is recorded in the audit log.

### Tips

- The «Save changes» button does not show? You do not hold `profile.update`; ask the system administrator.
- Changing the Arabic name or the work details is asked from HR.
