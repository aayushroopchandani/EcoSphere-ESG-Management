import { currentUser } from "@clerk/nextjs/server";
import { requireRole } from "@/lib/auth/roles";
import { AdminDashboardClient } from "@/features/dashboard/components/admin-dashboard-client";

export default async function AdminDashboardPage() {
  await requireRole("admin");
  const user = await currentUser();

  return (
    <AdminDashboardClient
      userEmail={user?.primaryEmailAddress?.emailAddress ?? "admin"}
    />
  );
}
