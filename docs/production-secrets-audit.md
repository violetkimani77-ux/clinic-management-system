# Production secrets audit

## Scope

Audit performed on `feat/production-e2e-readiness` before production release.

## Findings

- No tracked `.env` or `.env.*` file was found in the repository tree; `.gitignore` excludes `.env` and `.env.*` while allowing only `.env.example`. No `.env.example` is currently tracked, so production environment names are not documented in a committed template yet.
- No `NEXT_PUBLIC_*` environment variable usage was found in the repository search. This reduces the risk of accidentally publishing server-only credentials through Next.js public environment variables.
- Prisma obtains `DATABASE_URL` from the server-side environment through `env("DATABASE_URL")`; it is not hard-coded in application source.
- The authentication session module explicitly imports `server-only` and keeps session tokens hashed server-side; the browser cookie contains the opaque session token rather than database credentials or other secret configuration.
- CI uses an isolated test `DATABASE_URL` and injects the E2E password through the GitHub Actions secret `E2E_STAFF_PASSWORD`; the password is not stored in source.
- A tracked-source secret scan was added at `scripts/check-secrets.mjs` and is now executed by CI before lint/typecheck/tests/build.

## Automated guard

Run locally with:

```text
npm run security:secrets
```

The scan checks tracked application/configuration files for common credential formats, private-key blocks, and `NEXT_PUBLIC_*` names containing secret-like terms. It intentionally does not print matched secret values.

## Remaining release-gate items

This audit does **not** prove that Vercel production environment variables are correctly configured, that production credentials differ from test credentials, or that historical Git history is free of secrets. Those require deployment/account-level verification and, for historical scanning, a dedicated secret-scanning tool or local clone with full history.

The application is not declared production-ready by this audit alone.
