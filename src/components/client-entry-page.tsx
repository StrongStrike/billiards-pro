"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Panel } from "@/components/ui/panel";
import { getStoredAuthToken } from "@/lib/client/auth";
import { requestJson, isExternalApiMode } from "@/lib/client/api";
import type { BootstrapPayload } from "@/types/club";

export function ClientEntryPage() {
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function resolve() {
      if (isExternalApiMode() && !getStoredAuthToken()) {
        router.replace("/login");
        return;
      }

      try {
        await requestJson<BootstrapPayload>("/api/bootstrap");
        if (active) {
          router.replace("/dashboard");
        }
      } catch {
        if (active) {
          router.replace("/login");
        }
      }
    }

    resolve();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <div className="min-h-screen px-4 py-4 md:px-6 xl:px-8">
      <Panel className="min-h-[calc(100vh-2rem)] animate-pulse bg-white/5" />
    </div>
  );
}
