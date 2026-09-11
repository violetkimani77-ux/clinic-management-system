# Heri CMS Platform Control provisioning

Platform Control is intentionally separate from clinic authentication. Clinic `ADMIN`, `PHARMACY`, and `ACCOUNTS` memberships do not grant platform authority.

## Required production secrets

Provision the first platform administrator through the Prisma seed using environment secrets:

- `PLATFORM_ADMIN_EMAIL`
- `PLATFORM_ADMIN_PASSWORD`
- `PLATFORM_ADMIN_MFA_SECRET` — Base32 TOTP secret for the administrator's authenticator app
- `PLATFORM_AUTH_ENCRYPTION_KEY` — 32-byte random key encoded as 64 hexadecimal characters

`PLATFORM_ADMIN_NAME` is optional.

The MFA secret is encrypted before storage. Passwords are stored as salted scrypt hashes. Platform sessions use a separate cookie and database session table from clinic sessions.

## Provisioning flow

1. Apply Prisma migrations with `npm run db:migrate:deploy`.
2. Set the platform-admin secrets in the production environment.
3. Run the seed once in the controlled deployment environment.
4. Open `/platform/login` and authenticate with password + TOTP.
5. Verify the Platform Control overview is reachable.
6. Verify a normal clinic session cannot access `/platform`.
7. Verify platform login/logout events appear in the platform audit trail.

Do not put platform secrets in tracked files or `NEXT_PUBLIC_*` variables.

## Current security boundary

The initial Platform Control surface is read-only. Provisioning, suspension, residency changes, maintenance actions, tenant impersonation, and other destructive operations remain disabled until their authorization and audit controls are implemented and tested.