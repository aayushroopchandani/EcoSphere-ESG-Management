import { currentUser } from "@clerk/nextjs/server";
import { EnvironmentDashboardClient } from "@/features/environment/components/environment-dashboard-client";
import { requireRole } from "@/lib/auth/roles";

export default async function AdminEnvironmentPage() {
  await requireRole("admin");
  const user = await currentUser();

  return (
    <EnvironmentDashboardClient
      userEmail={user?.primaryEmailAddress?.emailAddress ?? "admin"}
    />
  );
}
