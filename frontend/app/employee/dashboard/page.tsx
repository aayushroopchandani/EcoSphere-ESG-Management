import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { requireRole } from "@/lib/auth/roles";

const employeeActions = [
  ["CSR Activities", "Join activities and upload proof for approval"],
  ["Challenges", "Complete sustainability challenges and earn XP"],
  ["Policies", "Acknowledge ESG policies assigned by admins"],
  ["Rewards", "Redeem earned points from the rewards catalog"],
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
          {employeeActions.map(([title, description]) => (
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
