# Heri CMS Compliance Tracker — Single Source of Truth

Supersedes working from the gap-map document directly. Status column is
the only thing that matters going forward — update it here as items
move, and work one item to completion before starting the next.

| # | Item | Type | Status | Blocks / blocked by |
|---|---|---|---|---|
| 1 | Confirm production database's physical location (country, provider) | Fact-finding (you, dashboard check) | **Not started** | Blocks #2 |
| 2 | Get counsel's read on DHA Section 47 given #1's answer | Legal (external) | **Blocked by #1** | Blocks #9 |
| 3 | Register Heri CMS with the ODPC | Legal/admin (you) | **Not started** | — |
| 4 | Notify Digital Health Agency within 7 days of #3 | Legal/admin (you) | **Blocked by #3** | — |
| 5 | Audit-log patient/visit/prescription/billing *reads*, not just writes | Engineering | **Done** — PR [#31](https://github.com/violetkimani77-ux/clinic-management-system/pull/31) squash-merged as `3b17f0f`; `getVisit` (`VISIT_VIEWED`) in PR [#32](https://github.com/violetkimani77-ux/clinic-management-system/pull/32) | — |
| 6 | Write retention policy (20-year floor per DHA) | Documentation | **Not started** | — |
| 7 | Build correction/rectification flow (7-day response window per DPA) | Engineering | **Not started** | — |
| 8 | MFA for clinic staff accounts | Engineering | **Not started** | — |
| 9 | Explicit consent flow for cross-border transfer, if needed | Engineering | **Not started, and don't start** until #2 confirms it's actually needed | Blocked by #2 |
| 10 | Incident-response procedure meeting 48hr/72hr deadlines | Documentation | **Not started** | — |
| 11 | Digital Health Certification for Safer Healthcare | Legal/admin (you) | **Not started, deliberately deferred** until 3–8 are further along | — |

## #5 — closed

Every `export async function get/list/search` across `src/lib/` was
checked directly (function body read, not inferred) for two things:
whether it returns patient-identifying data, and whether it's audited.

**Genuine gaps, now audited:**

| Function | Action | Landed |
|---|---|---|
| `listVisits` | `VISITS_VIEWED` | [#31](https://github.com/violetkimani77-ux/clinic-management-system/pull/31) / `3b17f0f` |
| `getVisit` | `VISIT_VIEWED` | [#32](https://github.com/violetkimani77-ux/clinic-management-system/pull/32) |
| `getVisitPrescriptions` | `PRESCRIPTIONS_VIEWED` | #31 / `3b17f0f` |
| `listPharmacyPrescriptions` | `PHARMACY_QUEUE_VIEWED` | #31 / `3b17f0f` |
| `listInvoices` | `INVOICES_VIEWED` | #31 / `3b17f0f` |
| `listBillableVisits` | `BILLABLE_VISITS_VIEWED` | #31 / `3b17f0f` |

**Checked and confirmed correctly aggregate-only, no fix needed:**
`getAccountsSummary` and `getDashboardMetrics` — counts and sums only,
never an individual patient record.

**Already correctly audited before this work:**
`searchPatients` (`PATIENT_SEARCHED`) and `getPatientProfile`
(`PATIENT_VIEWED`) in `patients/registry.ts`.

## Proposed order from here

**A.** You start #1 and #3 in parallel, whenever convenient.
**B.** #5 is closed. Next engineering item is **#6** (retention-policy
document) or **#7** (correction/rectification flow) — pick one, not both.
**C.** #9 stays untouched until #2 resolves. #11 stays untouched until
3–8 are substantially through.
