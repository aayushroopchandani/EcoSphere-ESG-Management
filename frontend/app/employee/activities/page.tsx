import { currentUser } from "@clerk/nextjs/server";
import { requireRole } from "@/lib/auth/roles";
import { EmployeeActivitiesClient } from "@/features/social/components/employee-activities-client";

export default async function EmployeeActivitiesPage() {
  await requireRole("employee");
  const user = await currentUser();

  return (
    <EmployeeActivitiesClient
      firstName={user?.firstName ?? "there"}
      userEmail={user?.primaryEmailAddress?.emailAddress ?? "employee"}
    />
  );
}
