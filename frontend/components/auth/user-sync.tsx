"use client";

import { useEffect, useRef } from "react";
import { useAuth, useUser } from "@clerk/nextjs";

export function UserSync() {
  const { getToken, isSignedIn } = useAuth();
  const { isLoaded, user } = useUser();
  const syncedUserId = useRef<string | null>(null);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!apiUrl || !isLoaded || !isSignedIn || !user) {
      return;
    }

    if (syncedUserId.current === user.id) {
      return;
    }

    let cancelled = false;
    const currentUser = user;

    async function syncUser() {
      const token = await getToken();

      if (!token || cancelled) {
        return;
      }

      const response = await fetch(`${apiUrl}/api/users/sync`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: currentUser.primaryEmailAddress?.emailAddress ?? null,
          first_name: currentUser.firstName ?? null,
          last_name: currentUser.lastName ?? null,
          image_url: currentUser.imageUrl ?? null,
        }),
      });

      if (response.ok && !cancelled) {
        syncedUserId.current = currentUser.id;
      }
    }

    syncUser().catch((error) => {
      console.warn("Unable to sync Clerk user with API", error);
    });

    return () => {
      cancelled = true;
    };
  }, [getToken, isLoaded, isSignedIn, user]);

  return null;
}
