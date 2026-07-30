'use client';

import { useState } from 'react';
import { SelectDefault as Select } from '@kai/ui';

export default function SelectPage() {
  const [selectedValue1, setSelectedValue1] = useState<string | number | null>(null);
  const [selectedValue2, setSelectedValue2] = useState<string | number | null>(null);
  const [selectedValue3, setSelectedValue3] = useState<string | number | null>(null);
  const [compactStackPurpose, setCompactStackPurpose] = useState<string | number | null>(null);
  const [compactInsetPurpose, setCompactInsetPurpose] = useState<string | number | null>('tickets');
  const [compactInsetPrinter, setCompactInsetPrinter] = useState<string | number | null>(null);
  const [defaultInlineCategory, setDefaultInlineCategory] = useState<string | number | null>('tickets');

  const options = [
    { id: 'option1', label: 'Option 1' },
    { id: 'option2', label: 'Option 2' },
    { id: 'option3', label: 'Option 3' },
    { id: 'option4', label: 'Option 4' },
    { id: 'option5', label: 'Option 5' },
  ];

  const roleOptions = [
    { id: 'admin', label: 'Administrator' },
    { id: 'operator', label: 'Operator' },
    { id: 'viewer', label: 'Viewer' },
    { id: 'guest', label: 'Guest' },
  ];

  const statusOptions = [
    { id: 'active', label: 'Active' },
    { id: 'inactive', label: 'Inactive' },
    { id: 'pending', label: 'Pending' },
    { id: 'archived', label: 'Archived' },
  ];

  const purposeOptions = [
    { id: 'tickets', label: 'Tickets' },
    { id: 'documents', label: 'Documentos' },
    { id: 'labels', label: 'Etiquetas' },
    { id: 'reports', label: 'Informes' },
  ];

  const printerOptions = [
    { id: 'EPSON-TM-T20', label: 'EPSON TM-T20 ★' },
    { id: 'HP-LaserJet', label: 'HP LaserJet' },
    { id: 'PDF-Virtual', label: 'Microsoft Print to PDF' },
  ];

  return (
    <div className="p-8 space-y-12 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold mb-2">Select — casos de uso</h1>
        <p className="text-gray-600">
          Desplegable con label flotante (default), compact stack e inline{" "}
          (<strong className="font-medium text-foreground">CompactInsetField</strong> compartido con TextField).
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Default — label flotante</h2>
        <Select
          label="Choose an option"
          options={options}
          value={selectedValue1}
          onChange={setSelectedValue1}
        />
        {selectedValue1 != null && selectedValue1 !== '' ? (
          <p className="text-sm text-gray-600">
            Selected: <span className="font-semibold">{String(selectedValue1)}</span>
          </p>
        ) : null}
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Compact — label arriba (stack)</h2>
        <p className="text-sm text-muted-foreground">
          <code className="rounded bg-muted/50 px-1 text-xs">density=&quot;compact&quot;</code> +{" "}
          <code className="rounded bg-muted/50 px-1 text-xs">labelLayout=&quot;stack&quot;</code>: etiqueta encima del combo (~2rem).
        </p>
        <Select
          label="Propósito"
          placeholder="Seleccionar"
          density="compact"
          labelLayout="stack"
          options={purposeOptions}
          value={compactStackPurpose}
          onChange={setCompactStackPurpose}
          name="select-compact-stack"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">CompactInsetField — label inline</h2>
        <p className="text-sm text-muted-foreground">
          <code className="rounded bg-muted/50 px-1 text-xs">density=&quot;compact&quot;</code> +{" "}
          <code className="rounded bg-muted/50 px-1 text-xs">labelLayout=&quot;inline&quot;</code>: label dentro del borde,
          IconButton de despliegue alineado a la derecha (mismo criterio que KaiPrinters).
        </p>
        <div className="space-y-3">
          <Select
            label="Propósito"
            placeholder="Seleccionar"
            density="compact"
            labelLayout="inline"
            options={purposeOptions}
            value={compactInsetPurpose}
            onChange={setCompactInsetPurpose}
            name="select-compact-inset-purpose"
          />
          <Select
            label="Impresora del SO"
            placeholder="Seleccionar"
            density="compact"
            labelLayout="inline"
            required
            options={printerOptions}
            value={compactInsetPrinter}
            onChange={setCompactInsetPrinter}
            name="select-compact-inset-printer"
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Default — label inline (altura estándar)</h2>
        <p className="text-sm text-muted-foreground">
          <code className="rounded bg-muted/50 px-1 text-xs">labelLayout=&quot;inline&quot;</code> sin{" "}
          <code className="rounded bg-muted/50 px-1 text-xs">density=&quot;compact&quot;</code>: misma altura que
          TextField default (~2.75rem).
        </p>
        <Select
          label="Categoría"
          placeholder="Todas"
          labelLayout="inline"
          options={purposeOptions}
          value={defaultInlineCategory}
          onChange={setDefaultInlineCategory}
          name="select-default-inline-category"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Role Selection</h2>
        <Select
          label="Select a role"
          options={roleOptions}
          value={selectedValue2}
          onChange={setSelectedValue2}
        />
        {selectedValue2 != null && selectedValue2 !== '' ? (
          <p className="text-sm text-gray-600">
            Role: <span className="font-semibold capitalize">{String(selectedValue2)}</span>
          </p>
        ) : null}
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Status Selection</h2>
        <Select
          label="Select status"
          options={statusOptions}
          value={selectedValue3}
          onChange={setSelectedValue3}
        />
      </section>

      <section className="border rounded-lg p-6 bg-gray-50 space-y-6">
        <h2 className="text-2xl font-semibold">Form group — default</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select
            label="Role"
            options={roleOptions}
            value={selectedValue2}
            onChange={setSelectedValue2}
          />
          <Select
            label="Status"
            options={statusOptions}
            value={selectedValue3}
            onChange={setSelectedValue3}
          />
        </div>
      </section>
    </div>
  );
}
