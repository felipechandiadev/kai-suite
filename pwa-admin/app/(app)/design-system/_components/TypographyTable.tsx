import type { ReactNode } from 'react';
import type { TypographyScaleEntry } from '@kai/ui';

type TypographyTableProps = {
  entries: TypographyScaleEntry[];
  renderSample?: (entry: TypographyScaleEntry) => ReactNode;
};

export default function TypographyTable({ entries, renderSample }: TypographyTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-neutral text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-2">Rol</th>
            <th className="px-4 py-2">Muestra</th>
            <th className="px-4 py-2">Cuándo usar</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {entries.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3 align-top">
                <p className="font-medium text-foreground">{row.name}</p>
                <code className="mt-1 block max-w-xs break-all text-xs text-muted-foreground">{row.className}</code>
              </td>
              <td className="px-4 py-3 align-top">
                {renderSample ? renderSample(row) : <span className={row.className}>{row.sample}</span>}
              </td>
              <td className="px-4 py-3 align-top text-muted-foreground">{row.usage}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
