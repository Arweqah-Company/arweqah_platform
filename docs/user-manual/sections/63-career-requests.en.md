## Development requests

A development request is a request for learning that is not simply a unit of your plan, for example a course at another provider, with its cost. The request goes to the right approver by its cost: the direct manager, the sector head or the CEO. Employees send requests from their learning plan; approvers decide them on the page **«Development requests»**.

### Who sees it

- **Sending a request (employee):** `career_requests.create` (Send a development request), scope: all. Held by the Employee role; the button «Request learning outside the plan» is in «Learning plan». The employee follows the requests in «Learning plan», then «My requests».
- **The approvers' page:** view permission `career_requests.view` (View the «development requests» page), scopes: unit, unit and below, company, all; default **unit and below**. The head role of every unit holds `career_requests.view`, `career_requests.approve`, `career_requests.reject` and `career_requests.export` at «unit and below».
- It does not need platform admin mode.
- Menu: the group «Career file», item «Development requests».

### What you can do

| Action | What happens | Permission key (label) |
|---|---|---|
| Send a request | The dialog «Learning request» sends a request for approval; the approver is shown before you send | `career_requests.create` (Send a development request) |
| Follow my requests | The list «My requests» with search, filters and a details window | `career_profile.view` (View my career path) |
| Open the page, search and filter | Two views: «Waiting for me» and «All requests»; search by employee or course; filters: state, approver, in or outside the plan | `career_requests.view` (View the «development requests» page) |
| Open a request (eye icon or a click on the row) | A window with the course, cost, plan, approver, state, dates, the retention agreement file and a warning if the cost is above the budget left | `career_requests.view` (View the «development requests» page) |
| Approve (check icon) | The request is approved and its cost counts in the budget spent of the employee | `career_requests.approve` (Approve a development request) |
| Reject (X icon) | The request is rejected with a reason and the employee is told | `career_requests.reject` (Reject a development request with a reason) |
| Export the list | Downloads the requests (scope, columns, file type) | `career_requests.export` (Export the list of development requests) |

The approve and reject icons appear only on a request that is with you.

### How to

**Send a learning request (employee)**

1. Open «Career path», then «Learning plan» and press «Request learning outside the plan».
2. Write the course name and its cost in riyals (a whole number).
3. Choose «In the learning plan» (a unit of your plan you want at another provider) or «Outside the plan».
4. Optionally attach the retention agreement for funded training (PDF or image).
5. Check the line «Decided by» and the approver name that appear at once, and the budget left. Press «Send the request».

**Decide a request (approver)**

1. Open **Development requests**. The tab «Waiting for me» lists what is with you.
2. Click a request to read it. Check the cost, the plan kind and the budget warning.
3. Press «Approve», or press «Reject», write the reason (at least 5 characters) and confirm. The employee is told.

### Business rules

- **Who decides by cost** (FR-116): in the plan and **up to 5,000 riyals** the direct manager; **outside the plan or from above 5,000 up to 20,000** the sector head; **above 20,000** the CEO. The dialog shows who decides and why as soon as you type the cost.
- **The approver is chosen when the request is sent:** the direct manager of the employee, the head of the sector above their unit, or the CEO (the head of the office directly under the group). If nobody holds the post, or the holder is the employee, the request goes up to the next level; if nobody holds any higher post the request is refused with the message «Nobody holds the approver post yet: ask HR to set the unit leader.»
- **The direct manager has 7 days (about 5 working days);** after that the request goes up to the sector head, who and the employee are told.
- **You decide only what reaches you:** a request with another approver is shown read only («The request is with another approver and you see it read only»). Someone outside your scope does not see the request.
- **Approve or reject only, with a reason for rejection of at least 5 characters;** the decision closes the request and the employee reads the reason. If someone decided it first, you get «The decision could not be made».
- **The budget is a warning, never a block:** the cap is the one of the employee's development stage; the spent amount is the cost of the requests approved in the current calendar year (Riyadh). If the cost is above what is left, the dialog warns and the lists show «Above the budget left»; the approver decides. If the stage has no cap, nothing is compared.
- The retention agreement is optional and is seen by the approver.
- States: waiting for a decision, approved, rejected. Plan kinds: in the plan, outside the plan.
- Both lists offer search, filters, the table / cards switch and export.

### Tips and common problems

- The button «Request learning outside the plan» is missing: your role lacks `career_requests.create`.
- The request is refused at sending: nobody holds the approver post above you; ask HR to set the leader of the unit.
- The page is empty: «There are no development requests yet» or nothing is with you; try «All requests».
