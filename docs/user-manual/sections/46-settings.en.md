## Settings

### What this page is

One page with tabs that gathers the settings of services and messages: **Translation**, **E-mail**, **Bot protection**, **AI**, **E-mail templates**, **Notification templates**, **Welcome tour** and **Security**. Each tab shows only to whoever holds its view key.

![Settings](../images/en/31-settings.png)

### Who sees it

| Tab | View key | Hidden as page |
|---|---|---|
| Translation | `integrations.translation_view` (View the translation settings page) | Translation settings |
| E-mail | `integrations.email_view` (View the e-mail settings page) | E-mail settings |
| Bot protection | `integrations.captcha_view` (View the bot protection page) | Bot protection |
| AI | `integrations.ai_view` (View the AI settings page) | AI service |
| E-mail templates | `templates.email_view` (View e-mail templates) | E-mail templates |
| Notification templates | `templates.notification_view` (View notification templates) | Notification templates |
| Welcome tour | `tour.settings_view` (View the welcome tour settings) | Welcome tour |
| Security | `security_settings.view` (View the security settings (trusted devices and request limits)) | Security |

- Default scope of all these keys: All.
- Platform admin mode: required; the page appears in the menu after you turn it on.
- Roles: the built-in «System Admin» role holds all these keys and no other role holds them by default (the «Platform configurator» role starts without permissions and an administrator gives it the keys it needs). If you hold the key of no tab, the message «You may not view any of these settings.» appears.

### Translation, e-mail, bot protection and AI services

Each of these tabs shows a table of the available services (table or cards) with the columns: service, status, last test, in use. Each row has icons: «How to get the data», edit, «Try», and switch on or off. The table has search, filters (status, in use) and export.

| Services in each tab | |
|---|---|
| Translation | Amazon Translate, Google Cloud Translation, Azure AI Translator |
| E-mail | SMTP, Amazon SES, SendGrid, Microsoft 365 (Graph) |
| Bot protection | Cloudflare Turnstile |
| AI | Anthropic (Claude), OpenAI-compatible service (free Gemini, Groq…) |

| Action | What happens | Permission (translation / e-mail / bot protection / AI) |
|---|---|---|
| «How to get the data» icon | Opens a window with the steps to get the keys and the meaning of every value (also available inside the edit window) | The view key |
| Edit (click the row) | Opens the service's data window; whoever holds the edit key can save | `integrations.translation_edit` (Edit translation provider data) / `integrations.email_edit` (Edit e-mail provider data) / `integrations.captcha_edit` (Edit the bot protection keys) / `integrations.ai_edit` (Edit the AI key and model) |
| «Try» | Tries the service with the data in the form (translates an example, sends a short message to any address, runs a real Turnstile check, or sends one short AI request) | `integrations.translation_test` (Try a translation provider) / `integrations.email_test` (Send a test e-mail with an e-mail provider) / `integrations.captcha_test` (Try the bot protection keys) / `integrations.ai_test` (Try the AI key) |
| «Switch on» or «Switch off» | Puts the service in use or stops it | `integrations.translation_activate` (Activate and switch off a translation provider) / `integrations.email_activate` (Activate and switch off an e-mail provider) / `integrations.captcha_activate` (Switch the bot protection on and off) / `integrations.ai_activate` (Switch the AI service on and off) |
| Export | Exports the list of services | `integrations.translation_export` / `integrations.email_export` / `integrations.captcha_export` / `integrations.ai_export` (Export the list of translation / e-mail / bot protection / AI providers) |

There is no import in these lists because each row is a fixed service, not a record created from a file.

**How to set up and switch on a service**

1. Open «Settings» and choose the tab (for example «E-mail»).
2. Press the «How to get the data» icon of the service you will use and follow the steps to get the keys.
3. Open the service by clicking its row, fill in the fields, then «Save». A short hint sits under each field.
4. Press «Try»; the test must pass with the same saved data.
5. Press «Switch on». The message «… is now in use.» appears.

**Rules of the services**

