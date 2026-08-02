import { BasicPageLayout } from "@kai/ui";

export const dynamic = "force-dynamic";

export default function KaiMenuHeroPage() {
  return (
    <BasicPageLayout
      title="Hero"
      subtitle="Slides del encabezado (próximamente: gestor multimedia como eShop)."
    >
      <p className="text-sm text-muted-foreground">
        Use la API de hero slides o el seed demo para contenido inicial. El editor visual se
        añadirá en una iteración siguiente.
      </p>
    </BasicPageLayout>
  );
}
