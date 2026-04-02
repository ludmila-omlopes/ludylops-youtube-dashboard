import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { adminEmails } from "@/lib/env";

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.email || !session.user.activeViewerId) {
    redirect("/");
  }
  return session;
}

export async function requireAdminSession() {
  const session = await requireSession();
  const email = session.user?.email?.toLowerCase();
  if (!email || !adminEmails.has(email)) {
    redirect("/");
  }
  return session;
}
