"use client";

import { useState, type FormEvent } from "react";

type ClinicOption = {
  clinicId: string;
  clinicName: string;
  clinicCode: string;
  roleCode: string;
};

type LoginResponse = {
  clinics?: ClinicOption[];
  clinicSelectionRequired?: boolean;
  mfaRequired?: boolean;
  challengeToken?: string;
};

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [clinics, setClinics] = useState<ClinicOption[]>([]);
  const [clinicId, setClinicId] = useState("");
  const [challengeToken, setChallengeToken] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [step, setStep] = useState<"credentials" | "clinic" | "mfa">("credentials");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submitCredentials() {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, ...(clinicId ? { clinicId } : {}) }),
    });
    const data = (await response.json().catch(() => null)) as LoginResponse | null;

    if (!response.ok) {
      throw new Error("Unable to sign in. Check your email and password.");
    }

    if (data?.clinicSelectionRequired && data.clinics?.length) {
      setClinics(data.clinics);
      setClinicId(data.clinics[0].clinicId);
      setStep("clinic");
      return false;
    }

    if (data?.mfaRequired && data.challengeToken) {
      setChallengeToken(data.challengeToken);
      setStep("mfa");
      return false;
    }

    window.location.assign("/dashboard");
    return true;
  }

  async function submitMfa() {
    const response = await fetch("/api/auth/mfa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeToken, code: mfaCode }),
    });

    if (!response.ok) {
      throw new Error("Unable to verify the code. Check the code and try again.");
    }

    window.location.assign("/dashboard");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void (async () => {
      setError("");
      setPending(true);
      try {
        if (step === "mfa") {
          await submitMfa();
        } else {
          await submitCredentials();
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to sign in right now. Please try again.");
      } finally {
        setPending(false);
      }
    })();
  }

  const selectingClinic = step === "clinic";
  const verifyingMfa = step === "mfa";

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      {step !== "mfa" ? (
        <>
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
        </>
      ) : (
        <div className="auth-field">
          <label htmlFor="mfa-code">Verification code</label>
          <input
            id="mfa-code"
            name="mfa-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={mfaCode}
            onChange={(event) => setMfaCode(event.target.value)}
            required
            minLength={6}
            maxLength={6}
            placeholder="123456"
          />
          <p className="auth-form-note">Enter the six-digit code from your authenticator app.</p>
        </div>
      )}

      {error ? <p className="form-error" role="alert">{error}</p> : null}

      <button type="submit" className="auth-submit" disabled={pending}>
        {pending ? "Verifying…" : verifyingMfa ? "Verify code" : selectingClinic ? "Continue" : "Sign in"}
      </button>

      <p className="auth-form-note">If you cannot access your account, contact your clinic administrator.</p>
    </form>
  );
}
