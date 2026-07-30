import { Suspense } from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { listSuperAdminsAction } from "@/features/settings-users/actions/super-admin.action";
import { SuperAdminsCollection } from "../components/SuperAdminsCollection";
import { LoadingState } from '@kai/ui';

export const dynamic = "force-dynamic";

export default async function Page() {
  const [session, res] = await Promise.all([
    getServerSession(authOptions),
    listSuperAdminsAction(),
  ]);
  const items = res.success ? res.items : [];
  const error = res.success ? null : res.error;
  const currentUserId = (session?.user as any)?.id ?? null;

  return (
    <div className="min-h-0" data-test-id="super-admins-page-root">
      <Suspense
        fallback={
          <LoadingState className="flex items-center justify-center p-4 md:p-6 py-4" data-test-id="super-admins-page-skeleton" />
        }
      >
        <SuperAdminsCollection
          initialItems={items}
          currentUserId={currentUserId}
        />
      </Suspense>
      {error ? (
        <p
          className="p-4 text-sm text-error"
          data-test-id="super-admins-page-error"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
