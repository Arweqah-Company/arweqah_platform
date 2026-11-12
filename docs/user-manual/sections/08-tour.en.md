## The welcome tour

A guided tour that appears **once at your first sign-in**: it dims the screen and highlights the real elements one by one, explaining each in a bubble with a title, a text and the buttons «Next», «Back» and «Skip». It starts with your account, then Home, then the pages you hold. A manager has a separate tour for the administration pages, and a page in Settings to edit the tour's wording.

### Who sees it

- **The general tour:** every employee at first sign-in, with no permission key.
- **The administration tour:** whoever holds `admin_mode.use` («Use platform admin mode») at the **first time admin mode is turned on**; for anyone else it looks as if it does not exist.
- **The tour settings page** (Settings, then the «Welcome tour» tab): in platform admin mode, and it needs `tour.settings_view` («View the welcome tour settings»). By default only the System Admin role has it.

### What you can do

**In the tour itself (every employee)**


| Action | What happens | Permission |
|---|---|---|
| «Next» / «Back» (or the arrow keys) | You move between steps, even between pages | Not needed |
| «Skip» (or Esc) | The tour ends and is recorded as skipped | Not needed |
| «Done» on the last step | The tour is recorded as finished | Not needed |
| «Restart the tour» from your account menu or from «Profile» | The general tour starts again from the beginning | Not needed |
| «Show me» on the «There is something new» card | Shows only the new steps | Not needed |
| «Later» on that card | Postpones; the steps count as seen | Not needed |

**On the tour settings page (for managers)**


| Action | What happens | Permission |
|---|---|---|
| View the list | A table of steps: Step, Order, Tour (General / Administration), State (Shown / Switched off), Last change; with a table or cards view | `tour.settings_view` (View the welcome tour settings) |
| Search and filters | Search in the title and text, and filters by tour, by state and by «Changed from the original» | `tour.settings_view` |
| The «Edit» icon (or clicking the row) | Opens a dialog with the title and text in Arabic and English and a «The step is shown in the tour» switch | `tour.settings_edit` (Edit a welcome-tour step and switch it on or off) |
| The «Move the step up» and «Move the step down» icons | Move the step in the order | `tour.settings_reorder` (Reorder the welcome-tour steps) |
| The «Reset to original» icon (shown only for a changed step) | After confirmation the step's wording, order and visibility go back to what the system has | `tour.settings_reset` (Reset a welcome-tour step to its default wording) |
| «Export» | Exports the list of steps to Excel or CSV | `tour.settings_export` (Export the list of welcome-tour steps) |

### How to

**Restart the tour**


1. Press your name in the top bar to open your account menu.
2. Press «Restart the tour». (Or from «Profile», the «Welcome tour» section, then «Restart the tour».)

**Reword a step (for managers)**


1. Turn on platform admin mode, then open «Settings» and the «Welcome tour» tab.
2. Click the step or its edit icon.
3. Type the title and text in Arabic and English. Leave a field empty to show the original wording. Plain text, no formatting.
4. Turn off the «The step is shown in the tour» switch if you want to hide it, then save.
5. To go back to the original press the «Reset to original» icon and confirm.

### Business rules

- The result of the tour (finished or skipped) is saved **on your account**, not in the browser, so it does not come back from another device. (FR-67)
- Every step shows **only to someone who holds the key of its page and does not have it hidden**; so two people see two different lists. Each step lists one line for everything you can do there.
- A step whose element does not show (for example on a phone, or with no data) is skipped silently.
- After new steps are released, someone who finished their tour is offered a «There is something new» card with only the new ones.
- The administration tour starts the first time admin mode is turned on, and is recorded separately from the general tour.
- A system administrator edits only the **wording, the order and the visibility**. **The steps themselves** (what is highlighted and where) come with the system and cannot be added or removed from Settings, and the manager cannot see anyone's progress in the tour.
- Every edit, reset to original or reorder is recorded in the audit log.

### Tips

- Keyboard: arrows to move, Esc to skip.
- If you lost the tour, restart it at any time.
