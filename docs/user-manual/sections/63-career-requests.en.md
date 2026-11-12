## Development requests

A development request is a request for learning that is not simply a unit of your plan, for example a course at another provider, with its cost. The request goes to the right approver by its cost: the direct manager, the sector head or the CEO. Employees send requests from their learning plan; approvers decide them on the page **«Development requests»**.

![Development requests](../images/en/21-career-requests.png)

### Who sees it

- **Sending a request (employee):** `career_requests.create` (Send a development request), scope: all. Held by the Employee role; the button «Request learning outside the plan» is in «Learning plan». The employee follows the requests in «Learning plan», then «My requests».
- **The approvers' page:** view permission `career_requests.view` (View the «development requests» page), scopes: unit, unit and below, company, all; default **unit and below**. The head role of every unit holds `career_requests.view`, `career_requests.approve`, `career_requests.reject` and `career_requests.export` at «unit and below».
- It does not need platform admin mode.
- Menu: the group «Career file», item «Development requests».

### What you can do

| Action | What happens | Permission |
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

### Fields (form inputs)

**Learning request (dialog «Learning request», sent by the employee)**

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Course name | The name of the course or training you ask for | Yes («The course name is required.») | From 2 to 200 characters |
| Cost in riyals | What the course costs. The cost decides who approves (see the workflow) and is compared with what is left of your yearly budget | Yes («The cost is required (a whole number of riyals).») | A whole number from 0 to 10,000,000 |
| Is the course in your learning plan? | Whether the course is a unit of your plan that you want to take at another provider, or something outside the plan | Yes (one of the two) | «In the learning plan» (up to 5,000 riyals goes to the direct manager) or «Outside the plan» (needs the sector head at least) |
| Retention agreement for funded training | The agreement you sign when the company pays for the training, attached for the approver to see | No | One file, PDF, PNG or JPEG, up to 10 MB |

While you type, the dialog shows «Decided by», the name of the approver, and «Left of your yearly budget». If the cost is above what is left it warns but still lets you send. If the approver post is vacant, or held by you, the request goes up to the next level; only when nobody holds any post that can decide it does the dialog say «Nobody holds the approver post yet: ask HR to set the unit leader.» and the request is refused.

**Reject a request (dialog «Reject the request», by the approver)**

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Reason | Why the request is refused; the employee reads it | Yes | From 5 to 500 characters («The reason needs at least five characters.») |

**Search and filters of the list**

| Field | What it means / what to type | Required | Allowed values / rules |
|---|---|---|---|
| Search the requests | By employee or course | No | Up to 120 characters |
| State | Where the request stands | No | Waiting, Approved, Rejected |
| Approver | The level that decides now | No | The direct manager, The sector head, The CEO |
| In or outside the plan | The plan kind of the course | No | In the plan, Outside the plan |
| Waiting for me / All requests (view) | Only what is with you, or all the requests of your scope | — | Two tabs |

### Workflow

A development request is a record run by the machine `career.development_request`.

1. The employee fills «Learning request» and presses «Send the request». The system picks the level by cost and plan, and the person by the structure, then stores them on the request.
2. The approver is told («A development request is waiting for your decision») and finds it under «Waiting for me».
3. The approver opens the request, reads the cost, the plan kind, the agreement and the budget warning, and presses «Approve» or «Reject» (with a reason).
4. The employee is told of the decision. An approved request counts its cost in the budget spent of the employee for the current calendar year.
5. If the **direct manager** does not answer in **7 days**, the request goes up to the sector head by itself: the sector head is told, and so is the employee («Your development request went up»). If nobody holds a higher post, the direct manager keeps it and can still decide.

Who decides by cost: in the plan and up to 5,000 riyals, the direct manager; outside the plan, or above 5,000 up to 20,000 riyals, the sector head; above 20,000 riyals, the CEO. A post that nobody holds, or that the employee holds, sends the request up to the next level.

| Status / Stage | Meaning | Who can move it (permission key) | Moves to |
|---|---|---|---|
| Sent (routing) | The request was just made and is being routed | The system, at once | The direct manager, the sector head or the CEO |
| With the direct manager | In the plan and up to 5,000 riyals; 7 days to answer | The approver: `career_requests.approve`, `career_requests.reject`; the system after 7 days | Approved, Rejected, or the sector head (timeout) |
| With the sector head | Outside the plan, or from 5,000 up to 20,000; no deadline | The approver: `career_requests.approve`, `career_requests.reject` | Approved or Rejected |
| With the CEO | Above 20,000; no deadline | The approver: `career_requests.approve`, `career_requests.reject` | Approved or Rejected |
| Approved | Decided; its cost counts in the budget (final) | — | — |
| Rejected | Refused with a reason the employee reads (final) | — | — |

**Automatic things**

- **The 7-day timeout** of the direct manager is a durable timer of the workflow (it survives a restart) that moves the request to the sector head and notifies both people.
- **Notices:** the approver on sending and on going up; the employee on approval, rejection and going up.
- **Audit:** sending, approval, rejection and going up are recorded (the going up is recorded without a person: it is the system).

**What each person sees:** the employee follows their own requests in «Learning plan», then «My requests»; an approver sees, with `career_requests.view` at «unit and below», the requests of the people in their scope and can decide only the ones that reach them (the others are read only).

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