- **A service is switched on only when its data is complete and a test with exactly that data has passed.** The status goes «Data incomplete», then «Not tested», then «Tested».
- **Changing the data of the service in use switches it off** until it is tried and switched on again.
- **One service is in use per kind** at a time.
- **Secret keys are never shown after saving** (they show «Saved»), are stored encrypted, are never written to the audit log, and are removed from error texts. Leave a secret field empty to keep the saved value.
- **With no service switched on:** translation and e-mail use the server's settings if they exist (otherwise translation is off); bot protection asks no check; and the «Analyse with AI» button is not offered (FR-59, FR-60, FR-78).
- **Bot protection:** when on, the Cloudflare widget shows in the e-mail step of the sign-in page and its answer is verified before anything is sent; if Cloudflare cannot be reached within 4 seconds the person is let in and this is recorded. The Microsoft sign-in and the code step are not behind it.
- **AI:** the text of an uploaded job title file is sent to the service; it is company data, not employee data, so do not put personal data in it. The AI's reading is always reviewed by a person before it is saved.

### Guides to get the keys (summary)

Each service has a window with the full steps in Arabic and English and the meaning of each field, plus a reminder: «Keep keys secret. Anyone holding them can use the service on your account.»

**Translation**

- **Amazon Translate:** create an IAM user with a policy allowing only `translate:TranslateText`, then an access key; copy the Access key ID and the Secret access key at once (the secret shows only once) and choose a region where the service is available.
- **Google Cloud:** enable the Cloud Translation API in your project, create a service account with the role «Cloud Translation API User», then a JSON key and paste the whole file into the field.
- **Azure:** create a Translator resource, copy Key 1 and the Region from «Keys and Endpoint», and leave the default endpoint.

**E-mail**

- **SMTP:** ask the provider for the server, the port (587 or 465), user name and password; turn on «Secure connection» for port 465 only. Microsoft 365: server smtp.office365.com, port 587, with SMTP AUTH enabled.
- **Amazon SES:** verify your domain or an address, ask to leave the sandbox, and create an IAM user allowed `ses:SendEmail` only.
- **SendGrid:** create an API key with Mail Send only, and verify the sender.
- **Microsoft 365 (Graph):** register an app in Entra, copy the client ID and the tenant ID, create a secret and copy its «Value», grant the Mail.Send application permission with admin consent, and use a real mailbox as the sender.

**Bot protection**

- **Turnstile:** in the Cloudflare dashboard → Turnstile add a widget with the platform's hostname in «Managed» mode, copy the «Site key» and the «Secret key», then «Try», solve the check, then «Switch on».

**AI**

- **Anthropic:** at console.anthropic.com add a payment method and a small credit, create an API key and copy it at once, and leave the model as it is or change it. You pay by use.
- **OpenAI-compatible service:** for the free option use «Get API key» in Google AI Studio and leave the address and model as they are. For another service type its https address and a model that supports structured JSON answers.

### E-mail templates and notification templates

Here you edit the wording of every e-mail the platform sends (the account activation invitation and the frame of notices sent by e-mail) and every in-app notice (the bell), in Arabic and English. The list columns: message, area (Sign-in, Tickets, Tasks, Notifications), state («Default wording», «Customised», «Waiting for approval»), last change, with search, filters and export.

| Action | What happens | Permission (e-mail / notifications) |
|---|---|---|
| Open a message | Opens a window with the wording in two languages and a preview with example values | `templates.email_view` / `templates.notification_view` |
| Edit the text and save | Saves the new wording or sends it for approval | `templates.email_edit` (Edit e-mail templates) / `templates.notification_edit` (Edit notification templates) |
| «Send me a test» (e-mail only) | Sends a test copy to your own address | `templates.email_test` (Send yourself a test of an e-mail template) |
| «Back to default» | Brings back the default wording at once; when second-person approval is on, going back is itself a change that waits for approval | `templates.email_reset` (Reset an e-mail template to its default wording) / `templates.notification_reset` (Reset a notification template to its default wording) |
| «Approve» / «Reject» | Approves or rejects a change that is waiting | `templates.email_approve` (Approve changes to e-mail templates) / `templates.notification_approve` (Approve changes to notification templates) |
| «A second person must approve changes» switch | Switches second-person approval on or off | `templates.email_settings` (Switch second-person approval of e-mail templates on or off) / `templates.notification_settings` (Switch second-person approval of notification templates on or off) |
| Export | Exports the list of templates | `templates.email_export` / `templates.notification_export` |

