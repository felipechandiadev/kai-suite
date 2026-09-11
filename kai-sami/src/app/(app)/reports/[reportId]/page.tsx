import { getAssistantReportAction } from "@/features/assistant/actions/assistant.action";
import { ReportView } from "@/features/assistant/ui/ReportView";

export const dynamic = "force-dynamic";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  const res = await getAssistantReportAction(reportId);
  if (!res.success) {
    return <p className="px-4 text-sm text-error">{res.error}</p>;
  }
  return (
    <div className="px-4 pb-10">
      <ReportView
        title={res.report.title}
        reportId={reportId}
        blocks={res.report.blocks}
      />
    </div>
  );
}
