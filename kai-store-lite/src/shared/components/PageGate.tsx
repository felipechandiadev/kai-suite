import type { ReactNode } from "react";
import { Alert, LoadingState } from "@kai/ui";
import { useAuth, type LiteRole } from "@/providers/AuthProvider";
import { useLicense } from "@/providers/LicenseProvider";

export function PageGate({
  roles,
  children,
  fallback = null,
}: {
  roles?: LiteRole[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { isAllowed, loading } = useLicense();
  const { user, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="p-4">
        <LoadingState label="Cargando licencia…" />
      </div>
    );
  }
  if (!isAllowed) return <>{fallback}</>;
  if (roles && roles.length > 0 && (!user || !hasRole(...roles))) {
    return (
      <div className="p-4">
        <Alert variant="warning">Sin permiso para esta vista.</Alert>
      </div>
    );
  }
  return <>{children}</>;
}
