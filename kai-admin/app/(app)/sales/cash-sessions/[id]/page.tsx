import { notFound } from "next/navigation";
import { getCashSessionDetailForPage } from "@/features/sales-cash-sessions/actions/cash-session-detail.action";
import CashSessionDetailPage from "./ui/CashSessionDetailPage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  const res = await getCashSessionDetailForPage(id);
  if (!res.success) {
    notFound();
  }
  return <CashSessionDetailPage detail={res.data} />;
}
