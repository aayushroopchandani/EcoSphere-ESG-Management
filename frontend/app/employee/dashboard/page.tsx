import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { requireRole } from "@/lib/auth/roles";

const employeeActions = [
  {
    description: "Join activities and upload proof for approval",
    href: "/employee/activities",
    title: "CSR Activities",
  },
  {
    description: "View your XP, badges and see how you rank",
    href: "/employee/leaderboard",
    title: "Leaderboard",
  },
  {
    description: "Ask the policy copilot and acknowledge assigned governance policies",
    href: "/employee/governance",
    title: "Policies",
  },
  {
    description: "Track your CSR participation history and approval status",
    href: "/employee/my-participations",
    title: "My Participations",
  },
];

export default async function EmployeeDashboardPage() {
  await requireRole("employee");
  const user = await currentUser();

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
              EcoSphere Employee
            </p>
            <h1 className="text-xl font-semibold text-slate-950">
              My ESG Workspace
            </h1>
          </div>
          <UserButton />
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8">
          <p className="text-sm text-slate-500">
            Welcome {user?.firstName ?? "back"}
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-950">
            Participate, earn XP, and track your impact.
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {employeeActions.map((action) =>
            action.href ? (
              <Link
                className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
                href={action.href}
                key={action.title}
              >
                <h3 className="text-lg font-semibold text-slate-950">
                  {action.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {action.description}
                </p>
              </Link>
            ) : (
              <article
                className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
                key={action.title}
              >
                <h3 className="text-lg font-semibold text-slate-950">
                  {action.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {action.description}
                </p>
              </article>
            ),
          )}
        </div>
      </section>
    </main>
  );
}
