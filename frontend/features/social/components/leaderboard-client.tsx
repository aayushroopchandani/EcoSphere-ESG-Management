"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { UserButton, useAuth } from "@clerk/nextjs";
import {
  ArrowLeft,
  Award,
  RefreshCw,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { getLeaderboard, getMyGamification } from "@/features/social/lib/social-api";
import type { LeaderboardUser, MyGamification } from "@/features/social/types/social";
import { GovernanceMetricCard } from "@/features/governance/components/governance-metric-card";

export function LeaderboardClient({
  firstName,
  userEmail,
}: {
  firstName: string;
  userEmail: string;
}) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [leaderboardUsers, setLeaderboardUsers] = useState<LeaderboardUser[]>([]);
  const [myStats, setMyStats] = useState<MyGamification | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Missing Clerk session token");
      }

      const [board, stats] = await Promise.all([
        getLeaderboard(token),
        getMyGamification(token),
      ]);

      setLeaderboardUsers(board);
      setMyStats(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load leaderboard data");
    } finally {
      setIsLoading(false);
    }
  }, [getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <main className="governance-circuit-bg min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur dark:border-white/10 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
              EcoSphere Employee
            </p>
            <h1 className="truncate text-xl font-semibold text-slate-950 dark:text-white">
              Leaderboard & Gamification
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              aria-label="Back to employee dashboard"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-emerald-400 dark:hover:text-emerald-300"
              href="/employee/dashboard"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Home</span>
            </Link>
            <Button
              aria-label="Refresh leaderboard workspace"
              className="h-10 w-10 px-0 animate-none"
              disabled={isLoading}
              onClick={() => void loadData()}
              type="button"
              variant="secondary"
            >
              <RefreshCw
                className={isLoading ? "animate-spin" : ""}
                size={17}
              />
            </Button>
            <ThemeToggle />
            <UserButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        <section className="mb-6 grid gap-4 lg:grid-cols-[1fr_22rem] lg:items-end">
          <div className="animate-governance-rise">
            <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200">
              <Sparkles size={16} />
              EcoSphere Gamification
            </div>
            <h2 className="max-w-3xl text-3xl font-semibold leading-tight text-slate-950 dark:text-white sm:text-4xl">
              Hi {firstName}, check where you stand in the rankings today.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Signed in as {userEmail}
            </p>
          </div>

          <div className="governance-live-panel rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/85">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Global Rank
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                  #{myStats?.rank ?? "-"}
                </p>
              </div>
              <span className="grid h-12 w-12 place-items-center rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                <Trophy size={22} />
              </span>
            </div>
            <div className="mt-4 grid grid-cols-6 gap-1">
              {Array.from({ length: 18 }).map((_, index) => (
                <span
                  className="h-2 rounded-full bg-emerald-400/70 governance-bar"
                  key={index}
                  style={{ animationDelay: `${index * 70}ms` }}
                />
              ))}
            </div>
          </div>
        </section>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200">
            {error}
          </div>
        )}

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <GovernanceMetricCard
            helper="Rank among all employees"
            icon={Trophy}
            index={0}
            title="My Rank"
            tone="amber"
            value={myStats ? `#${myStats.rank}` : "-"}
          />
          <GovernanceMetricCard
            helper="Total XP earned from ESG activities"
            icon={Zap}
            index={1}
            title="My Experience Points (XP)"
            tone="emerald"
            value={myStats ? `${myStats.xp} XP` : "-"}
          />
          <GovernanceMetricCard
            helper="Badges unlocked for achievements"
            icon={Award}
            index={2}
            title="My Badges"
            tone="indigo"
            value={myStats ? `${myStats.badges.length}` : "0"}
          />
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
          {/* Leaderboard list card */}
          <div className="governance-panel rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/85">
            <div className="border-b border-slate-200 p-5 dark:border-white/10">
              <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Top Sustainability Performers</h3>
              <p className="text-sm text-slate-500">EcoSphere ESG Champion Leaderboard</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-400">
                    <th className="px-6 py-4">Rank</th>
                    <th className="px-6 py-4">Employee</th>
                    <th className="px-6 py-4">Earned XP</th>
                    <th className="px-6 py-4">Badges</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {isLoading && leaderboardUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-500">
                        Loading ranking stats...
                      </td>
                    </tr>
                  ) : leaderboardUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-500">
                        No leaderboard data found.
                      </td>
                    </tr>
                  ) : (
                    leaderboardUsers.map((user) => {
                      const isMe = user.clerk_user_id === myStats?.clerk_user_id;
                      return (
                        <tr
                          key={user.clerk_user_id}
                          className={`transition hover:bg-slate-50/60 dark:hover:bg-white/5 ${
                            isMe ? "bg-emerald-50/30 dark:bg-emerald-950/15" : ""
                          }`}
                        >
                          <td className="px-6 py-4 font-semibold">
                            {user.rank === 1 ? (
                              <span className="inline-flex items-center gap-1 text-amber-500">
                                🥇 <span className="text-xs font-bold text-amber-600">1st</span>
                              </span>
                            ) : user.rank === 2 ? (
                              <span className="inline-flex items-center gap-1 text-slate-400">
                                🥈 <span className="text-xs font-bold text-slate-500">2nd</span>
                              </span>
                            ) : user.rank === 3 ? (
                              <span className="inline-flex items-center gap-1 text-amber-700">
                                🥉 <span className="text-xs font-bold text-amber-800">3rd</span>
                              </span>
                            ) : (
                              <span>{user.rank}</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <p className={`font-semibold ${isMe ? "text-emerald-700 dark:text-emerald-300" : ""}`}>
                                {user.first_name || user.last_name
                                  ? `${user.first_name ?? ""} ${user.last_name ?? ""}`
                                  : user.email?.split("@")[0] || "User"}
                                {isMe && <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-800 dark:bg-emerald-400/20 dark:text-emerald-200">You</span>}
                              </p>
                              <p className="text-xs text-slate-500">{user.email}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-semibold text-emerald-600 dark:text-emerald-400">
                            {user.xp} XP
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {user.badges && user.badges.length > 0 ? (
                                user.badges.map((badge) => (
                                  <span
                                    key={badge}
                                    className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700 dark:bg-white/10 dark:text-slate-300"
                                  >
                                    {badge}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-slate-500">No badges</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Badges unlocked side card */}
          <div className="governance-panel rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/85">
            <h3 className="text-lg font-semibold text-slate-950 dark:text-white">My Achievement Badges</h3>
            <p className="text-xs text-slate-500 mb-4">Complete CSR events and challenge metrics to unlock badges.</p>
            
            {myStats && myStats.badges && myStats.badges.length > 0 ? (
              <div className="space-y-3">
                {myStats.badges.map((badge) => (
                  <div
                    key={badge}
                    className="flex items-center gap-3 rounded-lg border border-emerald-100 bg-emerald-50/20 p-3 dark:border-emerald-500/10 dark:bg-emerald-500/5"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-300 text-lg">
                      🛡️
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-950 dark:text-white">{badge}</p>
                      <p className="text-xs text-slate-500">Milestone fully unlocked</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-slate-500 dark:border-white/10">
                <Award className="mx-auto text-slate-400 mb-2" size={32} />
                <p className="text-sm">No badges unlocked yet.</p>
                <p className="text-xs text-slate-400 mt-1">Join CSR activities to win your first badge!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
