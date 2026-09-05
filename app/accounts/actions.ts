"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PaymentMethod } from "@prisma/client";
import { requireClinicPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { createInvoice, recordPayment } from "@/lib/accounts/registry";

export async function createInvoiceAction(formData: FormData) {
  const context = await requireClinicPermission(PERMISSIONS.ACCOUNTS_INVOICE);
  const visitId = String(formData.get("visitId") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const quantity = Number(formData.get("quantity") ?? 0);
  const unitPrice = Number(formData.get("unitPrice") ?? 0);

  if (!visitId) throw new Error("VISIT_ID_REQUIRED");

  await createInvoice(context, { visitId, description, quantity, unitPrice });
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  redirect("/accounts");
}

export async function recordPaymentAction(formData: FormData) {
  const context = await requireClinicPermission(PERMISSIONS.ACCOUNTS_PAYMENT);
  const invoiceId = String(formData.get("invoiceId") ?? "").trim();
  const amount = Number(formData.get("amount") ?? 0);
  const methodValue = String(formData.get("method") ?? "").trim();
  const externalRef = String(formData.get("externalRef") ?? "").trim() || null;

  if (!invoiceId) throw new Error("INVOICE_ID_REQUIRED");
  if (!Object.values(PaymentMethod).includes(methodValue as PaymentMethod)) {
    throw new Error("INVALID_PAYMENT_METHOD");
  }

  await recordPayment(context, {
    invoiceId,
    amount,
    method: methodValue as PaymentMethod,
    externalRef,
  });

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  redirect("/accounts");
}
