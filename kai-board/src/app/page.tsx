"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getBoardDisplayToken } from "@/lib/board-display-storage";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = getBoardDisplayToken();
    if (token) {
      router.replace("/board");
    } else {
      router.replace("/setup");
    }
  }, [router]);

  return (
    <main className="flex flex-1 items-center justify-center p-8 text-muted-foreground">
      Cargando Kai Board…
    </main>
  );
}
