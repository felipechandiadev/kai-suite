import PosTopBarClient from "@/shared/components/PosTopBar/PosTopBarClient";
import PosLayoutChrome from "./PosLayoutChrome";

export default function PosLayout({ children }: { children: React.ReactNode }) {
  return <PosLayoutChrome topBar={<PosTopBarClient />}>{children}</PosLayoutChrome>;
}