**How to reword a message**

1. Open «Settings», then «E-mail templates» (or «Notification templates») and click the message.
2. Choose the language (Arabic or English) and edit the title and text. For e-mail: the preview line, the button label, and the header and button colors, from the seven brand colors only.
3. Type `@` inside the text to insert a value the platform fills in (the person's name, the activation link, the task number…) and pick it from the list shown.
4. Check the preview, and for e-mail press «Send me a test» to see the result.
5. Press «Save» (or «Send for approval» if second-person approval is on).

**Rules of templates**

- **The available values are fixed:** only the values the platform fills for that message can be used, and some «must stay» (such as the activation link). The platform refuses an unknown value or the removal of a required one.
- **E-mail is formatted text** (bold, italic, underline, lists, link), cleaned by the platform (no scripts or images), and the platform builds the page itself with the logo, the footer and right-to-left for Arabic; **notifications are plain text** only.
- **The default wording** is kept in the platform and is sent when nothing is changed or when a changed message fails to render, so a bad edit never stops a message.
- **Second-person approval** (off at first): when on, every change stays «Waiting for approval» and the current wording is sent until **someone other than its author** approves it; the author cannot approve their own change. Whoever holds the approval key can approve or reject.
- **A short delay:** the new wording may take about 30 seconds to reach every part of the system.
- **Audit:** every change, approval, rejection and reset is recorded in the audit log (FR-64, FR-65).

### The Security tab

| Setting | Meaning | Values |
|---|---|---|
| Days a device stays trusted | How long the authenticator code is skipped on a trusted browser after a Microsoft sign-in; 0 switches the choice off | 0 to 365 (default 0) |
| Requests per minute | How many requests one address may send a minute before it is told to wait. One page load sends dozens of requests, so a low value stops the platform; sign-in has its own stricter limit | 120 to 100000 (default 600) |
| Let platform administrators sign in as another employee | Switches the «Sign in as» feature on | Off by default |
| Minutes without activity before it ends | How long a «sign in as» session may sit idle before it ends | 5 to 240 (default 30) |
| Allowed e-mail domains | One domain per line for the work e-mail when an employee is added | Empty = `arweqah.sa` only |

| Action | Permission |
|---|---|
| View the tab | `security_settings.view` |
| Save the settings and the domains | `security_settings.edit` (Edit the security settings) |
| Use «Sign in as» from the employees list or an employee's page | `impersonation.start` (Sign in as another employee) with platform admin mode |

**Signing in as another employee (FR-85)**

- A platform administrator (admin mode on) works as any active employee with that person's permissions and scope, without the employee's code. It is off by default and is switched on here.
- A fixed bar says «You are working as … — signed in by …» with a «Back to my account» button; the session ends with that button, after the idle minutes, or when the feature is switched off.
- **Refused:** signing in as yourself, as an inactive account, or from inside another «sign in as» session. During the session these are also refused: turning on admin mode, changing the employee's own sign-in (authenticator, devices, sessions, profile), their roles, groups and permissions, their account status, and the security settings.
- Everything recorded in the audit log during the session carries the administrator's name, and the employee gets a notice afterwards.

**E-mail domains:** each domain goes on its own line (like `partner.org`), and wrong values are named so they can be fixed. When the list is empty only the default domain is allowed. The system refuses to add an employee with a work e-mail outside the allowed domains (FR-77).

### The Welcome tour tab

It lists the steps of the tour every employee sees on first sign-in, and of the administration tour. You can edit a step's title and text in Arabic and English (an empty field brings back the original text), switch it off, move it up or down, and reset it to the original. What is highlighted and where is fixed in the system. The tour itself is explained in another section of this manual.

| Action | Permission |
|---|---|
| View the tab | `tour.settings_view` (View the welcome tour settings) |
| Edit a step's text and switch it on or off | `tour.settings_edit` (Edit a welcome-tour step and switch it on or off) |
| Move a step up or down | `tour.settings_reorder` (Reorder the welcome-tour steps) |
| Reset a step to the original | `tour.settings_reset` (Reset a welcome-tour step to its default wording) |
| Export | `tour.settings_export` (Export the list of welcome-tour steps) |

### Fields (form inputs)

The page is made of tabs, each with its own forms. Secret values (keys, passwords, secrets) are never shown after saving: the field shows «Saved» and «A value is saved. Leave it blank to keep it, or type a new one.» Nothing on this page asks you to type a real secret again unless you want to change it.

**The services lists** (Translation, E-mail, Bot protection, AI)

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Search services | Finds a service by its name | No | Free text |
| Filters | Narrow the list | No | Status (Data incomplete, Not tested, Tested), In use (Yes / No) |
| Scope (in the «Export data» window) | How many rows go into the file | Yes | «The rows shown on this page (N)» or «All results of the current search and filters (N)»; a single export holds a limited number of rows and the window says when it caps |
| Columns | Which columns to put in the file | Yes, at least one | «Select all» / «Clear selection»; the window shows «N of M columns» |
| File type | The format of the file | Yes | Excel (.xlsx) or CSV (.csv) |

**Translation services** (Settings → Translation; edit key `integrations.translation_edit`)

| Service and field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Amazon Translate: Access key ID | The public half of the key the platform uses to log into your Amazon account | Yes | Text from the IAM user you created |
| Amazon Translate: Secret access key | The private half of that key; shown by Amazon only once | Yes (secret) | Text; the IAM user should be limited to `translate:TranslateText` |
| Amazon Translate: Region | The Amazon data-centre region that does the translation | Yes | Text, such as `us-east-1` (the default); a region where the service exists |
| Google Cloud Translation: Service account key (JSON) | The whole key file Google gave you for a service account that may translate | Yes (secret) | Paste the entire JSON file; it must contain the account's e-mail and private key; the account needs the «Cloud Translation API User» role |
| Azure AI Translator: Key | The key of your Translator resource («Key 1») | Yes (secret) | Text |
| Azure AI Translator: Region | The region of the Translator resource, as shown with its keys | Yes | Text |
| Azure AI Translator: Endpoint | The web address of the service | Yes | An address starting with `https://`; the default `https://api.cognitive.microsofttranslator.com` is usually right |

**E-mail services** (Settings → E-mail; edit key `integrations.email_edit`)

| Service and field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| SMTP: Server | The mail server's name, given by your mail provider (for Microsoft 365: `smtp.office365.com`) | Yes | Text |
| SMTP: Port | The door the server listens on | Yes | A whole number from 1 to 65535; 587 (default) or 465 |
| SMTP: Secure connection (TLS) | Whether the connection is encrypted from the first moment | No | Tick for port 465; leave it off for 587, which upgrades by itself |
| SMTP: User name | The account that logs into the mail server | No | Text; empty when the server needs no login |
| SMTP: Password | That account's password | No (secret) | Text |
| SMTP: Sender | The name and address the e-mails appear to come from | Yes | An address, or `Name <address>`, such as `Arweqah Platform <no-reply@arweqah.sa>` |
| Amazon SES: Access key ID / Secret access key | The key of an IAM user allowed only `ses:SendEmail` | Yes / Yes (secret) | Text |
| Amazon SES: Region | The region where the sender is verified | Yes | Text; `me-south-1` is the default |
| Amazon SES: Sender | The verified address or domain the e-mails come from | Yes | An address or `Name <address>` verified in SES (and the account out of the sandbox) |
| SendGrid: API key | The key that lets the platform send through SendGrid | Yes (secret) | Created with the «Mail Send» permission only |
| SendGrid: Sender | The verified sender | Yes | An address or `Name <address>` verified in SendGrid |
| Microsoft 365 (Graph): Tenant ID | The identifier of your company's Microsoft directory | Yes | Text from Entra |
| Microsoft 365 (Graph): Application (client) ID | The identifier of the app registered for sending | Yes | Text from Entra |
| Microsoft 365 (Graph): Client secret | The app's secret (copy its «Value», not the secret's id) | Yes (secret) | Text |
| Microsoft 365 (Graph): Sender mailbox | The real mailbox the app sends as | Yes | A plain e-mail address; the app needs the Mail.Send application permission with admin consent |

