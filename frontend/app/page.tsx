import { auth } from "@clerk/nextjs/server";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8">
        <nav className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">
              EcoSphere
            </p>
            <p className="text-sm text-slate-400">ESG management platform</p>
          </div>
          <SignInButton mode="modal" fallbackRedirectUrl="/dashboard">
            <button className="rounded-md border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:border-emerald-300 hover:text-emerald-200">
              Sign in
            </button>
          </SignInButton>
        </nav>

        <div className="grid flex-1 items-center gap-10 py-16 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="max-w-2xl">
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.18em] text-emerald-300">
              Admin and employee portals
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-white sm:text-6xl">
              Track ESG impact with role based access.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
              Admins manage carbon, CSR, governance, rewards, and reports.
              Employees participate in challenges, acknowledge policies, and
              earn XP.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <SignUpButton mode="modal" fallbackRedirectUrl="/dashboard">
                <button className="rounded-md bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300">
                  Create account
                </button>
              </SignUpButton>
              <SignInButton mode="modal" fallbackRedirectUrl="/dashboard">
                <button className="rounded-md border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:border-emerald-300 hover:text-emerald-200">
                  Open dashboard
                </button>
              </SignInButton>
            </div>
          </div>

          <div className="grid gap-4">
            {[
              ["Environmental", "Carbon transactions and emission tracking"],
              ["Social", "CSR participation, approvals, and XP"],
              ["Governance", "Policies, audits, and compliance ownership"],
            ].map(([title, description]) => (
              <div
                key={title}
                className="rounded-lg border border-white/10 bg-white/[0.04] p-5"
              >
                <h2 className="text-lg font-semibold text-white">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
