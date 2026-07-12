import { redirectToCurrentDashboard } from "@/lib/auth/roles";

export default async function DashboardPage() {
  await redirectToCurrentDashboard();
}
