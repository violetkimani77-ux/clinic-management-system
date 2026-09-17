import Link from "next/link";
import type { PlatformAuthContext } from "@/lib/platform/session";
import { PLATFORM_ACTIONS, canPlatformAction } from "@/lib/platform/authorization";
import styles from "./platform-shell.module.css";

type PlatformNavigationItem = {
  label: string;
  href: string;
  action?: (typeof PLATFORM_ACTIONS)[keyof typeof PLATFORM_ACTIONS];
};

const navigation: PlatformNavigationItem[] = [
  { label: "Overview", href: "/platform", action: PLATFORM_ACTIONS.VIEW_OVERVIEW },
  { label: "Tenants", href: "/platform/tenants", action: PLATFORM_ACTIONS.VIEW_TENANTS },
  { label: "Audit", href: "/platform/audit", action: PLATFORM_ACTIONS.VIEW_AUDIT },
];

/**
 * Provides the authenticated Platform Control Panel frame, deliberately
 * distinct from WorkspaceShell (the clinic staff app shell): platform
 * administration is a separate identity and authority from clinic RBAC,
 * per docs/platform-control-panel-architecture.md's security boundary.
 * Shares the same font and a calmer variant of the workspace palette,
 * not the bold marketing landing theme, since this is a working tool.
 */
export function PlatformShell({
  context,
  activeHref,
  children,
}: {
  context: PlatformAuthContext;
  activeHref: string;
  children: React.ReactNode;
}) {
  const visibleNavigation = navigation.filter(
    (item) => !item.action || canPlatformAction(context.roleCode, item.action),
  );

  return (
    <main className={styles.shell}>
      <header className={styles.topBar}>
        <Link href="/platform" className={styles.topBrand} aria-label="Heri CMS Platform Control">
          <span className={styles.brandName}>
            <span className={styles.brandHeri}>Heri</span>
            <span className={styles.brandCms}> CMS</span>
          </span>
          <span className={styles.brandSubtitle}>Platform Control</span>
        </Link>
        <div className={styles.adminIdentity}>
          <span className={styles.adminName}>{context.name}</span>
          <span className={styles.adminRole}>{context.roleCode.replace("PLATFORM_", "").toLowerCase()}</span>
        </div>
      </header>

      <div className={styles.body}>
        <aside className={styles.sidebar}>
          <nav aria-label="Platform navigation" className={styles.navigation}>
            {visibleNavigation.map((item) => {
              const isActive = item.href === activeHref;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={isActive ? styles.navItemActive : styles.navItem}
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className={styles.content}>{children}</section>
      </div>
    </main>
  );
}
