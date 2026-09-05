"use client";

import Link from "next/link";
import { useActionState } from "react";
import { updatePatientRecord, type PatientEditState } from "../../actions";
import styles from "@/components/dashboard/workspace-page.module.css";

type PatientEditFormProps = {
  patientId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
};

const initialState: PatientEditState = {
  message: "",
  success: false,
};

/**
 * Client-side form shell for the patient registry update action.
 *
 * The database mutation and authorization remain server-side. This component
 * only exposes pending and expected validation feedback so staff can see what
 * happened when they submit the form.
 */
export function PatientEditForm(props: PatientEditFormProps) {
  const [state, formAction, pending] = useActionState(
    updatePatientRecord,
    initialState,
  );

  return (
    <form action={formAction} className={styles.patientForm}>
      <input type="hidden" name="patientId" value={props.patientId} />

      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span>First name <span aria-hidden="true">*</span></span>
          <input
            name="firstName"
            defaultValue={props.firstName}
            required
            className={styles.input}
            autoComplete="given-name"
          />
        </label>

        <label className={styles.field}>
          <span>Last name <span aria-hidden="true">*</span></span>
          <input
            name="lastName"
            defaultValue={props.lastName}
            required
            className={styles.input}
            autoComplete="family-name"
          />
        </label>

        <label className={styles.field}>
          <span>Date of birth</span>
          <input
            name="dateOfBirth"
            type="date"
            defaultValue={props.dateOfBirth}
            className={styles.input}
          />
        </label>

        <label className={styles.field}>
          <span>Phone</span>
          <input
            name="phone"
            type="tel"
            inputMode="tel"
            defaultValue={props.phone}
            className={styles.input}
            autoComplete="tel"
          />
        </label>

        <label className={styles.field}>
          <span>Email</span>
          <input
            name="email"
            type="email"
            defaultValue={props.email}
            className={styles.input}
            autoComplete="email"
          />
        </label>

        <label className={styles.field}>
          <span>Address</span>
          <input
            name="address"
            defaultValue={props.address}
            className={styles.input}
            autoComplete="street-address"
          />
        </label>

        <label className={`${styles.field} ${styles.fieldWide}`}>
          <span>Notes</span>
          <textarea
            name="notes"
            rows={5}
            defaultValue={props.notes}
            className={styles.textarea}
          />
        </label>
      </div>

      {state.message ? (
        <p role="alert" className={styles.formHint}>
          {state.message}
        </p>
      ) : null}

      <div className={styles.formActions}>
        <Link href={`/patients/${props.patientId}`} className={styles.secondaryButton}>
          Cancel
        </Link>
        <button type="submit" className={styles.primaryButton} disabled={pending}>
          {pending ? "Saving changes…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
