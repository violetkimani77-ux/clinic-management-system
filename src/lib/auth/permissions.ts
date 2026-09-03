export const PERMISSIONS = {
  PATIENTS_VIEW: "patients.view",
  PATIENTS_CREATE: "patients.create",
  PATIENTS_UPDATE: "patients.update",
  PHARMACY_VIEW: "pharmacy.view",
  PHARMACY_DISPENSE: "pharmacy.dispense",
  PHARMACY_STOCK_ADJUST: "pharmacy.stock_adjust",
  ACCOUNTS_VIEW: "accounts.view",
  ACCOUNTS_INVOICE: "accounts.invoice",
  ACCOUNTS_PAYMENT: "accounts.payment",
  REPORTS_VIEW: "reports.view",
  USERS_MANAGE: "users.manage",
  SETTINGS_MANAGE: "settings.manage",
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_PERMISSIONS: Record<string, readonly PermissionCode[]> = {
  ADMIN: Object.values(PERMISSIONS),
  PHARMACY: [
    PERMISSIONS.PATIENTS_VIEW,
    PERMISSIONS.PHARMACY_VIEW,
    PERMISSIONS.PHARMACY_DISPENSE,
    PERMISSIONS.PHARMACY_STOCK_ADJUST,
    PERMISSIONS.REPORTS_VIEW,
  ],
  ACCOUNTS: [
    PERMISSIONS.PATIENTS_VIEW,
    PERMISSIONS.ACCOUNTS_VIEW,
    PERMISSIONS.ACCOUNTS_INVOICE,
    PERMISSIONS.ACCOUNTS_PAYMENT,
    PERMISSIONS.REPORTS_VIEW,
  ],
};