**Bot protection** (Settings → Bot protection; edit key `integrations.captcha_edit`)

| Service and field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Cloudflare Turnstile: Site key | The public key of your Turnstile widget; it is shown on the sign-in page | Yes | Text from the Cloudflare dashboard → Turnstile → your widget |
| Cloudflare Turnstile: Secret key | The private key of the same widget; the platform uses it to verify the answer | Yes (secret) | Text; it must belong to the widget that owns the site key |

**AI services** (Settings → AI; edit key `integrations.ai_edit`)

| Service and field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Anthropic (Claude): API key | The key that lets the platform call the service on your account | Yes (secret) | Starts with `sk-ant-`; shown once by Anthropic |
| Anthropic (Claude): Model | Which model answers | Yes | A model name; default `claude-opus-5-5` (the most accurate), or `claude-sonnet-5-5` (cheaper). «Show the available models» lists what your key may use |
| OpenAI-compatible service: API key | The key of that service (free Gemini: «Get API key» in Google AI Studio) | Yes (secret) | Text |
| OpenAI-compatible service: Service address | The web address of the service | Yes | A public `https://` address that ends before `/chat/completions` (not a local, internal or numeric address, and with no user name inside); default is Gemini's |
| OpenAI-compatible service: Model | A model that service offers | Yes | A model name supporting structured JSON answers; default `gemini-3.8-flash` |

