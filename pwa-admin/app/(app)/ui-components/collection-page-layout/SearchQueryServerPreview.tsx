import { Card } from "@kai/ui";

/**
 * Contenido solo servidor: demuestra que la página recibe `search` por query al renderizar.
 * Mientras tecleas, la URL se actualiza en el cliente; al refrescar, este bloque vuelve a leer el valor.
 */
export function SearchQueryServerPreview({ searchFromUrl }: { searchFromUrl: string }) {
  return (
    <Card>
      <p className="text-sm font-medium text-foreground">Bloque renderizado en el servidor</p>
      <p className="mt-2 text-sm text-muted">
        Último parámetro <code className="rounded bg-neutral px-1.5 py-0.5 text-xs">?search=</code> visto
        al generar la página (recarga o navegación con el parámetro en la URL):
      </p>
      <p className="mt-3 break-all font-mono text-lg text-foreground">{searchFromUrl || "— vacío —"}</p>
    </Card>
  );
}
