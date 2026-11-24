## The platform assistant

A chat you can open from any page of the platform. Instead of going through several pages, you tell the assistant what you want to do («add a ticket type called Technical problem to my unit»). It asks for anything missing, shows you a card with what it is going to do, and does it **only after you press «Confirm»**, with your own permissions: it can do only what you could do yourself with the buttons of the platform.

### Who sees it

- Open key: `agent.view` («Open the platform assistant»). Writing to it and confirming its requests needs `agent.use` («Talk to the platform assistant and confirm its requests»). Seeing your earlier conversations needs `agent.history_view` («View my earlier conversations with the assistant»).
- Attaching pictures to a message needs `agent.attach_image` («Attach pictures in the assistant chat»), and speaking needs `agent.use_voice` («Speak to the platform assistant»). All three groups of keys are held by everyone with the **Employee** role and by unit heads. The round button is in the bottom corner of every page. It does not need platform admin mode.
- What the assistant does for you always goes through the permission of the action itself. If you cannot add a ticket type yourself, the assistant cannot add one for you; it does not even offer it.

### What you can do

| Action | What happens | Permission |
|---|---|---|
| Open the assistant | A panel opens beside the page | `agent.view` |
| Write a request | The assistant understands it, asks for what is missing, and prepares a request | `agent.use` |
| «Confirm» on the card | The request runs as you, once | `agent.use` and the permission of the action itself |
| «Cancel» on the card | The request is dropped | `agent.use` |
| «Earlier conversations» | Lists your past conversations and opens one | `agent.history_view` |
| Paperclip «Attach a picture» (also paste with Ctrl/Cmd+V, or drop on the writing box) | Uploads a screenshot to send with your message | `agent.attach_image` |
| Microphone «Speak to the assistant» (also a sound file in the paperclip box) | Records or reads your speech and writes it into the writing box | `agent.use_voice` |
| A picture in a message, or on a card | Opens it in a window | `agent.view` (your own conversation only) |
| Tick box under a picture on a card | Chooses whether that picture goes with the request | `agent.use` |

### How it works

1. Write what you want in your own words, in Arabic or English.
2. If mandatory fields are missing, the assistant lists **all of them in one message** for you to fill. It never guesses a value you did not give, and it matches names by meaning (a unit written a little differently is still found; if several are close it asks which).
3. When everything is there, a **card** shows the name of the action and a summary in plain words. A card that deletes something is red and names the item.
4. Press «Confirm» to run it, or «Cancel». The card waits a limited time (30 minutes unless the administrator changed it) and then expires; ask again if that happens.
5. After it runs you see «Done», or why it was not done (for example, the platform refused a value).

### Do I have permission?

Ask «can I add an employee?». The assistant looks at everything the platform can do, not only at what you can do, and tells you plainly: you can; or you lack the permission (it names it, and an administrator can give it); or its page is hidden from your roles; or it must be done from its page (it needs admin mode, a file upload or an import); or the platform has nothing like it.

### Pictures (screenshots)

Press the paperclip beside the writing box, paste a screenshot straight into the box (Ctrl/Cmd+V), or drop an image on the box. Each picture is uploaded at once and shown small above the box with a ✕ to take it out before sending. You may send **up to 3 pictures** in one message, **PNG or JPG**, **up to 5 MB** each, and a picture alone (no text) is a message.

- The assistant **looks at the picture** when the AI service the administrator switched on can read pictures, so you do not have to describe an error message or a wrong screen in words. If that service cannot read pictures, the assistant tells you so and asks you to describe the problem; your picture is still kept and can still go with a request.
- **Do not attach sensitive data** (salaries, ID numbers). A picture cannot be masked like typed numbers are, and it is sent to the AI service. Only you see your pictures: nobody else can open them, not even through the conversation.
- When the assistant prepares a request that takes files (for example a ticket), its card shows the pictures of the conversation with a tick box each, all ticked. The ones you leave ticked are attached to the ticket when you press «Confirm»; untick any you do not want attached. The assistant never chooses the files itself.
- Pictures stay with the conversation. A picture attached to a ticket stays on the ticket, seen by whoever may see the ticket.

### Speaking to the assistant

Press the microphone, allow it in the browser the first time, speak, and press it again to stop (a recording lasts at most 5 minutes). Or press the paperclip and choose a **sound file** (mp3, m4a, wav, ogg… anything your browser can play, up to 5 minutes), for example a voice note from your phone. The sound is written down and the **text appears in the writing box**: read it, correct any word the listening got wrong (names and numbers often do), and press send. Nothing reaches the assistant before you send it. If you already typed something, the speech is added after it.