**The «Try» window** (key `integrations.<kind>_test`; at most 10 tries a minute per administrator)

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Translation: Arabic | Any Arabic text; the English appears by itself | Yes | Up to 1000 characters |
| E-mail: Send to | An address where you can read the test message | Yes | A valid e-mail |
| Bot protection: the Cloudflare check | The real widget appears; solve it, then press «Verify the answer» | Yes | Solved by you |
| AI: «Run the test» | Sends one short request with the key and model in the form | Not a field | Needs no typing |

Whatever is in the form is what is tried; nothing from the window is saved, and the service is switched on only if the test passed with exactly the saved data.

**Templates** (E-mail templates and Notification templates; edit keys `templates.email_edit` / `templates.notification_edit`)

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Language | Which language's wording you are editing | Yes | Arabic, English; both must be filled |
| Subject (e-mail) / Title (notification) | The subject of the e-mail or the title in the bell | Yes | 1 to 200 characters |
| Preview line (e-mail only) | The short line mail apps show beside the subject | No | Up to 200 characters |
| Text | The message body. E-mail: formatted text (bold, italic, underline, lists, link). Notification: plain text | Yes | 1 to 20000 characters. Type `@` to insert a value the platform fills in; only the listed values are allowed and those marked «must stay» cannot be removed |
| Button label (e-mail only) | The words on the button that opens the link | No | Up to 60 characters; empty = no button |
| Header color / Button color (e-mail only) | The colors of the band and the button | Yes | Only the brand colors: Cream, Green, Dark navy, Orange, Beige, Petrol blue, Yellow |
| A second person must approve changes (switch) | Makes every saved change wait for another person's approval | No | On / Off (off at first); needs `templates.email_settings` / `templates.notification_settings` |

**Welcome tour steps** (edit key `tour.settings_edit`)

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Title (Arabic and English) | The step's heading in the tour | No | Up to 80 characters; empty = the original wording |
| Text (Arabic and English) | The step's explanation | No | Up to 400 characters, plain text; empty = the original wording |
| The step is shown in the tour | Switches the step on or off | No | Tick box |
| Move the step up / down | Changes its order inside its tour (General tour, Administration tour) | Not a field | Needs `tour.settings_reorder` |

