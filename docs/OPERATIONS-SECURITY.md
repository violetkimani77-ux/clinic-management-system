# Security Operations and Disaster Recovery Standard

## Release model

Develop -> CI/security checks -> Preview -> tenant/role verification -> controlled production rollout -> monitoring -> rollback if required.

No production release is considered complete until the release evidence register records test results, migration status, security review, and rollback readiness.

## Routine maintenance

- Use a scheduled maintenance window for planned platform/database changes.
- Publish start time, expected end time, maintenance type, user-facing message, and last update.
- Activate server-enforced maintenance mode when a release requires it.
- Emergency security fixes may bypass the routine window when delaying remediation creates material risk.
- Record every maintenance event and its outcome.

## Incident response

1. Detect and triage.
2. Preserve evidence and security logs.
3. Contain affected accounts, sessions, integrations, tenants, or infrastructure.
4. Assess confidentiality, integrity, and availability impact.
5. Notify the responsible controller/customer and regulators according to the applicable legal/contractual timetable.
6. Eradicate the cause and rotate affected credentials/secrets.
7. Recover from a known-good state.
8. Validate tenant isolation and data integrity.
9. Document root cause and corrective actions.
10. Complete a post-incident review.

Processor-to-controller notification timing must be documented separately from controller/regulator reporting deadlines; never treat the two obligations as interchangeable.

## Backup and disaster recovery

- Production database backups must be encrypted.
- Point-in-time recovery should be enabled where supported.
- Recovery copies must respect customer residency and contractual requirements.
- Backups must be inaccessible to ordinary application credentials.
- Restore tests must be scheduled and evidenced.
- Tenant restore procedures must prevent cross-tenant disclosure.
- Define RPO/RTO by customer tier before promising service levels.

## Vulnerability management

- Run dependency and lockfile checks on pull requests.
- Treat critical/high security advisories according to documented remediation SLAs.
- Patch operating systems, containers, databases, and managed services under the same release discipline as application code.
- Maintain an emergency security patch path.
- Retain evidence of remediation.

## Security testing

Required before production approval:

- application penetration test
- authentication and MFA abuse testing
- tenant-isolation testing
- privilege-escalation testing
- direct-object-reference/API authorization testing
- session/cookie/token testing
- backup and restore validation
- database access-control validation
- remediation verification

## Vendor and subprocessor management

Maintain a register covering cloud hosting, database providers, email/SMS, payment providers, monitoring, analytics, support tooling, backups, and any other service that can receive customer data.

For each vendor record:

- purpose
- data categories
- processing location
- contract/DPA/BAA status where applicable
- security review
- breach notification terms
- retention/deletion behavior
- subprocessors
- renewal/review date

## Dedicated datastore lifecycle

A dedicated clinic database is provisioned only through a controlled workflow:

1. Quote accepted and isolation requirement recorded.
2. Isolation mode selected: pool, bridge, or silo.
3. Infrastructure provisions the datastore.
4. Credentials are created in the secret manager.
5. Only a secret reference is registered in the application control plane.
6. Approved migrations are applied.
7. Health checks and connectivity validation succeed.
8. Data migration, if any, is performed with backup and rollback evidence.
9. Tenant is activated only after validation.
10. Decommissioning includes export/retention approval, credential revocation, and secure deletion evidence.

The application must fail closed if a clinic is marked as bridge/silo but its dedicated runtime connection has not been provisioned.
