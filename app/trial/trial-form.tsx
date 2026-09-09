'use client';

import { FormEvent, useState } from "react";
import styles from "./page.module.css";

type FieldName = "clinicName" | "administratorName" | "email" | "password";
type FieldErrors = Partial<Record<FieldName, string>>;

type ApiError = { error?: string; fieldErrors?: FieldErrors };

const initialValues = { clinicName: "", administratorName: "", email: "", password: "" };

export default function TrialForm() {
  const [values, setValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateValue(field: FieldName, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setGeneralError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setGeneralError("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/trial", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(values).toString(),
      });
      if (response.redirected) {
        window.location.assign(response.url);
        return;
      }
      const data = (await response.json().catch(() => null)) as ApiError | null;
      if (response.ok) {
        window.location.assign("/trial/success");
        return;
      }
      setFieldErrors(data?.fieldErrors ?? {});
      setGeneralError(data?.error ?? "We couldn't create your trial right now. Please try again.");
    } catch {
      setGeneralError("We couldn't reach the trial service. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form action="/api/trial" method="post" className={styles.form} onSubmit={handleSubmit}>
      <div className={`${styles.formError} ${generalError ? styles.formErrorVisible : ""}`} role="alert" aria-live="polite" aria-atomic="true">
        {generalError}
      </div>

      <label htmlFor="clinicName">Clinic name
        <input id="clinicName" name="clinicName" value={values.clinicName} onChange={(e) => updateValue("clinicName", e.target.value)} required minLength={2} maxLength={120} aria-invalid={Boolean(fieldErrors.clinicName)} aria-describedby={fieldErrors.clinicName ? "clinicName-error" : undefined} />
        <span id="clinicName-error" className={`${styles.fieldError} ${fieldErrors.clinicName ? styles.fieldErrorVisible : ""}`} aria-live="polite" aria-atomic="true">{fieldErrors.clinicName}</span>
      </label>
      <label htmlFor="administratorName">Administrator name
        <input id="administratorName" name="administratorName" value={values.administratorName} onChange={(e) => updateValue("administratorName", e.target.value)} required minLength={2} maxLength={120} aria-invalid={Boolean(fieldErrors.administratorName)} aria-describedby={fieldErrors.administratorName ? "administratorName-error" : undefined} />
        <span id="administratorName-error" className={`${styles.fieldError} ${fieldErrors.administratorName ? styles.fieldErrorVisible : ""}`} aria-live="polite" aria-atomic="true">{fieldErrors.administratorName}</span>
      </label>
      <label htmlFor="email">Administrator email
        <input id="email" name="email" type="email" value={values.email} onChange={(e) => updateValue("email", e.target.value)} required maxLength={254} autoComplete="email" aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? "email-error" : undefined} />
        <span id="email-error" className={`${styles.fieldError} ${fieldErrors.email ? styles.fieldErrorVisible : ""}`} aria-live="polite" aria-atomic="true">{fieldErrors.email}</span>
      </label>
      <label htmlFor="password">Password
        <input id="password" name="password" type="password" value={values.password} onChange={(e) => updateValue("password", e.target.value)} required minLength={12} maxLength={128} autoComplete="new-password" aria-invalid={Boolean(fieldErrors.password)} aria-describedby={fieldErrors.password ? "password-error" : undefined} />
        <span id="password-error" className={`${styles.fieldError} ${fieldErrors.password ? styles.fieldErrorVisible : ""}`} aria-live="polite" aria-atomic="true">{fieldErrors.password}</span>
      </label>
      <button type="submit" disabled={isSubmitting} aria-disabled={isSubmitting}>{isSubmitting ? "Creating Workspace…" : "Create Trial Workspace"}</button>
    </form>
  );
}
