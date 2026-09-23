"use client";

import React, { Suspense, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { NavProvider } from "./context";
import type { NavRouter } from "./types";

function NextNavProviderInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const nextRouter = useRouter();

  const router = useMemo<NavRouter>(
    () => ({
      push(href, options) {
        nextRouter.push(href, options);
      },
      replace(href, options) {
        nextRouter.replace(href, options);
      },
      back() {
        nextRouter.back();
      },
    }),
    [nextRouter],
  );

  const navSearchParams = useMemo(
    () => new URLSearchParams(searchParams.toString()),
    [searchParams],
  );

  return (
    <NavProvider
      router={router}
      pathname={pathname}
      searchParams={navSearchParams}
    >
      {children}
    </NavProvider>
  );
}

/** Bridges Next.js App Router into @kai/ui navigation context. */
export function NextNavProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={children}>
      <NextNavProviderInner>{children}</NextNavProviderInner>
    </Suspense>
  );
}
