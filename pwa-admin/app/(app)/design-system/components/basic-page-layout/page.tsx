import { BasicPageLayout } from "@kai/ui";

export default function BasicPageLayoutShowcasePage() {
  return (
    <div className="w-full min-w-0">
      <BasicPageLayout
        title="BasicPageLayout"
        subtitle="Encabezado opcional (título + subtítulo) y cuerpo flexible. Sin «use client»: válido en páginas servidor."
        data-test-id="ui-showcase-basic-page-layout-main"
      >
        <div className="rounded-lg border border-border bg-muted/20 p-6 text-sm text-muted-foreground">
          Área de contenido: cualquier hijo se renderiza dentro del contenedor{" "}
          <code className="rounded bg-background px-1 py-0.5 text-xs text-foreground">basic-page-layout-content</code>.
        </div>
      </BasicPageLayout>

      <div className="mt-10 rounded-lg border border-dashed border-border p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Variante: sin título</p>
        <BasicPageLayout data-test-id="ui-showcase-basic-page-layout-body-only">
          <p className="text-sm text-muted-foreground">
            Solo cuerpo, sin <code className="rounded bg-muted/50 px-1">h1</code> ni subtítulo; útil para pantallas
            cuyo título vive en otro sitio (p. ej. app shell).
          </p>
        </BasicPageLayout>
      </div>
    </div>
  );
}
