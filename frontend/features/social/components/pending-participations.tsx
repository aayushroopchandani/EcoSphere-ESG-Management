"use client";

import type { Participation } from "@/features/social/types/social";

interface PendingParticipationsProps {
  participations: Participation[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function PendingParticipations({
  participations,
  onApprove,
  onReject,
}: PendingParticipationsProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-xl font-semibold">Pending Approvals</h2>

      {participations.length === 0 ? (
        <p className="text-slate-500">No pending submissions.</p>
      ) : (
        <div className="space-y-4">
          {participations.map((item) => (
            <div key={item.id} className="rounded border p-4">
              <p>
                <strong>Employee:</strong> {item.employee_id}
              </p>

              <p>
                <strong>Proof:</strong>{" "}
                <a
                  href={item.proof_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline"
                >
                  Open Proof
                </a>
              </p>

              <p className="mt-2">{item.note}</p>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => onApprove(item.id)}
                  className="rounded bg-green-600 px-4 py-2 text-white"
                >
                  Approve
                </button>

                <button
                  onClick={() => onReject(item.id)}
                  className="rounded bg-red-600 px-4 py-2 text-white"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
