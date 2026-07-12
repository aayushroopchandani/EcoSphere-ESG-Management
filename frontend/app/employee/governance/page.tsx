import { currentUser } from "@clerk/nextjs/server";
import { requireRole } from "@/lib/auth/roles";
import { EmployeeGovernanceClient } from "@/features/governance/components/employee-governance-client";

export default async function EmployeeGovernancePage() {
  await requireRole("employee");
  const user = await currentUser();

  return (
    <EmployeeGovernanceClient
      firstName={user?.firstName ?? "there"}
      userEmail={user?.primaryEmailAddress?.emailAddress ?? "employee"}
    />
  );
}
