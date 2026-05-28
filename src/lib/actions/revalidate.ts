"use server";

import { revalidateTag } from "next/cache";

export async function revalidateDashboard() {
  revalidateTag("dashboard");
}

export async function revalidateClients() {
  revalidateTag("clients");
  revalidateTag("dashboard");
}

export async function revalidateProjects() {
  revalidateTag("projects");
  revalidateTag("dashboard");
}

export async function revalidateContracts() {
  revalidateTag("contracts");
  revalidateTag("dashboard");
}

export async function revalidateInvoices() {
  revalidateTag("invoices");
  revalidateTag("dashboard");
}

export async function revalidateMeetings() {
  revalidateTag("meetings");
  revalidateTag("dashboard");
}
