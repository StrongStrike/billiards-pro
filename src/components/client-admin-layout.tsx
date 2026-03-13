"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { AdminShell } from "@/components/admin-shell";
import { Panel } from "@/components/ui/panel";
import { getStoredAuthToken } from "@/lib/client/auth";
import { ApiError, isExternalApiMode } from "@/lib/client/api";
import { useBootstrapQuery } from "@/lib/hooks/use-club-data";

export function ClientAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const bootstrapQuery = useBootstrapQuery();

  useEffect(() => {
    if (isExternalApiMode() && !getStoredAuthToken()) {
      router.replace("/login");
      return;
    }

    if (bootstrapQuery.error instanceof ApiError && bootstrapQuery.error.status === 401) {
      router.replace("/login");
    }
  }, [bootstrapQuery.error, router]);

  if (bootstrapQuery.isPending || !bootstrapQuery.data) {
    return (
      <div className="min-h-screen px-4 py-4 md:px-6 xl:px-8">
        <Panel className="min-h-[calc(100vh-2rem)] animate-pulse bg-white/5" />
      </div>
    );
  }

  return (
    <AdminShell
      operator={bootstrapQuery.data.operator}
      clubName={bootstrapQuery.data.settings.clubName}
      timezone={bootstrapQuery.data.settings.timezone}
    >
      {children}
    </AdminShell>
  );
}
