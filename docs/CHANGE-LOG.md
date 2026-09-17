# Change Log / Release Memory

This file is the durable project memory for important completed, queued, and verified changes. Update it whenever a material production-readiness, security, branding, deployment, database, or product change is completed or intentionally queued.

## 2026-09-16 — Platform TOTP replay protection and real step-up (final-audit tasks 1–4)

### Completed on branch
- Branch: `feat/platform-auth-hardening`.
- `verifyTotp` now returns `{ ok, counter }` instead of a boolean. `generateTotp` is exported for tests and provisioning.
- New nullable `PlatformAdmin.lastUsedTotpCounter` plus migration `20260916170000_add_platform_totp_replay_protection`. Existing applied migrations were not edited.
- Login and step-up consume the TOTP counter with an atomic `updateMany` (`lastUsedTotpCounter IS NULL OR lastUsedTotpCounter < counter`). A captured authenticator code cannot be replayed.
- `requireHighRiskStepUp` now requires typed `CONFIRM` **and** `reauthenticatePlatformAdmin` (password + fresh TOTP). A confirmation string alone is rejected.
- `suspendPlatformTenant` / `reactivatePlatformTenant` take a `PlatformStepUp` object.
- Unit tests added for all six platform library files (`crypto`, `mfa`, `auth`, `authorization`, `session`, `tenant-control`), including the previously missing `tests/unit/platform-authorization.test.ts` matrix from PR #13.
- Architecture docs updated so gate 4 matches the code. `src/lib/platform/trials.ts` was not touched.
- Seed provisions a platform admin only when `PLATFORM_ADMIN_EMAIL`, `PLATFORM_ADMIN_PASSWORD`, `PLATFORM_ADMIN_MFA_SECRET`, and `PLATFORM_AUTH_ENCRYPTION_KEY` are all set.

## 2026-09-07 — Heri public landing page recovered


### Completed on branch
- Branch: `chore/rename-hali-to-heri`.
- Recovered the richer public landing page from historical source commit `255a271` instead of recreating it from memory or rolling production back.
- Restored public navigation, hero, capabilities, security, four-day trial CTA, CMS portal links, and footer.
- Updated landing metadata and customer-facing copy from Hali CMS to Heri CMS.
- Applied the requested logo treatment: **Heri** light green and **CMS** navy blue.
- Landing trial CTAs point to the existing `/trial` route; portal CTAs point to `/login`.
- Existing authentication, trial persistence, tenant controls, and database migration logic were not changed as part of the landing recovery.
- Branch remains separate from `main` pending validation and review.

## 2026-09-07 — Heri CMS branding and auth navigation

### Completed / queued on branch
- Branch: `chore/rename-hali-to-heri`.
- Customer-facing `Hali CMS` branding was renamed to `Heri CMS` in application metadata, trial pages, and the authenticated workspace shell.
- Standardized the logo treatment so **Heri** uses light green and **CMS** uses navy blue in the login/CMS portal and trial signup areas.
- Added a clear `Start a 4-day free trial` path to the login page so users can choose between signing in and starting a new trial workspace.
- Kept existing trial/authentication business logic unchanged.
- Added Playwright coverage for the login-page Heri CMS logo and signup navigation.
- Trial signup styling was aligned with the existing CMS/login visual language without changing signup security or persistence behavior.
- Historical public landing-page source has now been recovered and brought into the Heri branch; browser/build validation remains required before release.

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
- Public Heri landing page must be validated and then deliberately brought into current `main`; do not roll production back to the old deployment.
- Trial signup UX/browser E2E and production-like lifecycle verification remain to be completed without creating real clinical data in production.
- Actual production database/backup/DR geography and provider/subprocessor residency evidence remain unverified.
- Observability/alerting, backup testing, final legal/compliance review, full cross-module E2E, and other checklist gates remain outstanding unless separately marked verified.
- The production-readiness checklist contains some stale deployment evidence and should be updated as release evidence changes.

## Durable operating rules
- Prefer small, reviewable branches/PRs for changes.
- Never run production migrations locally; production migrations run through CI with `prisma migrate deploy`.
- Do not modify applied Prisma migrations or use `db push`/`migrate reset` against production.
- Do not expose or log passwords, signup secrets, health data, or other sensitive user data.
- Do not create real clinical records merely to test production readiness.
- Record material changes here with status (`completed`, `verified`, `queued`, or `blocked`) and include commit/PR/deployment/workflow identifiers where available.
