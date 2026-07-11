import Link from "next/link";
import { uiComponentItems } from "@/navigation/mainMenu";

export default function UiComponentsIndexPage() {
  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">UI Components</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Galería de componentes compartidos del admin. Elija una entrada para ver variantes, tokens de color y ejemplos interactivos.
      </p>
      <ul className="mt-8 grid gap-2 sm:grid-cols-2">
        {uiComponentItems
          .filter((item): item is typeof item & { url: string } => Boolean(item.url))
          .map((item) => (
          <li key={item.id}>
            <Link
              href={item.url}
              className="flex rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted/40"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-xs text-muted-foreground">
        Producto / variantes: los mismos patrones de multimedia se usan en Inventario → Productos (panel de archivos).
      </p>
    </div>
  );
}
