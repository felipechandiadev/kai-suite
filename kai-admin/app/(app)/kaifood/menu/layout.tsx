import { KaiMenuTabs } from "./KaiMenuTabs";

export default function KaiMenuLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <KaiMenuTabs />
      {children}
    </div>
  );
}
