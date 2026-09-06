import Link from "next/link";
import { StaffProfile } from "@/components/dashboard/staff-profile";
import type { AuthContext } from "@/lib/auth/authorization";
import { PERMISSIONS } from "@/lib/auth/permissions";
import styles from "./workspace-shell.module.css";

type NavigationItem = {
  label: string;
  href: string;
  permission?: (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
};

const navigation: NavigationItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Patients", href: "/patients", permission: PERMISSIONS.PATIENTS_VIEW },
  { label: "Visits", href: "/visits", permission: PERMISSIONS.VISITS_VIEW },
  { label: "Pharmacy", href: "/pharmacy", permission: PERMISSIONS.PHARMACY_VIEW },
  { label: "Accounts", href: "/accounts", permission: PERMISSIONS.ACCOUNTS_VIEW },
  { label: "Reports", href: "/reports", permission: PERMISSIONS.REPORTS_VIEW },
  { label: "Help", href: "/help" },
];

/**
 * Provides the authenticated clinic workspace frame shared by staff pages.
 * The top bar keeps Hali CMS clinic identity and staff identity together;
 * the sidebar owns workspace navigation while page components own their
 * data and authorization checks.
 */
export function WorkspaceShell({
  context,
  activeHref,
  children,
}: {
  context: AuthContext;
  activeHref: string;
  children: React.ReactNode;
}) {
  const visibleNavigation = navigation.filter(
    (item) => !item.permission || context.permissions.has(item.permission),
  );

  return (
    <main className={styles.shell}>
      <header className={styles.topBar}>
        <Link href="/dashboard" className={styles.topBrand} aria-label="Hali CMS Clinic Management System">
          <span className={styles.brandName}>Hali CMS</span>
          <span className={styles.brandSubtitle}>Clinic Management System</span>
        </Link>
        <StaffProfile userName={context.userName} roleCode={context.roleCode} />
      </header>

      <div className={styles.body}>
        <aside className={styles.sidebar}>
          <nav aria-label="Main navigation" className={styles.navigation}>
            {visibleNavigation.map((item) => {
              const isActive = item.href === activeHref;
              const label = item.href === "/dashboard" && !isActive
                ? "← Back to Dashboard"
                : item.label;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className={styles.content}>{children}</section>
      </div>

      <footer className={styles.footer}>POWERED BY IHL TECH</footer>
    </main>
  );
}
