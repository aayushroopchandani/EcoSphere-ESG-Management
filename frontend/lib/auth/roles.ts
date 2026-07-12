import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const ROLES = ["admin", "employee"] as const;
export type AppRole = (typeof ROLES)[number];

export const DEFAULT_ROLE: AppRole = "employee";

export function isAppRole(role: unknown): role is AppRole {
  return typeof role === "string" && ROLES.includes(role as AppRole);
}

export function getDashboardPath(role: AppRole) {
  return role === "admin" ? "/admin/dashboard" : "/employee/dashboard";
}

export async function getCurrentUserRole(): Promise<AppRole> {
  const { sessionClaims } = await auth();
  const claimRole = sessionClaims?.metadata?.role;

  if (isAppRole(claimRole)) {
    return claimRole;
  }

  const user = await currentUser();
  const metadataRole = user?.publicMetadata?.role;

  return isAppRole(metadataRole) ? metadataRole : DEFAULT_ROLE;
}

export async function requireSignedIn() {
  const authState = await auth();

  if (!authState.userId) {
    return authState.redirectToSignIn();
  }

  return authState.userId;
}

export async function requireRole(expectedRole: AppRole) {
  const userId = await requireSignedIn();
  const role = await getCurrentUserRole();

  if (role !== expectedRole) {
    redirect("/unauthorized");
  }

  return { userId, role };
}

export async function redirectToCurrentDashboard() {
  await requireSignedIn();
  const role = await getCurrentUserRole();
  redirect(getDashboardPath(role));
}
