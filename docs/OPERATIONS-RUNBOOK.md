# Heri CMS Operations Runbook

## Scope

This runbook covers routine release, migration, rollback, backup/restore, maintenance, and incident-response operations for Heri CMS.

## Release checklist

1. Confirm the intended commit is on `main` and CI is green.
2. Run typecheck, lint, Jest, production build, and Playwright against the release candidate.
3. Confirm production environment variables and deployment secrets are present; never copy secrets into source control or logs.
4. Confirm the production database backup is current before schema changes, and record the backup timestamp/reference in release evidence.
5. Apply production database migrations using the protected production migration workflow.
6. Deploy the application release.
7. Verify `/login`, `/trial`, and protected workspace access using production-safe smoke tests.
8. Record deployment SHA, database migration result, backup evidence, and verification evidence.

## Prisma migrations

Production migrations use the committed `.github/workflows/migrate-production.yml` workflow and `prisma migrate deploy`.

- The migration workflow is serialized with `cancel-in-progress: false` so concurrent schema changes cannot overlap.
- Production credentials are scoped to the GitHub `production` environment.
- The workflow uses `npm ci` and a pinned Prisma version; it does not run lifecycle scripts during dependency installation.
- The workflow validates the Prisma schema before applying migrations.
- Never use `prisma migrate dev` or destructive schema synchronization against production.
- Run migrations before relying on newly deployed application behavior that requires the schema change.
- If a migration fails, stop the release and investigate the migration error before retrying.
- Record the successful migration run as release evidence.

## Rollback

1. Stop promotion of further releases.
2. Identify the last known-good deployment SHA.
3. Roll back application code using the deployment platform's rollback/promotion mechanism.
4. Do **not** automatically roll back database migrations. Determine whether the migration is backward compatible and follow a reviewed remediation plan.
5. Verify login, tenant boundaries, critical clinic workflows, and error rates after rollback.
6. Record the incident, decision, and verification evidence.

## Backup and restore

Before production schema changes, confirm a recent backup exists. Restore tests must be performed in a non-production environment unless an approved disaster-recovery procedure requires otherwise.

A restore drill should verify:

- the backup can be restored;
- the restored database passes Prisma/application health checks;
- tenant and residency metadata remain intact;
- audit records remain internally consistent;
- the application can authenticate and read clinic data;
- the restore point and recovery time meet the approved recovery objectives.

Do not treat the existence of a backup configuration as proof that backups are working. Release evidence must identify the backup/restore system and the most recent successful backup or restore test.

## Production environment configuration

At minimum, production configuration must provide:

- a production-only `DATABASE_URL` managed by the deployment/secret-management system;
- authentication/session secrets stored outside source control;
- payment/integration credentials stored outside source control when integrations are enabled;
- no development or test credentials in the production environment;
- production domain/alias configuration and HTTPS;
- sensitive routes configured so private responses are not unintentionally cached or publicly shared.

Never print environment variables, database URLs, session tokens, passwords, payment credentials, or patient data in logs or release evidence.

## Maintenance

1. Announce maintenance when user impact is expected.
2. Confirm an operator, start/end window, and rollback plan.
3. Take/verify a backup where applicable.
4. Apply the smallest necessary change.
5. Run smoke checks.
6. Record maintenance evidence and close the window.

## Incident response

For suspected security, privacy, availability, or data-integrity incidents:

1. Preserve relevant logs and audit evidence without exporting identifiable health data unnecessarily.
2. Identify affected deployment, route, tenant, datastore, and time window.
3. Contain the issue while preserving evidence.
4. Escalate to the responsible technical and compliance contacts.
5. Assess whether patient or customer notification obligations are triggered.
6. Recover using the approved rollback/restore plan.
7. Verify tenant isolation and security controls after recovery.
8. Document root cause, impact, corrective actions, and evidence-retention location.

## Monitoring priorities

Alert on:

- repeated authentication failures or account lockouts;
- datastore health degradation;
- failed or stuck migrations/provisioning;
- elevated application errors;
- backup failures;
- unexpected cross-tenant authorization failures.

## Data residency

Heri CMS is Kenya-first. Production operators must verify actual database, backup/DR, provider, and subprocessors' processing geography against the clinic's selected residency policy before activating or migrating a datastore. Do not mark a datastore healthy solely because its metadata says `HEALTHY`.
