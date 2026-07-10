import { Suspense } from "react";
import { listUsersForSettingsPage } from "@/features/settings-users/actions/user.action";
import { SettingsUsersCollection } from "./components/SettingsUsersCollection";
import { LoadingState } from '@kai/ui';

export const dynamic = "force-dynamic";

export default async function Page() {
  const users = await listUsersForSettingsPage();

  return (
    <Suspense
      fallback={
        <LoadingState className="flex items-center justify-center p-4 md:p-6 py-4" data-test-id="users-page-skeleton" />
      }
    >
      <SettingsUsersCollection initialUsers={users} />
    </Suspense>
  );
}
