"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DeliveryTopBar } from "@/shared/components/DeliveryTopBar";
import { loadCourierSession, type CourierSession } from "@/lib/courier-session";

export default function DeliveryAppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<CourierSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const current = loadCourierSession();
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
        data-test-id="delivery-app-loading"
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <DeliveryTopBar session={session} />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-4">{children}</main>
    </div>
  );
}
