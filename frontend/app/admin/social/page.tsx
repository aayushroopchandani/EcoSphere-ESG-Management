import { currentUser } from "@clerk/nextjs/server";
import { requireRole } from "@/lib/auth/roles";
import { SocialAdminClient } from "@/features/social/components/social-admin-client";

export default async function AdminSocialPage() {
  await requireRole("admin");
  const user = await currentUser();

  const userEmail =
    user?.emailAddresses[0]?.emailAddress ?? user?.id ?? "admin";

  return <SocialAdminClient userEmail={userEmail} />;
}
