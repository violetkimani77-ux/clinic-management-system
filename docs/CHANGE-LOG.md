# Change Log / Release Memory

This file is the durable project memory for important completed, queued, and verified changes. Update it whenever a material production-readiness, security, branding, deployment, database, or product change is completed or intentionally queued.

## 2026-09-16 — Terms of Service page

### Completed on branch
- Branch: `feat/terms-of-service`.
- Added `app/terms/page.tsx` so the landing footer link to `/terms` resolves.
- Copy matches the `/privacy` document treatment (CSS modules, no Tailwind).
- Trial wording is the current four-day evaluation period, not the older fourteen-day draft from PR #13.
- `/privacy` and `/terms` added to `app/sitemap.ts`.

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
