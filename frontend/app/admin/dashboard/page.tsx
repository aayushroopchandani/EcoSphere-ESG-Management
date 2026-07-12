import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { requireRole } from "@/lib/auth/roles";

const adminModules = [
  ["Environmental", "Emission factors, carbon transactions, and goals"],
  ["Social", "CSR activities, approval queues, and participation points"],
  ["Governance", "Policies, audits, compliance issues, and reports"],
  ["Gamification", "Challenges, badges, leaderboards, and rewards"],
];

export default async function AdminDashboardPage() {
  await requireRole("admin");
  const user = await currentUser();

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
              EcoSphere Admin
            </p>
            <h1 className="text-xl font-semibold text-slate-950">
              ESG Command Center
            </h1>
          </div>
          <UserButton />
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8">
          <p className="text-sm text-slate-500">
            Signed in as {user?.primaryEmailAddress?.emailAddress ?? "admin"}
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-950">
            Manage organization wide ESG performance.
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {adminModules.map(([title, description]) => (
            <article
              key={title}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
