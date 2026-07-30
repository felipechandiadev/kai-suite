import type { ReactNode } from "react";

export default function LoginPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-10">
        {children}
      </main>
    </div>
  );
}
