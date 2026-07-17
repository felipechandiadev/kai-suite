"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KdsTopBar } from "@/shared/components/KdsTopBar";
import { loadKdsSession, type KdsSession } from "@/lib/app-session";

export default function KdsAppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<KdsSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const current = loadKdsSession();
    setHydrated(true);
    if (!current) {
      router.replace("/login");
      return;
    }
    setSession(current);
  }, [router]);

  if (!hydrated || !session) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-background"
        data-test-id="kds-app-loading"
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <KdsTopBar session={session} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-4">{children}</main>
    </div>
  );
}
