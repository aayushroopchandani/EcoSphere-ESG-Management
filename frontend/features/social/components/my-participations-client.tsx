"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";

import { getMyParticipations } from "@/features/social/lib/social-api";

import type { Participation } from "@/features/social/types/social";

export function MyParticipationsClient() {
  const { getToken } = useAuth();

  const [participations, setParticipations] = useState<Participation[]>([]);

  useEffect(() => {
    async function load() {
      const token = await getToken();

      if (!token) return;

      const data = await getMyParticipations(token);

      setParticipations(data);
    }

    load();
  }, [getToken]);

  return (
    <div className="max-w-5xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">My Participations</h1>

      {participations.map((item) => (
        <div key={item.id} className="border rounded-lg p-4 mb-4">
          <p>Activity: {item.activity_id}</p>

          <p>Status: {item.approval_status}</p>

          <p>Points: {item.points_earned}</p>

          <a
            href={item.proof_url}
            target="_blank"
            className="text-blue-600 underline"
          >
            Proof
          </a>
        </div>
      ))}
    </div>
  );
}
