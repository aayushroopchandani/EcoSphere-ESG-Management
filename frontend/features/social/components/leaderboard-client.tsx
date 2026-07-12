"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { getLeaderboard } from "@/features/social/lib/social-api";
import type { LeaderboardUser } from "@/features/social/types/social";

export function LeaderboardClient() {
  const { getToken } = useAuth();
  const [users, setUsers] = useState<LeaderboardUser[]>([]);

  useEffect(() => {
    async function load() {
      const token = await getToken();
      if (!token) return;

      setUsers(await getLeaderboard(token));
    }

    load();
  }, [getToken]);

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <h1 className="mb-6 text-2xl font-bold">Leaderboard</h1>

      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="p-2 text-left">Rank</th>
            <th className="p-2 text-left">Name</th>
            <th className="p-2 text-left">XP</th>
          </tr>
        </thead>

        <tbody>
          {users.map((user, index) => (
            <tr key={user.clerk_user_id} className="border-b">
              <td className="p-2">{index + 1}</td>

              <td className="p-2">
                {user.first_name} {user.last_name}
              </td>

              <td className="p-2">{user.xp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
