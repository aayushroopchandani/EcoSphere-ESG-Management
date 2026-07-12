import { currentUser } from "@clerk/nextjs/server";
import { requireRole } from "@/lib/auth/roles";
import { AdminGovernanceClient } from "@/features/governance/components/admin-governance-client";

export default async function AdminGovernancePage() {
  await requireRole("admin");
  const user = await currentUser();

  return (
    <AdminGovernanceClient
      userEmail={user?.primaryEmailAddress?.emailAddress ?? "admin"}
    />
  );
}
