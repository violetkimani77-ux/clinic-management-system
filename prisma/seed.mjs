import {
  PrismaClient,
  RoleCode,
  TenantDataStoreStatus,
  TenantIsolationMode,
  TenantResidencyPolicy,
  TransferAssessmentStatus,
  UserStatus,
} from "@prisma/client";
import { randomBytes, scrypt as nodeScrypt } from "node:crypto";
import { promisify } from "node:util";

const prisma = new PrismaClient();
const scrypt = promisify(nodeScrypt);

const PERMISSIONS = {
  PATIENTS_VIEW: "patients.view",
  PATIENTS_CREATE: "patients.create",
  PATIENTS_UPDATE: "patients.update",
  VISITS_VIEW: "visits.view",
  VISITS_CREATE: "visits.create",
  VISITS_UPDATE: "visits.update",
  PRESCRIPTIONS_CREATE: "prescriptions.create",
  PRESCRIPTIONS_SEND: "prescriptions.send",
  PHARMACY_VIEW: "pharmacy.view",
  PHARMACY_DISPENSE: "pharmacy.dispense",
  PHARMACY_STOCK_ADJUST: "pharmacy.stock_adjust",
  ACCOUNTS_VIEW: "accounts.view",
  ACCOUNTS_INVOICE: "accounts.invoice",
  ACCOUNTS_PAYMENT: "accounts.payment",
  REPORTS_VIEW: "reports.view",
  USERS_MANAGE: "users.manage",
  SETTINGS_MANAGE: "settings.manage",
};

const ROLE_PERMISSIONS = {
  ADMIN: Object.values(PERMISSIONS),
  PHARMACY: [PERMISSIONS.PATIENTS_VIEW, PERMISSIONS.PHARMACY_VIEW, PERMISSIONS.PHARMACY_DISPENSE, PERMISSIONS.PHARMACY_STOCK_ADJUST, PERMISSIONS.REPORTS_VIEW],
  ACCOUNTS: [PERMISSIONS.PATIENTS_VIEW, PERMISSIONS.ACCOUNTS_VIEW, PERMISSIONS.ACCOUNTS_INVOICE, PERMISSIONS.ACCOUNTS_PAYMENT, PERMISSIONS.REPORTS_VIEW],
};

const PERMISSION_DESCRIPTIONS = {
  [PERMISSIONS.PATIENTS_VIEW]: "View patient records permitted to the staff member.",
  [PERMISSIONS.PATIENTS_CREATE]: "Register new patients.",
  [PERMISSIONS.PATIENTS_UPDATE]: "Update patient registry records.",
  [PERMISSIONS.VISITS_VIEW]: "View clinic visits.",
  [PERMISSIONS.VISITS_CREATE]: "Open visits for patients.",
  [PERMISSIONS.VISITS_UPDATE]: "Update visit status and notes.",
  [PERMISSIONS.PRESCRIPTIONS_CREATE]: "Create prescriptions during an active visit.",
  [PERMISSIONS.PRESCRIPTIONS_SEND]: "Send prescriptions to the pharmacy queue.",
  [PERMISSIONS.PHARMACY_VIEW]: "View pharmacy workspace data.",
  [PERMISSIONS.PHARMACY_DISPENSE]: "Dispense prescribed medicines.",
  [PERMISSIONS.PHARMACY_STOCK_ADJUST]: "Record authorized stock adjustments.",
  [PERMISSIONS.ACCOUNTS_VIEW]: "View accounts and financial records.",
  [PERMISSIONS.ACCOUNTS_INVOICE]: "Create and manage invoices.",
  [PERMISSIONS.ACCOUNTS_PAYMENT]: "Record and manage verified payments.",
  [PERMISSIONS.REPORTS_VIEW]: "View operational and financial reports.",
  [PERMISSIONS.USERS_MANAGE]: "Manage staff users and clinic memberships.",
  [PERMISSIONS.SETTINGS_MANAGE]: "Manage clinic settings.",
};

const DEFAULT_CLINIC = { code: "DEMO-CLINIC", name: "Demo Clinic" };
const DEFAULT_ADMIN = {
  email: "admin@demo-clinic.local",
  name: "Clinic Administrator",
  password: process.env.E2E_STAFF_PASSWORD ?? "ChangeMe123!",
};

async function hashPassword(password) {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, 64);
  return `scrypt:${salt.toString("hex")}:${Buffer.from(derivedKey).toString("hex")}`;
}

async function main() {
  const clinic = await prisma.clinic.upsert({ where: { code: DEFAULT_CLINIC.code }, update: { name: DEFAULT_CLINIC.name }, create: DEFAULT_CLINIC });
  const now = new Date();

  await prisma.tenantDataStore.upsert({
    where: { clinicId: clinic.id },
    update: {
      isolationMode: TenantIsolationMode.POOL,
      status: TenantDataStoreStatus.HEALTHY,
      residencyPolicy: TenantResidencyPolicy.KENYA_ONLY,
      transferAssessmentStatus: TransferAssessmentStatus.NOT_REQUIRED,
      country: "KE",
      backupCountry: "KE",
      provisionedAt: now,
      lastHealthCheckAt: now,
    },
    create: {
      clinicId: clinic.id,
      isolationMode: TenantIsolationMode.POOL,
      status: TenantDataStoreStatus.HEALTHY,
      residencyPolicy: TenantResidencyPolicy.KENYA_ONLY,
      transferAssessmentStatus: TransferAssessmentStatus.NOT_REQUIRED,
      country: "KE",
      backupCountry: "KE",
      provisionedAt: now,
      lastHealthCheckAt: now,
    },
  });

  const roles = {};
  for (const [code, name] of [[RoleCode.ADMIN, "Administrator"], [RoleCode.PHARMACY, "Pharmacy"], [RoleCode.ACCOUNTS, "Accounts"]]) {
    roles[code] = await prisma.role.upsert({ where: { code }, update: { name }, create: { code, name } });
  }
  const permissions = {};
  for (const code of Object.values(PERMISSIONS)) {
    permissions[code] = await prisma.permission.upsert({ where: { code }, update: { description: PERMISSION_DESCRIPTIONS[code] }, create: { code, description: PERMISSION_DESCRIPTIONS[code] } });
  }
  for (const [roleCode, permissionCodes] of Object.entries(ROLE_PERMISSIONS)) {
    for (const permissionCode of permissionCodes) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: roles[roleCode].id, permissionId: permissions[permissionCode].id } },
        update: {},
        create: { roleId: roles[roleCode].id, permissionId: permissions[permissionCode].id },
      });
    }
  }
  const passwordHash = await hashPassword(DEFAULT_ADMIN.password);
  const admin = await prisma.user.upsert({
    where: { email: DEFAULT_ADMIN.email },
    update: { name: DEFAULT_ADMIN.name, status: UserStatus.ACTIVE, passwordHash },
    create: { email: DEFAULT_ADMIN.email, name: DEFAULT_ADMIN.name, status: UserStatus.ACTIVE, passwordHash },
  });
  await prisma.membership.upsert({
    where: { clinicId_userId: { clinicId: clinic.id, userId: admin.id } },
    update: { roleId: roles[RoleCode.ADMIN].id },
    create: { clinicId: clinic.id, userId: admin.id, roleId: roles[RoleCode.ADMIN].id },
  });
  console.log(`Seeded clinic: ${clinic.code}`);
  console.log(`Seeded admin: ${DEFAULT_ADMIN.email}`);
  console.log("Admin password configured from E2E_STAFF_PASSWORD when provided.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
