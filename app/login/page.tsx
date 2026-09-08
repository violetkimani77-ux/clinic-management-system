import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

/**
 * Provides the staff-only entry point for the clinic management system.
 * Authentication remains handled by the existing server-side login endpoint;
 * this page is responsible only for the presentation and form composition.
 */
export default function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-shell" aria-labelledby="login-title">
        <div className="auth-intro">
          <div className="auth-mark" aria-label="Heri CMS">
            <span className="brand-heri">Heri</span><span className="brand-cms"> CMS</span>
          </div>
          <p className="auth-kicker">Clinic operations</p>
          <h1 id="login-title">Clinic Management System</h1>
          <p className="auth-lead">
            A secure workspace for managing clinic operations, patient records,
            pharmacy workflows and accounts.
          </p>
          <div className="auth-security-note">
            <span className="auth-security-dot" aria-hidden="true" />
            <span>Staff access only</span>
          </div>
        </div>

        <div className="auth-panel">
          <div className="auth-panel-header">
            <p className="auth-panel-kicker">Welcome back</p>
            <h2>Sign in</h2>
            <p>Use your clinic staff account to continue.</p>
          </div>
          <LoginForm />
          <div className="auth-switch">
            <span>Not yet signed up?</span>
            <Link href="/trial">Start Your Free trial today</Link>
          </div>
          <Link href="/" className="auth-home-link">Back to homepage</Link>
        </div>
      </section>
      <p className="site-credit">POWERED BY IHL TECH</p>
    </main>
  );
}
