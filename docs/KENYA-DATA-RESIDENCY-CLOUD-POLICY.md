# Kenya Data Residency & Cloud Provider Policy

## Purpose

This policy defines how clinic data, including health data, may be placed in pooled, bridge-database, or silo-database infrastructure.

The policy is designed around the Kenya Data Protection Act, 2019 and the Data Protection (General) Regulations, 2021. It is an engineering control policy, not a substitute for legal advice or a clinic-specific legal assessment.

## Regulatory baseline

- Health information is sensitive personal data under the Kenya data-protection framework.
- Transfers of personal data outside Kenya require an applicable transfer basis and appropriate safeguards.
- Processing sensitive personal data outside Kenya requires consent of the data subject and confirmation of appropriate safeguards under section 49 of the Act.
- The General Regulations require transfers outside Kenya to be based on appropriate safeguards, an adequacy decision, necessity, or consent, with qualifying transfers documented.
- For specified strategic-interest processing, including provision of primary or secondary health care, the General Regulations require processing through a server/data centre in Kenya or at least one serving copy in a Kenya data centre.
- A processor must obtain controller authorization before engaging a third party and contractually control that third party.

## Policy decision

The platform uses **Kenya-first, residency-aware, cross-border-by-exception**.

1. `KENYA_ONLY` is the default policy for every clinic.
2. `KENYA_ONLY` means the serving datastore and operational backup location must be in Kenya.
3. `KENYA_SERVING_COPY` is only permitted where the clinic has an approved cross-border transfer assessment and the architecture maintains a serving copy in Kenya.
4. A foreign primary datastore is never provisioned merely because a cloud region is technically available.
5. Health-data cross-border processing requires documented transfer safeguards and the required data-subject consent/legal basis before activation.
6. Provider, country, region, backup location, transfer-assessment reference and datastore status are recorded in the control plane.
7. A datastore that does not satisfy its residency policy is not considered healthy and must fail closed.

## POOL

**Default isolation:** `POOL`

Recommended default:

- Application: approved cloud region in Kenya where available.
- Shared PostgreSQL: Kenya-hosted.
- Serving copy: Kenya.
- Operational backups: Kenya by default.
- Cross-border analytics, monitoring or support must not receive identifiable health data unless separately approved.

The shared pool remains subject to tenant isolation controls such as application authorization and, where implemented, PostgreSQL row-level security.

## BRIDGE_DATABASE

**Isolation:** shared infrastructure boundary with a dedicated database.

Required before activation:

- `isolationMode = BRIDGE_DATABASE`.
- `residencyPolicy = KENYA_ONLY` unless an approved `KENYA_SERVING_COPY` assessment exists.
- Dedicated database exists in the approved country/region.
- `connectionRef` points to a secret-manager reference, never plaintext credentials.
- Database credentials are least-privilege application credentials, not owner/superuser credentials.
- Backup country/region satisfies the same residency policy.
- Migration version is recorded.
- Health check succeeds.

## SILO_DATABASE

**Isolation:** dedicated datastore/infrastructure boundary for a clinic.

Required before activation:

- `isolationMode = SILO_DATABASE`.
- Residency policy is evaluated before infrastructure provisioning.
- Dedicated database and network controls are provisioned in the approved region.
- Secret-manager reference is registered; plaintext credentials are never stored in the application database.
- Encryption, access controls, auditability, backups and recovery verification are complete.
- Cross-border transfer assessment is `APPROVED` when applicable.
- A Kenya serving copy exists when the selected policy requires it.
- Health check and migration verification succeed.

## Provisioning state machine

```text
SETUP
  -> RESIDENCY_SELECTED
  -> RESIDENCY_VALIDATED
  -> PROVISIONING
  -> MIGRATING
  -> HEALTHY
  -> ACTIVE
```

Any failed residency, transfer-safeguard, backup, migration or health check blocks activation.

## Region-selection rules

### KENYA_ONLY

Allowed:

- primary/serving datastore in Kenya
- backups in Kenya

Not allowed:

- foreign primary datastore
- foreign-only backup
- cross-border health-data processing without a separately approved policy

### KENYA_SERVING_COPY

Allowed only after compliance approval:

- foreign primary datastore
- Kenya serving copy
- documented transfer assessment
- required consent/legal basis
- appropriate contractual and technical safeguards

The Kenya serving copy must remain available as an actual serving copy, not merely an archived backup.

## Cloud-provider requirements

The cloud provider is treated as a processor/sub-processor according to the actual contractual arrangement.

Before production use, the provider must be assessed for:

- geographic processing and storage locations
- sub-processors
- security controls and certifications/evidence
- encryption and key-management options
- identity/access controls
- audit logging
- breach notification
- data return/deletion
- backup and disaster recovery locations
- government/legal-request handling
- contractual data-processing terms

A clinic controller must authorize relevant third-party processing where required by the applicable processor relationship.

## Control-plane enforcement

`TenantDataStore` records:

- isolation mode
- residency policy
- transfer-assessment status/reference
- provider
- primary country/region
- backup country/region
- secret-manager connection reference
- datastore status
- migration version
- provisioning and health-check timestamps

The application must not infer compliance from the cloud provider name. It evaluates the recorded policy and location attributes.

## Operational rule

No production clinic datastore becomes `HEALTHY` solely because provisioning completed. It becomes `HEALTHY` only after residency validation, transfer controls, migration verification, security checks, backup verification and connectivity health checks succeed.

## Evidence retained

For every clinic, retain sufficient evidence to demonstrate:

- selected residency policy and date
- approved country/region
- provider and relevant sub-processors
- transfer assessment and reference where applicable
- consent/legal-basis decision where applicable
- datastore provisioning result
- migration version
- backup location and verification
- health-check history
- retirement/deletion evidence

## Review

This policy must be reviewed whenever Kenyan data-protection law, ODPC guidance, sector-specific health requirements, cloud-provider processing locations, or the clinic's contractual requirements materially change.
