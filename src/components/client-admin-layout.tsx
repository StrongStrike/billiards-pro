"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";

import { AdminShell } from "@/components/admin-shell";
import { Panel } from "@/components/ui/panel";
import { getStoredAuthToken } from "@/lib/client/auth";
import { ApiError, isExternalApiMode } from "@/lib/client/api";
import { useBootstrapQuery } from "@/lib/hooks/use-club-data";

export function ClientAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
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
      generatedAt={bootstrapQuery.data.generatedAt}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 18, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -10, filter: "blur(8px)" }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </AdminShell>
  );
}
