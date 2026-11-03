# Permission dependencies and job-title roles in the employee roles dialog

Owner request (2026-11-02): (1) a new job title and its role did not show in the employee's roles dialog; (2) a button permission (add, edit…) must need its page's `view` permission first. Decisions: ticking an action ticks what it needs and locks that permission (auto + lock); dependencies come from a rule plus a small exceptions table.

## 1. Job-title roles in the roles dialog (bug)
- `RolesDialog` and the employee form's roles step offer manual roles, the held roles and the unit-head roles of the employee's company. Roles with `autoRule = 'job_title'` are offered only when held.
- Fix: offer the job-title roles of the employee's company too, with the "job title" badge. A role's company comes from `RoleDto.origin.companyId` (title → unit → company); the API already gives it for head roles and gets the same for title roles.
- Shared helper `assignableRoles(roles, {companyId, heldIds, jobTitleId})` used by both the dialog and the form step, so the two lists cannot drift.

## 2. Permission dependencies
### Definition (`packages/shared/src/permissions/dependencies.ts`)
- `requiredPermissions(key): string[]`:
  1. explicit entry in `PERMISSION_DEPENDENCIES` (map key → keys, `[]` = none) wins;
  2. otherwise a key `<module>.<action>` with `<module>.view` in the catalog requires that view key; a `view` key requires nothing.
- Exceptions table holds the cases where the rule is wrong, e.g. `tasks.approve` → `tasks.team_view`; integration keys → their own `view`; `admin_mode.use` → none.
- `closeOver(grants, catalog)` adds missing required keys (scope = widest scope the dependent holds, capped by the scopes the required key offers); `missingFor(grants)` lists gaps.

### Web (`PermissionMatrix`, shared by permissions page, role editor, exceptions)
- Ticking a key also ticks what it needs. A key that is needed by a ticked key is locked ticked, with "needed by: …" next to it; it unlocks when the dependents are unticked.
- Each key shows "needs: …" when it has requirements. Search (done earlier) is unchanged; hidden rows keep their state.

### API
- Every save of grants (role, role group, user, user group, access exception, role create/update) runs `missingFor`; a gap answers 422 `PERMISSION_DEPENDENCY_MISSING` listing the missing keys (ar + en). One shared check in `core/access`, called by the existing services, not copied.

### Existing data
- Migration closes every stored set (roles, groups, personal permissions, exceptions) over the dependencies, scope = widest scope the dependent holds; nobody loses access. The migration logs how many sets changed. Seeded system roles and the auto-made head and title roles use the same rule.

## 3. Out of scope
- No runtime change: routes still check only their own `@RequirePermission`; dependencies govern choosing and saving.

## 4. Tests
- Unit: rule, exceptions, `closeOver`, `missingFor`; architecture check: every exception key and every required key exists in the catalog.
- Component: auto-tick, lock and unlock in the matrix; the roles dialog lists a title role of the employee's company and not another company's.
- API e2e (named with the FR id): 422 on each save path, happy path with a closed set, 403 per role, existing 404 rules unchanged; migration test on a seeded set.
- Docs: README FR row, `docs/decisions.md`, plan log; no new table (rule 11 n/a); no new page (tour n/a).
