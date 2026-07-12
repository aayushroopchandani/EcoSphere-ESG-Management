import { currentUser } from "@clerk/nextjs/server";
import { requireRole } from "@/lib/auth/roles";
import { LeaderboardClient } from "@/features/social/components/leaderboard-client";

export default async function LeaderboardPage() {
  await requireRole("employee");
  const user = await currentUser();

  return (
    <LeaderboardClient
      firstName={user?.firstName ?? "there"}
      userEmail={user?.primaryEmailAddress?.emailAddress ?? "employee"}
    />
  );
}
