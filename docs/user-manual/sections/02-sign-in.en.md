## Signing in

There is no password on the platform. You sign in **with the company Microsoft account** or **with your work e-mail and the authenticator-app code** (Microsoft Authenticator or Google Authenticator). The authenticator app is **mandatory for every employee**, and no page works before it is linked and the code is verified.

![Sign in](../images/en/01-login.png)

### Who can sign in

- Only employees for whom HR has created an account. There is no self sign-up, and a deactivated account is refused.
- This page has no permission key: it is for anyone who has not signed in yet.

### What you can do

| Action | What happens | Permission |
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

### Fields (form inputs)

The sign-in has three small forms, one after the other. Nothing here is a permission: a person who has not signed in yet holds no keys.

**Step 1: the e-mail form**

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Work email | The e-mail HR registered for you on the platform. It tells the platform who is signing in and where to send the first-time link | Yes | A well-formed e-mail, up to 254 characters; it must belong to an existing, active employee and use one of the allowed company domains |
| Bot-protection check (Cloudflare) | A small «I am not a robot» box, shown only when the administrator switched bot protection on (Settings → Bot protection). «Continue» stays disabled until it passes | Only when shown | Solved by you; if it fails you see «The protection check did not pass, try again.» |

**Step 2: the code form** (after «Continue»)

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Authenticator code | The 6-digit number your authenticator app shows for your account. It proves the phone is yours | Yes | 6 digits; it changes every 30 seconds and a code already used is never accepted |
| Remember this device and do not ask for the code there | Asks the platform to trust this browser | No | A tick box, shown only when the administrator allowed trusted devices (Settings → Security, days above 0); the time is the one the administrator set |

**The «Verify your identity» page** (after «Sign in with Microsoft»)

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Authenticator code | The same 6-digit code; Microsoft only proves who you are, the code is still asked | Yes | 6 digits |
| Backup code | One of the codes you saved when you linked the app, for when the phone is lost (press «Use a backup code», and «Use the app code» to go back) | Yes, if you use it instead of the app code | 6 to 12 characters, such as `K7MQ2-X9PD4`; each works once |
| Remember this device and do not ask for the code there | Trusts this browser | No | A tick box, shown only when trusted devices are allowed |

**The first-time page «Link your authenticator app»** (opened from the link in your e-mail)

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| QR code and «Cannot scan? Enter this key manually» | Read-only. Scan the QR with the app, or type the key by hand, so the app starts producing codes for your account | Not typed | Shown only on a valid link |
| Code shown in the app | Confirms the app works before it is linked | Yes | 6 digits; press «Confirm and link the app» |
| «Copy codes» / «Download file» (backup codes) | Saves the backup codes. They appear once only | No | Each backup code works one time |

### Workflow

**Normal sign-in, step by step**

1. **You** open the platform and either press «Sign in with Microsoft» or type your work e-mail and press «Continue». If bot protection is on, you solve its check first.
2. **The platform** looks for your account. It never says whether the e-mail exists: a wrong e-mail or a wrong code gives the same message.
3. **You** enter the 6-digit code from your authenticator app (also after Microsoft, unless this is a trusted device) and press «Sign in» (or «Continue»).
4. **The platform** checks the code, opens a session in a secure cookie that the page's scripts cannot read, and takes you to the page you asked for, or Home.
5. **The sign-in is written to the audit log** (category «Sign-in and security»). Nobody else is notified.

**First sign-in (linking the app)**

1. **You** type your e-mail and press «Continue». The platform tells you: «This is your first sign-in. We e-mailed you a link with a QR code».
2. **The platform** e-mails you a link, which is valid for 72 hours; if HR sends a new invitation, the old link stops working.
3. **You** open the link, scan the QR in the app (or type the key), enter the code and press «Confirm and link the app».
4. **The platform** links the app, shows 10 backup codes once (copy or download them), and you press «Continue to sign in». The linking is recorded in the audit log.

**If the phone is lost:** use «Use a backup code», or ask HR (`employees.reset_authenticator`, «Reset the authenticator app») to reset the app; a new invitation then reaches you by e-mail and you link the app again. Resending the invitation needs `employees.resend_invite` («Resend the activation link»).

| Status | Meaning | Who can change it (permission key) | Moves to |
|---|---|---|---|
| App not linked yet | The account exists but the first-time link was not used | HR can resend the invitation (`employees.resend_invite`) | Linked, once you confirm the first code |
| Linked | The app is linked; every sign-in asks for a code (a trusted device skips it only after a Microsoft sign-in) | HR can reset it (`employees.reset_authenticator`) | App not linked yet |
| Locked for a while | 5 wrong codes in a row | Nobody; it ends by itself after 15 minutes | Linked |
| Signed in (session) | A session open for up to 12 hours | You, by signing out or ending it on the Security page; it also ends when your account is deactivated | Signed out |
| Account deactivated | HR stopped the account; sign-in is refused | HR (`employees.deactivate`, «Deactivate and activate employees») | Active again if HR reactivates it |

**What happens by itself**

- The session ends after 12 hours of its start, and at once if the account is deactivated.
- A used code is remembered, so the same code is refused the second time.
- The lock after 5 wrong codes lifts after 15 minutes.
- Every sign-in, wrong code and app linking is recorded in the audit log (FR-11).

**What each person sees:** the page is the same for everybody. After signing in, what you see depends on your roles and scopes, not on how you signed in.

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
