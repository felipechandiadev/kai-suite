import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/auth-options";
import SamiTopBar from "@/shared/components/SamiTopBar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/");
  }
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SamiTopBar />
      <main
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col"
        style={{ paddingTop: "calc(var(--app-topbar-height) + var(--app-main-gap-top))" }}
      >
        {children}
      </main>
    </div>
  );
}
