"use client";

import { useState, type FormEvent } from "react";

type ClinicOption = {
  clinicId: string;
  clinicName: string;
  clinicCode: string;
  roleCode: string;
};

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [clinics, setClinics] = useState<ClinicOption[]>([]);
  const [clinicId, setClinicId] = useState("");
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
        body: JSON.stringify({ email, password, ...(clinicId ? { clinicId } : {}) }),
      });
      const data = (await response.json().catch(() => null)) as
        | { clinics?: ClinicOption[]; clinicSelectionRequired?: boolean; mfaRequired?: boolean }
        | null;

      if (!response.ok) {
        setError("Unable to sign in. Check your email and password.");
        return;
      }

      if (data?.clinicSelectionRequired && data.clinics?.length) {
        setClinics(data.clinics);
        setClinicId(data.clinics[0].clinicId);
        return;
      }

      if (data?.mfaRequired) {
        setError("Multi-factor verification is required. Complete the verification step to continue.");
        return;
      }

      window.location.assign("/dashboard");
    } catch {
      setError("Unable to sign in right now. Please try again.");
    } finally {
      setPending(false);
    }
  }

  const selectingClinic = clinics.length > 0;

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
          disabled={selectingClinic}
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
            disabled={selectingClinic}
            placeholder="Enter your password"
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            disabled={selectingClinic}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {selectingClinic ? (
        <div className="auth-field">
          <label htmlFor="clinic">Choose clinic</label>
          <select id="clinic" value={clinicId} onChange={(event) => setClinicId(event.target.value)} required>
            {clinics.map((clinic) => (
              <option key={clinic.clinicId} value={clinic.clinicId}>
                {clinic.clinicName} ({clinic.roleCode})
              </option>
            ))}
          </select>
          <p className="auth-form-note">Your clinic choice is verified server-side and becomes part of your session.</p>
        </div>
      ) : null}

      {error ? <p className="form-error" role="alert">{error}</p> : null}

      <button type="submit" className="auth-submit" disabled={pending}>
        {pending ? "Signing in…" : selectingClinic ? "Continue" : "Sign in"}
      </button>

      <p className="auth-form-note">If you cannot access your account, contact your clinic administrator.</p>
    </form>
  );
}
