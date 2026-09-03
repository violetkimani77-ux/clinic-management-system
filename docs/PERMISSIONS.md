# Initial Permissions

Permissions are the authorization contract. Roles should not be checked directly throughout the application when a permission check is sufficient.

## Admin

- patients.view
- patients.create
- patients.update
- patients.archive
- visits.view
- visits.manage
- prescriptions.view
- prescriptions.manage
- pharmacy.view
- inventory.view
- inventory.manage
- invoices.view
- invoices.manage
- payments.view
- payments.manage
- expenses.view
- expenses.manage
- reports.view
- users.view
- users.manage
- settings.manage
- audit.view

## Pharmacy

- patients.view_limited
- prescriptions.view
- pharmacy.view
- pharmacy.dispense
- inventory.view
- inventory.manage
- invoices.view_limited
- reports.pharmacy

## Accounts

- patients.view_limited
- invoices.view
- invoices.manage
- payments.view
- payments.manage
- expenses.view
- expenses.manage
- pharmacy.view_limited
- reports.accounts

## Rules

- A membership belongs to exactly one clinic and one user.
- A user may belong to multiple clinics in the future, but clinic context must always be explicit.
- A permission check must resolve against the current clinic membership.
- Never authorize access merely because a record ID exists.
- Cross-clinic record access must fail closed.
- Limited views must select only fields needed by the role; do not fetch and hide sensitive fields in the UI.
