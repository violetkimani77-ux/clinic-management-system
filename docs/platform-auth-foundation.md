# Platform Auth Foundation (staged slice 1 of PR #13)

This branch lands the Platform Control authentication, MFA, session, authorization, and tenant-control foundation.

- Models and migrations are present, including `PlatformAdmin.lastUsedTotpCounter` for TOTP replay protection.
- Login and high-risk step-up both consume the TOTP counter atomically (`UPDATE … WHERE lastUsedTotpCounter IS NULL OR lastUsedTotpCounter < :counter`). A captured authenticator code cannot be reused.
- High-risk actions (`SUSPEND_TENANT`, `IMPERSONATE_TENANT`, `BREAK_GLASS`) require all three of: the typed confirmation `CONFIRM`, the administrator's password, and a fresh TOTP. A confirmation string alone is not sufficient.
- UI, e2e suite, and CI workflow changes from the original PR remain for later slices.
- `src/lib/platform/trials.ts` on main is left untouched.
