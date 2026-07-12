import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-600">
            Access blocked
          </p>
          <UserButton />
        </div>
        <h1 className="text-2xl font-semibold text-slate-950">
          This role cannot open that page.
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Ask an admin to update your Clerk public metadata if your role is
          wrong.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Back to dashboard
        </Link>
      </section>
    </main>
  );
}
