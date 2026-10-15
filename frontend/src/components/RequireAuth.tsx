"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

/** Client-side route guard. The API enforces the same rules; this only avoids rendering dead pages. */
export function RequireAuth({ adminOnly = false, children }: { adminOnly?: boolean; children: React.ReactNode }) {
  const { user, isAdmin, ready } = useAuth();
  const router = useRouter();

  const allowed = !!user && (!adminOnly || isAdmin);

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
    else if (adminOnly && !isAdmin) router.replace("/employees");
  }, [ready, user, isAdmin, adminOnly, router]);

  if (!ready || !allowed) {
    return (
      <div className="center-screen">
        <div className="spinner" aria-label="Loading" />
      </div>
    );
  }
  return <>{children}</>;
}
