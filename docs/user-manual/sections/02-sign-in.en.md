## Signing in

There is no password on the platform. You sign in **with the company Microsoft account** or **with your work e-mail and the authenticator-app code** (Microsoft Authenticator or Google Authenticator). The authenticator app is **mandatory for every employee**, and no page works before it is linked and the code is verified.

![Sign in](../images/en/01-login.png)

### Who can sign in

- Only employees for whom HR has created an account. There is no self sign-up, and a deactivated account is refused.
- This page has no permission key: it is for anyone who has not signed in yet.

### What you can do

| Action | What happens | Permission key |
|---|---|---|
| Sign in with Microsoft | You sign in with the company account at Microsoft, then the app code is asked | Not needed |
| Type the work e-mail then «Continue» | Takes you to the code field | Not needed |
| Enter the app code (6 digits) then «Sign in» | Opens the platform | Not needed |
| «Change e-mail» | Takes you back to type another e-mail | Not needed |
| «Use a backup code» | You sign in with one of the codes you saved when linking | Not needed |
| «Remember this device and do not ask for the code there» | Trusts the browser, so the code is not asked there for the time the platform administrator set | Not needed |

### How to

**The usual sign-in with the work e-mail**


1. Type your **work e-mail** and press «Continue». If a bot-protection check appears, complete it.
2. Open the authenticator app and enter the **6-digit code** shown for your account.
3. The platform opens. The code changes every 30 seconds.

**Signing in with the Microsoft account**


1. Press «Sign in with Microsoft» and sign in with the company account.
2. Enter the authenticator-app code on the «Verify your identity» page and press «Continue». Even with Microsoft, the code is asked.

**First sign-in: linking the authenticator app**


1. Type your e-mail and continue. A message says: «This is your first sign-in. We e-mailed you a link with a QR code».
2. Open the link in your e-mail. Install **Microsoft Authenticator** or **Google Authenticator** on your phone.
3. In the app add an account and scan the QR code. If you cannot scan, enter the key shown by hand.
4. Enter the code shown in the app and press «Confirm and link the app».
5. **Backup codes** appear. They are shown only once and each works one time. Copy them or download them as a file and keep them safe, then «Continue».

### Business rules

- No password and no self sign-up, and the error is one generic message: «The email or the code is not valid» (it does not say which is wrong). (FR-01)
- A code is never accepted twice: each code is used once, so if yours is refused, wait for the next one. (FR-01)
- After **5 wrong codes** the account is locked for a while (15 minutes) and «Too many attempts. Try again in a moment» appears. (FR-01)
- More than 5 sign-in attempts in a minute show «Too many attempts. Wait a minute and try again».
- Microsoft sign-in is for the company account only and for an employee whose account was created beforehand. If «Microsoft sign-in is not set up yet» appears, contact the system administrator. (FR-03)
- No employee is added with an e-mail outside the domains the administrator set.
- The session ends after **12 hours**, and at once if your account is deactivated.
- Signing in with an e-mail always asks for the code. A «trusted device» skips the code only after a Microsoft sign-in, and for the time the platform administrator set.
- The sign-in is recorded in the audit log. (FR-11)

### Tips and common problems

| Problem | Cause | Fix |
|---|---|---|
| The code is refused | It was already used, or your phone's clock is wrong | Wait for the next code, and set the phone's time to automatic |
| «Too many attempts» appeared | You passed the allowed attempts | Wait, then try again |
| You lost your phone | No code available | Use «Use a backup code», or ask HR to **reset the app** and a new invitation reaches you by e-mail |
| The link is not valid or has expired | The app-linking link is old | Ask HR for a new invitation |
| The QR e-mail did not arrive | It is in junk mail, or the account is not active | Check junk mail, then ask HR |
| «The protection check did not pass» | The bot check did not finish | Try again |
