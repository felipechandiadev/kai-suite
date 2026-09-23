'use client';

import { SessionProvider } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextNavProvider } from '@kai/ui';

const queryClient = new QueryClient();

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NextNavProvider>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </NextNavProvider>
    </SessionProvider>
  );
}

