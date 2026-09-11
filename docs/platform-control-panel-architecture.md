# Heri CMS Platform Control Panel

## Purpose

The Platform Control Panel is a privileged platform-operations surface separate from the clinic application. It is not a replacement for clinic RBAC and it must not provide an implicit super-admin bypass into patient records.

## Initial implementation boundary

This work starts with the safe architectural boundary and read-only operational overview. High-risk operations remain disabled until platform-admin authentication, MFA, authorization, step-up authentication, audit coverage, and negative-path tests are implemented.

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
4. Destructive and high-risk actions require confirmation and appropriate step-up authentication.
5. Every privileged operation emits an immutable/tamper-evident audit event.
6. Sensitive clinical data is minimized and never exposed merely because a user is a platform administrator.
7. Platform E2E, authorization, audit and accessibility tests pass.

Until those gates pass, the control panel is an operational read-only surface, not a production administration authority.
