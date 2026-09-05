"use client";

import { useState, type FormEvent } from "react";

/**
 * Provides the interactive staff sign-in form.
 * Authentication remains server-side; this component only manages input,
 * pending state, password visibility and user-facing login errors.
 */
export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitLogin();
  }

  async function submitLogin() {
    setError("");
    setPending(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        setError("Unable to sign in. Check your email and password.");
        return;
      }

      window.location.assign("/dashboard");
    } catch {
      setError("Unable to sign in right now. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <div className="auth-field">
        <label htmlFor="email">Email address</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          placeholder="staff@clinic.example"
        />
      </div>

      <div className="auth-field">
        <div className="auth-label-row">
          <label htmlFor="password">Password</label>
        </div>
        <div className="password-field">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            placeholder="Enter your password"
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <button type="submit" className="auth-submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <p className="auth-form-note">If you cannot access your account, contact your clinic administrator.</p>
    </form>
  );
}
