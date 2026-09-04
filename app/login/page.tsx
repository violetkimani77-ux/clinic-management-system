import { LoginForm } from "@/components/auth/login-form";

/** Staff-only entry point for the clinic management system. */
export default function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="auth-brand">CMS</div>
        <h1 id="login-title">Clinic Management System</h1>
        <p className="auth-subtitle">Staff sign in</p>
        <LoginForm />
      </section>
    </main>
  );
}
