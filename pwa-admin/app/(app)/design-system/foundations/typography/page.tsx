import Link from 'next/link';
import DsPageHeader from '../../_components/DsPageHeader';
import TypographyShowcase from '../../_components/TypographyShowcase';
import TypographyTable from '../../_components/TypographyTable';
import {
  getTypographyEntriesByGroup,
  typographyAntipatterns,
  typographyCssTokenRows,
  typographyFontFamilies,
  typographyLinkClassName,
  typographyOnColorClassName,
  typographyOnErrorClassName,
  typographyOnSuccessClassName,
  typographyOnWarningClassName,
  typographyRoleGroups,
  typographyScaleEntries,
  typographySectionTitleClassName,
  typographySubsectionTitleClassName,
  typographyUsageRules,
  type TypographyScaleEntry,
} from '@kai/ui';

const PAGE_NAV = [
  { id: 'font-families', label: 'Familias' },
  ...typographyRoleGroups.map((g) => ({ id: `group-${g.id}`, label: g.title })),
  { id: 'context-examples', label: 'Ejemplos' },
  { id: 'usage-rules', label: 'Reglas' },
  { id: 'antipatterns', label: 'Antipatrones' },
  { id: 'css-tokens', label: 'Tokens CSS' },
] as const;

function renderScaleSample(entry: TypographyScaleEntry) {
  if (entry.id === 'on-color') {
    return (
      <span className="inline-flex rounded-md bg-primary px-3 py-1">
        <span className={typographyOnColorClassName}>{entry.sample}</span>
      </span>
    );
  }
  if (entry.id === 'on-success') {
    return (
      <span className="inline-flex rounded-md bg-success px-3 py-1">
        <span className={typographyOnSuccessClassName}>{entry.sample}</span>
      </span>
    );
  }
  if (entry.id === 'on-warning') {
    return (
      <span className="inline-flex rounded-md bg-warning px-3 py-1">
        <span className={typographyOnWarningClassName}>{entry.sample}</span>
      </span>
    );
  }
  if (entry.id === 'on-error') {
    return (
      <span className="inline-flex rounded-md bg-error px-3 py-1">
        <span className={typographyOnErrorClassName}>{entry.sample}</span>
      </span>
    );
  }
  if (entry.id === 'link') {
    return (
      <a href="#group-interaction" className={entry.className}>
        {entry.sample}
      </a>
    );
  }
  return <span className={entry.className}>{entry.sample}</span>;
}

export default function DesignSystemTypographyPage() {
  return (
    <div className="space-y-10">
      <DsPageHeader
        kicker="Foundations"
        title="Tipografía"
        description={
          <>
            Fuente base <strong className="font-medium text-foreground">Inter</strong> autohospedada vía{' '}
            <code className="rounded bg-neutral px-1 py-0.5">admin-fonts.ts</code>. Contrato global en{' '}
            <code className="rounded bg-neutral px-1 py-0.5">typographyTokens.ts</code> y{' '}
            <code className="rounded bg-neutral px-1 py-0.5">typographyRules.ts</code> (@kai/ui) — roles por contexto
            ERP, formularios, DataGrid, POS y eShop.
          </>
        }
      />

      <nav className="rounded-lg border border-border bg-neutral/30 p-4" aria-label="Secciones de tipografía">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Saltar a sección</p>
        <ul className="flex flex-wrap gap-2">
          {PAGE_NAV.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className="inline-block rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-neutral/50"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <section id="font-families" className="scroll-mt-6 space-y-4">
        <h2 className={typographySectionTitleClassName}>Familias de fuente</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {typographyFontFamilies.map((family) => (
            <div key={family.id} className="rounded-lg border border-border bg-surface/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{family.label}</p>
              <code className="mt-1 block text-xs text-muted-foreground">{family.token}</code>
              <p className={`mt-3 ${family.sampleClassName}`}>{family.sample}</p>
              <p className="mt-2 text-xs text-muted-foreground">{family.usage}</p>
            </div>
          ))}
        </div>
      </section>

      {typographyRoleGroups.map((group) => {
        const entries = getTypographyEntriesByGroup(typographyScaleEntries, group.id);
        return (
          <section key={group.id} id={`group-${group.id}`} className="scroll-mt-6 space-y-4">
            <div>
              <h2 className={typographySectionTitleClassName}>{group.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>
            </div>
            <TypographyTable entries={entries} renderSample={renderScaleSample} />
          </section>
        );
      })}

      <section id="context-examples" className="scroll-mt-6 space-y-4">
        <div>
          <h2 className={typographySectionTitleClassName}>Ejemplos en contexto</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Bloques compuestos que combinan varios roles — referencia al implementar pantallas reales.
          </p>
        </div>
        <TypographyShowcase />
      </section>

      <section id="usage-rules" className="scroll-mt-6 space-y-4">
        <h2 className={typographySectionTitleClassName}>Reglas globales</h2>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Categoría</th>
                <th className="px-4 py-2">Regla</th>
                <th className="px-4 py-2">Hacer</th>
                <th className="px-4 py-2">Evitar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {typographyUsageRules.map((rule) => (
                <tr key={rule.id}>
                  <td className="px-4 py-3 align-top font-mono text-xs text-muted-foreground">{rule.category}</td>
                  <td className="px-4 py-3 align-top text-foreground">{rule.rule}</td>
                  <td className="px-4 py-3 align-top text-muted-foreground">{rule.do ?? '—'}</td>
                  <td className="px-4 py-3 align-top text-muted-foreground">{rule.dont ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="antipatterns" className="scroll-mt-6 space-y-4">
        <h2 className={typographySectionTitleClassName}>Correcto vs incorrecto</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {typographyAntipatterns.map((item) => (
            <div key={item.id} className="rounded-lg border border-border p-4">
              <p className={typographySubsectionTitleClassName}>{item.id.replace(/-/g, ' ')}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-text-error">Incorrecto</p>
              <p className={`mt-1 ${item.wrongClassName}`}>{item.wrong}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-text-positive">Correcto</p>
              <p className={`mt-1 ${item.rightClassName}`}>{item.right}</p>
              <p className="mt-2 text-sm text-muted-foreground">{item.why}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="css-tokens" className="scroll-mt-6 space-y-4">
        <h2 className={typographySectionTitleClassName}>Tokens CSS</h2>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Token</th>
                <th className="px-4 py-2">Uso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-muted-foreground">
              {typographyCssTokenRows.map((row) => (
                <tr key={row.token}>
                  <td className="px-4 py-2 font-mono text-xs">{row.token}</td>
                  <td className="px-4 py-2">{row.usage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-sm text-muted-foreground">
        Layouts en acción:{' '}
        <Link href="/design-system/patterns/page-layouts" className={typographyLinkClassName}>
          Patrones → Layouts de página
        </Link>
      </p>
    </div>
  );
}
