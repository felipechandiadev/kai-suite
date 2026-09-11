import { listConversationsAction } from "@/features/assistant/actions/assistant.action";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const res = await listConversationsAction();
  const rows = res.success ? res.conversations : [];
  return (
    <div className="space-y-3 px-4 pb-8">
      <h1 className="text-lg font-semibold">Historial</h1>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay conversaciones.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {rows.map((c) => (
            <li key={c.id}>
              <a href={`/chat?c=${c.id}`} className="block px-3 py-3 text-sm hover:bg-muted/40">
                <div className="font-medium">{c.title}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(c.updatedAt).toLocaleString("es-CL")}
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
