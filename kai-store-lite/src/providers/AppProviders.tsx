import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { MemoryNavProvider } from "@kai/ui";
import { ThemeProvider } from "./ThemeProvider";
import { LicenseProvider } from "./LicenseProvider";
import { AuthProvider } from "./AuthProvider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LicenseProvider>
        <AuthProvider>
          <MemoryNavProvider>
            <MemoryRouter>{children}</MemoryRouter>
          </MemoryNavProvider>
        </AuthProvider>
      </LicenseProvider>
    </ThemeProvider>
  );
}
