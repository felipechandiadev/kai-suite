import { AppProviders } from "@/providers/AppProviders";
import { LicenseGate } from "@/sections/license/LicenseGate";
import { AppShell } from "@/shell/AppShell";
import { SplashGate } from "@/shell/SplashScreen";

export function App() {
  return (
    <AppProviders>
      <SplashGate>
        <LicenseGate>
          <AppShell />
        </LicenseGate>
      </SplashGate>
    </AppProviders>
  );
}
