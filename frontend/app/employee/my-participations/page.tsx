import { currentUser } from "@clerk/nextjs/server";
import { requireRole } from "@/lib/auth/roles";
import { MyParticipationsClient } from "@/features/social/components/my-participations-client";

export default async function MyParticipationsPage() {
  await requireRole("employee");
  const user = await currentUser();

  return (
    <MyParticipationsClient
      firstName={user?.firstName ?? "there"}
      userEmail={user?.primaryEmailAddress?.emailAddress ?? "employee"}
    />
  );
}
