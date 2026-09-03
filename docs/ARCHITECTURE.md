# Clinic Management System Architecture

## Product boundary

This is an internal clinic management system. It is not a CRM and has no patient-facing portal, patient login, public booking, or patient mobile application in the MVP.

## Architecture

Use a modular monolith: one Next.js application, one PostgreSQL database, and clear domain modules.

Modules:

- Auth
- Clinics and memberships
- Users, roles, permissions
- Patients
- Visits
- Pharmacy
- Inventory
- Billing
- Payments
- Expenses
- Reporting
- Audit
- Settings

## Core principles

1. One shared patient record per clinic.
2. Multi-tenancy is enforced at the data and authorization layers.
3. Roles are collections of permissions; authorization is not hard-coded into UI pages.
4. Backend authorization is mandatory even when UI controls are hidden.
5. Dashboard metrics are derived from source business records.
6. Critical workflows use database transactions.
7. Payment processing is idempotent.
8. Pharmacy stock uses batches and expiry dates, with FEFO dispensing.
9. Important clinical and financial records are not hard-deleted. Use status, void, reversal, archive, and audit mechanisms as appropriate.
10. Sensitive actions create immutable audit events.
11. Each module owns its business rules while cross-module effects use explicit application/domain events.
12. Keep the user interface simple: fewer clicks, fewer fields, fewer decisions.

## Cross-module flows

### Patient care and billing

Patient -> Visit -> Treatment/Prescription -> Invoice -> Payment -> Visit completion

### Pharmacy

Prescription -> Pharmacy review -> Stock check -> Dispensing -> Stock movement -> Charge/Invoice

### Payments

Invoice -> Payment initiation -> Provider verification -> Verified payment -> Receipt -> Reporting

### Inventory

Purchase -> Stock batch -> Available stock -> Dispensing/adjustment -> Updated balance -> Low-stock/expiry attention

## Data protection

Patient and clinical information is sensitive. Access must follow least privilege. Avoid exposing clinical information to roles that do not need it. Audit access and changes to sensitive records.