- **Whether it works depends on the AI service the administrator switched on.** Claude does not take sound; with it the screen says «the AI service that is switched on does not take sound», and you type instead. Some other services take it and some do not.
- Your recording is sent to the AI service to be written down and **is not kept** by the platform: no file, no copy in the conversation, only the text you choose to send. Speech cannot be hidden like typed numbers, so **do not say sensitive data** (salaries, ID numbers).
- A very long speech is cut at the size of a message and the screen says so. Recording counts toward your messages per hour.
- If the microphone is blocked, allow it for the platform in the browser's address bar, or choose a sound file instead.

### Links and the form

- After it explains where something is, buttons under its message open the matching section of this manual and the page itself (the page button shows only if the page is in your menu).
- When fields are missing, the assistant asks and also shows an «Open the form» button: a real form with all the fields, filled with what it understood, with lists to choose from (ticket types, units…). «Send the form» makes the same confirmation card; nothing runs until you press «Confirm».

### Asking «how do I…?»

Ask the assistant how to do something («how do I add a ticket type?»). It answers with the whole workflow from this user manual: the page, each button in order, the fields, and the permission needed. It explains only what you may do: a page you cannot open is not explained to you.

### Fields (form inputs)

| Field | What it is for |
|---|---|
| «Write your message» (the box at the bottom of the panel) | What you ask for, in your own words. Needs `agent.use`. |
| The paperclip file box | The pictures to send with the message: PNG or JPG, up to 3, 5 MB each. Needs `agent.attach_image`. |
| The fields of the form the assistant opens | They are not fixed: they are the fields of the action you asked for (for a ticket type: the unit, the Arabic and English names, and so on). A star marks a mandatory field; a choice list shows real data of the platform; a mistake is shown under its field as you type, and the send button waits until all is right. |

### Workflow

| State of a card | Meaning | Who moves it | Permission |
|---|---|---|---|
| Waiting for you | The request is ready and nothing has run | The assistant makes it | — |
| Confirmed | It ran once as you | You press «Confirm» | `agent.use` and the action's own permission |
| Failed | The platform refused (a value, a rule); the reason is shown | The platform | — |
| Cancelled | You dropped it, or a newer request in the same conversation replaced it | You or the assistant | `agent.use` |
| Expired | Nobody confirmed it in time (30 minutes unless changed) | Automatic | — |

A form follows the same road: «Open» until you send it, then «Sent», which makes the confirmation card. Everyone sees only their own conversations; a person with `agent.view` and without `agent.use` can read the assistant's answers but not write, confirm or send forms.

### Business rules

- The assistant runs nothing by itself: every change waits for «Confirm», and a request runs once (two presses at the same moment run it once) (FR-141).
- It acts only with your own permissions, in your own scope; an action you may not do is not offered, and a record out of your scope is not found (FR-139).
- An id is accepted only if one of its own lookups showed it, together with its name; it never invents one (FR-140).
- At most six steps are taken for one message; after that it says it could not finish (FR-138).
- A card expires after the time the administrator set (30 minutes by default); a new request replaces the one still waiting (FR-141).
- Only an image (PNG or JPG) of at most 5 MB is accepted, checked by its real content and not by its name; at most 3 per message; each picture goes with one message only (FR-180).
- A recording is a 16-bit WAV of at most 5 minutes and 10 MB made by your browser; it is written down by the AI service, never stored, and what you read is text you may edit (FR-181).
- Pictures are read only by the owner of the conversation they came with; anyone else gets «not found» (FR-180).
- The pictures that go with a request are the ones you left ticked on its card, never ones the assistant chose, and only from this conversation (FR-180).
- The messages per hour are limited (30 by default); a message the AI service could not answer does not count (FR-144).
- If the administrator switches the assistant off, nothing it prepared can be confirmed (FR-150).
- Sensitive fields of platform records (national ID, IBAN, salary) are removed by field name from lookup results, and an IBAN or any number of ten digits or more that you type is replaced by «[hidden number]», before the AI service receives them (your own message keeps what you wrote); still, do not type a national ID or an IBAN in a chat. What the assistant runs is written to the audit log as coming through the assistant (FR-144).

### Good to know

- The assistant never changes anything by itself. The most it does is prepare a card.
- It cannot upload files other than your screenshots, import lists, sign you in or out, or change system settings. Do those from their pages.
- You see what the assistant is doing and its answer as it is written, not only at the end.
- There is a limit on how many messages you may send in an hour (30 unless the administrator changed it).
- What you write, the names it looks up and the pictures you attach are sent to the AI service the administrator switched on in the settings. Do not write passwords or other secrets to it, and do not attach pictures that show them.
- A new request in the same conversation cancels a card still waiting.
- Your conversations are private to you.

### For the administrator

In Settings, the «Security» tab has a «Platform assistant» part with a check box «Switch the platform assistant on» (off: the button disappears for everyone and nothing it prepared can be confirmed; conversations are kept) and two numbers: messages per employee per hour and minutes a request waits for confirmation. The AI service itself (Claude or the free compatible service) is set in the «Artificial intelligence» tab.
