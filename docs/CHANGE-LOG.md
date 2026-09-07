# Change Log / Release Memory

This file is the durable project memory for important completed, queued, and verified changes. Update it whenever a material production-readiness, security, branding, deployment, database, or product change is completed or intentionally queued.

## 2026-09-07 — Heri CMS branding

### Completed / queued on branch
- Created branch `chore/rename-hali-to-heri` from current `main`.
- Renamed customer-facing `Hali CMS` branding to `Heri CMS` in:
  - `app/layout.tsx` metadata/title/description
  - `app/trial/page.tsx`
  - `app/trial/success/page.tsx`
  - `src/components/dashboard/workspace-shell.tsx`
- Trial functionality and security/business logic were not changed by the branding rename.
- Branch is **not merged to `main` and not deployed** yet.
- Remaining work: validate all customer-facing branding, align trial styling with the public landing/login/CMS portal, then open/merge PR only after review and tests pass.

## 2026-09-07 — Hali CMS production-readiness baseline

### Completed / verified
- Hali production-readiness PR #6 was squash-merged to `main`.
- Current `main` commit at the time of this log: `af690c6`.
- Production deployment corresponding to that commit was READY on Vercel.
- Production Prisma migration workflow succeeded for `main` (workflow run `34104932955`).
- Hali trial migration `20260907120000_add_platform_trial_models` was applied through the production migration workflow.
- `/login` was verified on current production with HTTP 200 and no recent runtime 4xx/5xx/error/fatal logs in the available inspection window.
- Trial route source was restored after an earlier preview omission; commit `58a8b31 fix: restore trial signup page` was included in the Hali readiness work.
- Local validation after trial restoration passed: lint, typecheck, Jest (3 suites / 11 tests), and production build; build generated `/trial`, `/trial/success`, and `/api/trial`.
- Tenant-isolation review found no concrete bypass in reviewed patients, visits, pharmacy, accounts, prescriptions, dashboard metrics, and authorization paths. Automated authorization tests included blocking cross-clinic access.
- Production error `User.lockedUntil does not exist` was traced to the separate `feat/mfa-login-protection` line, not Hali/main. Do not restore that migration or modify production schema to accommodate it.
- Separate historical `/api/auth/login` `DATABASE_URL` initialization errors were traced to `feat/auth-seed-work`, not Hali/main.

### Important outstanding production-readiness items
- Public Hali/Heri landing-page source needs to be deliberately brought into current `main`; do not roll production back to the old deployment.
- Trial signup UX/browser E2E and production-like lifecycle verification remain to be completed without creating real clinical data in production.
- Actual production database/backup/DR geography and provider/subprocessor residency evidence remain unverified.
- Observability/alerting, backup testing, final legal/compliance review, full cross-module E2E, and other checklist gates remain outstanding unless separately marked verified.
- The production-readiness checklist contains some stale deployment evidence and should be updated as release evidence changes.

## 2026-09-07 — Landing page investigation

- User identified the Hali public landing page at the historical Vercel URL `clinic-management-system-9e3ll1je0.vercel.app`.
- That URL is an older Vercel deployment and is not the current `main` production deployment.
- Current `main` root route intentionally redirects unauthenticated users to `/login`; therefore the current production root is not the historical public landing page.
- Safe plan: recover the historical landing-page source and bring it forward into current `main`; do not rollback production.
- User wants the future trial page styling to match the public landing page and login/CMS portal.

## Durable operating rules
- Prefer small, reviewable branches/PRs for changes.
- Never run production migrations locally; production migrations run through CI with `prisma migrate deploy`.
- Do not modify applied Prisma migrations or use `db push`/`migrate reset` against production.
- Do not expose or log passwords, signup secrets, health data, or other sensitive user data.
- Do not create real clinical records merely to test production readiness.
- Record material changes here with status (`completed`, `verified`, `queued`, or `blocked`) and include commit/PR/deployment/workflow identifiers where available.
