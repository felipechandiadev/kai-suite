import Link from 'next/link';
import DsPageHeader from '../_components/DsPageHeader';

export default function DesignSystemGovernancePage() {
  return (
    <div className="space-y-10">
      <DsPageHeader
        kicker="Gobernanza"
        title="Reglas de uso"
        description="Límites entre @kai/ui, tokens de app y código de dominio. Objetivo: ningún escenario visual definido al azar en una feature suelta."
      />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Qué va en @kai/ui</h2>
        <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
          <li>Primitivos sin lógica de negocio ni acoplamiento a NextAuth/rutas ERP.</li>
          <li>CSS colocalizado con var(--color-*); export desde packages/ui/src/index.ts.</li>
          <li>Layouts reutilizables (Basic, Tab, Collection) y DataGrid.</li>
          <li>Ver matriz completa en packages/ui/ADAPTACION.md.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Qué queda en cada PWA</h2>
        <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
          <li>TopBar, SideBar, navegación por módulo.</li>
          <li>Features de dominio (Multimedia, PurchaseDocumentBuilder, etc.).</li>
          <li>Server Actions, schemas Zod por entidad, llamadas al backend con Bearer.</li>
          <li>globals.css: valores concretos de tokens por marca/vertical.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Checklist — nueva pantalla admin</h2>
        <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
          <li>Elegir layout en Patrones → Layouts.</li>
          <li>Usar tokens (Foundations → Colores); prohibido hex suelto en JSX/CSS de feature.</li>
          <li>Tipografía: usar tokens de `typographyTokens.ts` y reglas de `typographyRules.ts`; no clases sueltas (`text-muted`, `text-primary` como link).</li>
          <li>Importar primitivos desde @kai/ui, no desde stubs legacy en shared/components.</li>
          <li>Listado: TabPageLayout compact + DataGrid con title y headerActions documentados.</li>
          <li>Formulario: Zod + Server Action; Alert para feedback; Dialog para destructivo.</li>
          <li>Si el patrón es nuevo y repetible: añadir sección aquí o showcase en /design-system/components.</li>
        </ol>
      </section>

      <section className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Decisión</th>
              <th className="px-4 py-2">Hacer</th>
              <th className="px-4 py-2">No hacer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr>
              <td className="px-4 py-3 align-top">Datos en UI</td>
              <td className="px-4 py-3 align-top text-muted-foreground">Server Actions + props desde RSC</td>
              <td className="px-4 py-3 align-top text-muted-foreground">fetch/useEffect en componentes de pantalla</td>
            </tr>
            <tr>
              <td className="px-4 py-3 align-top">Estilos</td>
              <td className="px-4 py-3 align-top text-muted-foreground">Tailwind con tokens + CSS module en @kai/ui</td>
              <td className="px-4 py-3 align-top text-muted-foreground">styled-components, colores inline arbitrarios</td>
            </tr>
            <tr>
              <td className="px-4 py-3 align-top">Componente compartido</td>
              <td className="px-4 py-3 align-top text-muted-foreground">Subir a @kai/ui si 2+ apps lo necesitan</td>
              <td className="px-4 py-3 align-top text-muted-foreground">Copiar TSX entre pwa-admin y pwa-pos</td>
            </tr>
            <tr>
              <td className="px-4 py-3 align-top">Documentación</td>
              <td className="px-4 py-3 align-top text-muted-foreground">Actualizar design-system + README del componente</td>
              <td className="px-4 py-3 align-top text-muted-foreground">Solo comentario en PR</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="space-y-2 text-sm text-muted-foreground">
        <h2 className="text-xl font-semibold text-foreground">Referencias en repo</h2>
        <ul className="list-inside list-disc space-y-1">
          <li>
            <code className="rounded bg-neutral px-1">packages/ui/DESIGN-SYSTEM.md</code> — hub técnico
          </li>
          <li>
            <code className="rounded bg-neutral px-1">packages/ui/ADAPTACION.md</code> — matriz app × componente
          </li>
          <li>
            <code className="rounded bg-neutral px-1">packages/ui/src/components/DataGrid/README.md</code> — listados
          </li>
          <li>
            <Link href="/design-system" className="font-medium text-primary hover:underline">
              /design-system
            </Link>{' '}
            — referencia viva en el admin (puerto dev 5031)
          </li>
        </ul>
      </section>
    </div>
  );
}
