# Heri CMS Platform Control Panel

## Purpose

The Platform Control Panel is a privileged platform-operations surface separate from the clinic application. It is not a replacement for clinic RBAC and it must not provide an implicit super-admin bypass into patient records.

## Initial implementation boundary

The authentication, MFA, session, authorization, TOTP replay protection, and high-risk step-up foundation is on `main`. The control-panel UI remains a later staged slice and is still intended as a read-only operational overview until that UI lands with the same authorization checks.

### Information architecture

- Overview — platform health, active clinics, trials, subscriptions, datastore health, payment integration health and security alerts.
- Clinics / Tenants — tenant directory and operational metadata; clinical records are not exposed by default.
- Provisioning — tenant/datastore provisioning state and failures.
- Data Residency — residency policy, country/backup country and transfer-assessment status.
- Datastores — isolation mode, lifecycle state and health.
- Security & Audit — platform administrative events and security signals.
- Payment Integration — integration health and reconciliation state.
- Maintenance — controlled operational actions, disabled until their authorization controls exist.

## Security boundary

Platform administration must use a distinct identity/session and authorization model. Existing clinic `ADMIN` membership is not sufficient platform authority. Break-glass access, if introduced later, must be explicit, time-bounded, justified and fully audited.

## Release gates

Before the control panel is represented as production-ready:

1. Platform-admin authentication and mandatory MFA are implemented.
2. Least-privilege platform roles are implemented and tested.
3. Cross-tenant access denial is tested.
4. Destructive and high-risk actions require typed confirmation **and** step-up re-authentication (password + a fresh TOTP that has not already been consumed). A `CONFIRM` string alone is not step-up.
5. Every privileged operation emits an immutable/tamper-evident audit event.
6. Sensitive clinical data is minimized and never exposed merely because a user is a platform administrator.
7. Platform E2E, authorization, audit and accessibility tests pass.

Until those gates pass, the control panel is an operational read-only surface, not a production administration authority.

## Step-up authentication (gate 4 — implemented in the library layer)

`requireHighRiskStepUp` enforces, in order:

1. The caller holds the platform action (`requirePlatformAction`).
2. The action is in the high-risk set.
3. `confirmation === "CONFIRM"` (the operator meant it).
4. `reauthenticatePlatformAdmin` verifies the live password and a TOTP whose counter is strictly greater than `PlatformAdmin.lastUsedTotpCounter`.

The same counter is consumed on login, so a code used to sign in cannot be reused to suspend a tenant in the same 30-second window.
