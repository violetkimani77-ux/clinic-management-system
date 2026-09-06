# Public Engineering References

These repositories are implementation references only. They are not compliance authorities and their security/compliance claims are not treated as evidence.

- `DataDarling/ehr-practice-management` — Next.js/PostgreSQL/Prisma/NextAuth EHR and practice-management patterns.
- `Mrcipo/fisio-app` — Next.js/Express/TypeScript/Prisma/PostgreSQL healthcare application patterns, validation, rate limiting, ownership checks, and integration testing.
- `Owinovative/invinceible_core_hms_v2` — broader hospital-management patterns spanning pharmacy, billing, branches, audit logging, security/deployment documentation, and load testing.
- `tonuraydemir/dental-clinic-management-system` — Next.js/React/Prisma clinic-management patterns with Jest and Playwright testing.
- `rpzk/HealthCare` — Next.js/Prisma/PostgreSQL architecture with Redis/background processing, deployment, backup, and signature-related ideas.
- `Fouzia-Oreen/VitalisMed_Healthcare-Management-Platform` — healthcare platform architecture ideas around RBAC, auditability, transport/storage protection, and rate limiting; claims must be independently validated.
- `pedroreisalves/hospital-management` — NestJS/Prisma/PostgreSQL/JWT/Swagger patterns for a smaller hospital-management implementation.

Adoption rule: copy architecture ideas only after threat-model review, tenant-isolation review, data-protection review, and tests. Never inherit a repository's assumptions about healthcare law, HIPAA, Kenyan law, or production security without independent verification.