**The Security tab** (edit key `security_settings.edit`)

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Days a device stays trusted | How long the code is skipped on a trusted browser after a Microsoft sign-in | Yes | A whole number from 0 to 365; 0 switches the choice off (default 0) |
| Requests per minute | How many requests one address may make a minute before it is told to wait | Yes | A whole number from 120 to 100000 (default 600); a low value stops the whole platform |
| Let platform administrators sign in as another employee | Switches the «Sign in as» feature on | Yes | Off or on (off by default) |
| Minutes without activity before it ends | How long a «sign in as» session may sit idle | Yes | A whole number from 5 to 240 (default 30) |
| Allowed e-mail domains | The domains a work e-mail may use when an employee is added | No | One domain per line, such as `partner.org` (lower case, no `@`), up to 50; wrong lines are named; empty = only `arweqah.sa` |

### Workflow

**Setting up and switching on an outside service (translation, e-mail, bot protection, AI)**

1. **The administrator** turns on admin mode, opens «Settings» and the right tab, and presses the «How to get the data» icon to follow the numbered steps for getting the keys.
2. **They** open the service (click its row), fill the fields and press «Save». The platform stores the secrets encrypted and records in the audit log only the names of the fields that changed.
3. **They** press «Try» (`integrations.<kind>_test`). The platform tries the service with exactly that data; if it works, the status becomes «Tested».
4. **They** press «Switch on» (`integrations.<kind>_activate`). The message «… is now in use.» appears, and the service starts working. Only one service per kind is in use.
5. **If messages later fail,** the administrator reads the E-mail log for the error and the server's reply, then fixes the data and repeats steps 3 and 4.

| Status | Meaning | Who can change it (permission key) | Moves to |
|---|---|---|---|
| Data incomplete | A required field is empty or wrong | `integrations.<kind>_edit` (fill the fields) | Not tested |
| Not tested | The data is complete but was never tried, or was changed after the last test | `integrations.<kind>_test` | Tested (test passed) |
| Tested | A test passed with exactly this saved data | `integrations.<kind>_edit` (changing it sends it back to «Not tested») | In use |
| In use | The service the platform really uses | `integrations.<kind>_activate` (switch off), or saving changed data, which switches it off by itself | Not in use |
| Not in use | Not used; the server's own settings work instead, if they exist | `integrations.<kind>_activate` (switch on, only from «Tested») | In use |

**Rewording a message (templates)**

1. **The administrator** opens the message, edits both languages, checks the preview and presses «Send me a test» (e-mail only).
2. **They** press «Save». If second-person approval is off, the new wording is in use after about 30 seconds. If it is on, the change becomes «Waiting for approval» and the current wording stays in use.
3. **A different person** with the approve key reads the change and presses «Approve» (it goes live) or «Reject» (it is dropped). The author cannot approve their own change.
4. **«Back to default»** returns the original wording at once, or, when approval is on, becomes a change that also waits for approval.

| Template status | Meaning | Who can change it (permission key) | Moves to |
|---|---|---|---|
| Default wording | The wording kept in the platform is used | `templates.<kind>_edit` | Customised, or Waiting for approval |
| Customised | Your wording is in use | `templates.<kind>_edit`, `templates.<kind>_reset` | Default wording, or Waiting for approval |
| Waiting for approval | A change waits for a second person; the current wording is still sent | `templates.<kind>_approve` (another person) | Customised (approved) or its previous state (rejected) |

**Tour steps and security settings:** a tour step is edited, switched off, moved or reset and takes effect for the next tour; the security settings are saved with one button and apply at once. Both are recorded in the audit log.

**Automatic things:** a changed active service is switched off by the platform until it is tried again; a bad template never stops a message because the default is sent when a changed one fails to build; template changes may take about 30 seconds to reach every part of the system; every save, test, switch, approval, rejection and reset is written to the audit log; secrets are removed from error texts.

**What each person sees:** a tab and its buttons show only to people who hold its keys, in admin mode. A person with no tab key sees «You may not view any of these settings.» No ordinary employee sees this page.

### Tips and common problems

- **The «Switch on» button is missing:** it shows only after the test passes with the saved data (status «Tested») and with the activate key.
- **The service was switched off after I edited it:** this is intended; try it and switch it on again.
- **Messages do not arrive:** open the «E-mail log» and read «Error» and «Server response».
- **I want to change the service in use:** switch on the other service after its test passes, and it replaces the first.
