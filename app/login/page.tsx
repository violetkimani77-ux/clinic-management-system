import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your Heri CMS clinic workspace.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function LoginPage() {
  return (
    <main className="auth-page">
      <nav className="auth-nav" aria-label="Public navigation">
        <Link href="/" className="auth-brand" aria-label="Heri CMS — Clinic Management System">
          <span className="auth-brand-name"><span className="auth-brand-heri">Heri</span><span className="auth-brand-cms"> CMS</span></span>
          <span className="auth-brand-subtitle">CLINIC MANAGEMENT SYSTEM</span>
        </Link>
        <div className="auth-nav-actions">
          <Link href="/trial" className="auth-nav-link">Free trial</Link>
          <Link href="/" className="auth-nav-back">Back to Heri CMS</Link>
        </div>
      </nav>
      <section className="auth-shell" aria-labelledby="login-title">
        <div className="auth-intro">
          <div className="auth-mark" aria-label="Heri CMS">
            <span className="brand-heri">Heri</span><span className="brand-cms"> CMS</span>
          </div>
          <p className="auth-kicker">Clinic operations</p>
          <h1 id="login-title">Clinic Management System</h1>
          <p className="auth-lead">A secure workspace for managing clinic operations, patient records, pharmacy workflows and accounts.</p>
          <div className="auth-security-note"><span className="auth-security-dot" aria-hidden="true" /><span>Staff access only</span></div>
        </div>
        <div className="auth-panel">
          <div className="auth-panel-header"><p className="auth-panel-kicker">Welcome back</p><h2>Sign in</h2><p>Use your clinic staff account to continue.</p></div>
          <LoginForm />
          <div className="auth-switch"><span>Not yet signed up?</span><Link href="/trial">Start Your Free trial today</Link></div>
        </div>
      </section>
      <p className="site-credit">POWERED BY IHL TECH</p>
    </main>
  );
}
