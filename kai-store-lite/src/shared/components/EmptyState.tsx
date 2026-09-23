import { LitePage } from "@/shared/components/LitePage";

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <LitePage title={title} subtitle={hint}>
      <span className="sr-only">Vacío</span>
    </LitePage>
  );
}
