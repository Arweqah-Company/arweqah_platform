## Security

A page that shows how your sign-in is protected, and lets you watch **the devices you are signed in on** and end the ones you do not know. There is no password on the platform; the authenticator app on your phone is the key.

![Security](../images/en/16-security.png)

### Who sees it

- View key: `security.view` («View the security page»), scope «all» because it concerns your own account.
- Held by everyone with the **Employee** role, by unit heads, and by the collaborator base. You find it in your account menu. It does not need platform admin mode.
- **The company-wide security settings** (trusted devices, request limits and signing in as another employee) are another page for the system administrator: Settings, then the «Security» tab. It needs `security_settings.view` («View the security settings (trusted devices and request limits)») and `security_settings.edit` («Edit the security settings») in platform admin mode.

### What you can do

| Action | What happens | Permission |
|---|---|---|
| Read the authenticator-app status | Tells you whether it is linked to your account | `security.view` (View the security page) |
| «End the session» on a device | That session ends and a sign-in is needed again there | `security.view` |
| «End all other sessions» | Every session ends except your current one | `security.view` |
| «Remove trust» on a trusted device | The code is asked on that browser again | `security.view` |
| «Remember this device and do not ask for the code there» | Trusts the current browser | `security.view` |

### What is on the page

- **The status notice:** «The authenticator app is linked to your account» (green) or «The authenticator app is not linked yet» (yellow).
- **How sign-in works:** no password; you sign in with the work e-mail and the app code or with the Microsoft button; even with Microsoft the code is asked every time; the session ends after 12 hours, and at once if your account is deactivated.
- **Devices you are signed in on:** every open session in your name, with the device name and last activity, and a «This device» mark on your current session.
- **Trusted devices:** the browsers you trusted and the date the trust ends.
- **Lost your phone?** A note on what to do.

### How to

**End a session you do not know**


1. Open «Security» from your account menu.
2. In «Devices you are signed in on» look for a device or a time you do not know.
3. Press «End the session» on it, or «End all other sessions» if you doubt your account.
4. Tell HR or the system administrator if you suspect a break-in.

**If you lose your phone**


1. On the sign-in page choose «Use a backup code» and enter one of the codes you saved when linking (each works once).
2. If you cannot find them, ask HR to **reset the app**; a new invitation reaches you by e-mail to link the app again.

### Fields (form inputs)

This page has almost nothing to type: you read your protection and press buttons. The authenticator code is typed on the sign-in page, and the company-wide numbers are on the Settings page (see «Settings», the Security tab).

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Remember this device and do not ask for the code there | Trusts the current browser so the code is not asked there again for a while | No | A tick box, shown only when the administrator allowed trusted devices (days above 0); the trust lasts the days the administrator set |
| «End the session» (on each device row) | Ends that one sign-in | Not a field | Each row shows the device name, the hidden-end address, the last activity and a «This device» mark on your own session |
| «End all other sessions» | Ends every session except the one you are using | Not a field | Needs no typing |
| «Remove trust» (on each trusted device) | Makes that browser ask for the code again | Not a field | Each row shows the browser, the date the trust ends and a «This browser» mark |

### Workflow

**Checking and closing sessions**

1. **You** open «Security» from your account menu and read the status: «The authenticator app is linked to your account» (green) or «not linked yet» (yellow).
2. **You** look at «Devices you are signed in on». Each open sign-in in your name is listed.
3. **You** press «End the session» on a device you do not know, or «End all other sessions» if you doubt the account. The session ends at once and a new sign-in is needed on that device.
4. **You** tell HR or the system administrator if you suspect a break-in.

**Trusting a browser (only when allowed)**

1. **You** sign in with Microsoft and enter the code, ticking «Remember this device and do not ask for the code there».
2. **The platform** lists the browser under «Trusted devices» with the date the trust ends. On that browser the code is skipped after a Microsoft sign-in until that date.
3. **You** press «Remove trust» when you want the code asked there again.

| Status | Meaning | Who can change it (permission key) | Moves to |
|---|---|---|---|
| Session open | A sign-in in your name, with its last activity | You, with «End the session» or «End all other sessions» (`security.view`); the platform when 12 hours pass or the account is deactivated | Ended |
| Session ended | The device must sign in again | Nobody | Nothing (a new sign-in is a new session) |
| Trusted device | A browser that skips the code after a Microsoft sign-in | You, with «Remove trust» (`security.view`); it also ends by itself on its end date | Trust removed or expired |
| Authenticator app: linked / not linked | Whether a code can be produced for your account | HR resets it (`employees.reset_authenticator`) | Not linked, until you link it again from the new invitation |

**Automatic things:** sessions end after 12 hours, and all at once when your account is deactivated; a trusted device stops being trusted on its end date; when a system administrator finishes a «sign in as» session in your name, you are notified.

**What each person sees:** only your own sessions and devices. The company-wide security settings are another page for the system administrator.

### Business rules

- The authenticator app is mandatory, and nothing works on the platform before it is linked. (FR-02)
- You do not change the link from this page; a reset is done by asking HR.
- A **trusted device** skips the code only after a Microsoft sign-in and one code entry, and for a time the platform administrator sets. Signing in with the e-mail always asks for the code. If the time is 0 the option is off (the default).
- Ending a session or removing trust takes effect at once.
- A system administrator who signs in as you (the «Sign in as another employee» feature) cannot change your security from inside the session, and you are notified when it ends.
- When your account is deactivated, all your sessions end at once.

### Tips

- A session with a browser or city you do not know? End it at once.
- On a shared device do not trust the device, and sign out from the top menu when you finish.
