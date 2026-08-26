# Task 7 — Frontend prompt-management window

## Requirement mapping

| Requirement | Delivered |
| --- | --- |
| Owner/Admin navigation | `requiredRoleCodes`, page mapping, role-aware desktop and Start Menu filtering; access augmentation for `OWNER` and `ADMIN_VENDOR`. |
| API contract | Typed settings, save, history and restore client for `/api/erp/ai-analysis-prompts`. |
| Prompt UI | Exactly two tabs: global textarea; report catalog dropdown plus textarea. Both default to `""` without an active version. |
| Save/version behavior | 4,000-character counter, empty save permitted, outer whitespace trimmed, server settings reloaded after successful save, active version/actor/time shown. |
| History/restore | Current-scope side panel, confirmation before restore, server reload after restore; historical rows are never removed. |
| Safety/error behavior | No core prompt is seeded or displayed. Failures use `formatApiError`; no optimistic active-version update. |

## TDD

- RED: `npx tsx data/pageAccess.test.ts` failed with `false !== true` before role-aware page access and prompt-page augmentation existed.
- GREEN: the same test passes after implementing the role allowlist and augmentation. It covers Owner/Admin visibility, Manager exclusion, and the new-account Owner fallback.

## Verification

All passed:

```text
npm run test:page-access
npm run test:ai-report-context
npm run test:top-order-staff
npx tsc --noEmit
npm run build
git diff --check
```

The build emits the existing Next.js multiple-lockfile workspace-root warning only.

## Manual status

Not run. No authenticated Owner/Admin/Manager credentials were available. A local backend process was present, but `GET http://localhost:5080/api/erp/ai-analysis-prompts` returned `404`, so the Task 3 API was not available at the configured frontend base URL.

## Commit

Task implementation commit: `38c0b71cc6f18153a03a776536edcec95afae630` (`feat(ai): manage supplemental report prompts`).

## Concerns

- Authenticated UX and API authorization still need the Task 3 backend plus Owner/Admin/Manager test accounts.
