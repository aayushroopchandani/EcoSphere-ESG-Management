"use client";

import { useCallback, useEffect, useState } from "react";
import { UserButton, useAuth } from "@clerk/nextjs";
import { RefreshCw, Users } from "lucide-react";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";

import {
  createCSRActivity,
  getCSRActivities,
  getPendingParticipations,
  reviewParticipation,
} from "@/features/social/lib/social-api";

import type {
  CSRActivity,
  CreateCSRActivityPayload,
  Participation,
} from "@/features/social/types/social";

import { ActivityForm } from "@/features/social/components/activity-form";
import { ActivityList } from "@/features/social/components/activity-list";
import { PendingParticipations } from "@/features/social/components/pending-participations";

interface Props {
  userEmail: string;
}

export function SocialAdminClient({ userEmail }: Props) {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [activities, setActivities] = useState<CSRActivity[]>([]);
  const [pendingParticipations, setPendingParticipations] = useState<
    Participation[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadActivities = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;

    setLoading(true);
    setError(null);

    try {
      const token = await getToken();

      if (!token) {
        throw new Error("Missing Clerk session token");
      }

      const activities = await getCSRActivities(token);
      const pending = await getPendingParticipations(token);

      setActivities(activities);
      setPendingParticipations(pending);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load CSR data");
    } finally {
      setLoading(false);
    }
  }, [getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    void loadActivities();
  }, [loadActivities]);

  async function handleCreate(payload: CreateCSRActivityPayload) {
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const token = await getToken();

      if (!token) {
        throw new Error("Missing Clerk session token");
      }

      await createCSRActivity(token, payload);

      setNotice("CSR activity created successfully.");

      await loadActivities();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create CSR activity",
      );
    } finally {
      setSaving(false);
    }
  }

  async function approveParticipation(id: string) {
    setError(null);
    try {
      const token = await getToken();
      if (!token) return;

      await reviewParticipation(token, id, { approved: true });
      setNotice("Participation approved.");
      await loadActivities();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve");
    }
  }

  async function rejectParticipation(id: string) {
    setError(null);
    try {
      const token = await getToken();
      if (!token) return;

      await reviewParticipation(token, id, { approved: false });
      setNotice("Participation rejected.");
      await loadActivities();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject");
    }
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
              EcoSphere Admin
            </p>

            <h1 className="text-2xl font-semibold">Social & Gamification</h1>

            <p className="mt-1 text-sm text-slate-500">
              Signed in as {userEmail}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              type="button"
              disabled={loading}
              onClick={() => void loadActivities()}
            >
              <RefreshCw className={loading ? "animate-spin" : ""} size={16} />
            </Button>

            <ThemeToggle />

            <UserButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl p-6">
        {(error || notice) && (
          <div
            className={
              error
                ? "mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                : "mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
            }
          >
            {error ?? notice}
          </div>
        )}

        <section className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <Users size={22} />

              <div>
                <p className="text-sm text-slate-500">Total CSR Activities</p>

                <h2 className="text-3xl font-bold">{activities.length}</h2>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Active Activities</p>

            <h2 className="mt-2 text-3xl font-bold">
              {
                activities.filter((activity) => activity.status === "active")
                  .length
              }
            </h2>
          </div>

          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Pending Reviews</p>

            <h2 className="mt-2 text-3xl font-bold">
              {pendingParticipations.length}
            </h2>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <ActivityForm onCreate={handleCreate} isSubmitting={saving} />

          <ActivityList activities={activities} />
        </section>

        <div className="mt-8">
          <PendingParticipations
            participations={pendingParticipations}
            onApprove={approveParticipation}
            onReject={rejectParticipation}
          />
        </div>
      </div>
    </main>
  );
}