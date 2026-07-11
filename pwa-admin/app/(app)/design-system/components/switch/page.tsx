'use client';

import { useState } from 'react';
import { Switch } from '@kai/ui';

export default function SwitchPage() {
  const [a, setA] = useState(true);
  const [b, setB] = useState(false);
  const [c, setC] = useState(false);
  const [skuMode, setSkuMode] = useState(false);

  return (
    <div className="space-y-10 p-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold">Switch</h1>
        <p className="text-muted-foreground">
          Toggle binario; etiqueta simple o doble opción (off / on).
        </p>
      </div>

      <div className="max-w-md space-y-8">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Doble etiqueta (optionLabels)</h2>
          <p className="text-sm text-muted-foreground">
            Elige entre dos opciones; círculo primary en ambas posiciones. Clic en la etiqueta o en el switch.
          </p>
          <div className="rounded-lg border border-border p-4">
            <Switch
              optionLabels={{ off: 'Modo código', on: 'Modo SKU' }}
              checked={skuMode}
              onChange={setSkuMode}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Valor actual: <code className="rounded bg-muted px-1">{skuMode ? 'SKU' : 'Código'}</code>
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Compact (TextField inline)</h2>
          <p className="text-sm text-muted-foreground">
            <code className="rounded bg-muted px-1">density=&quot;compact&quot;</code> — mismo tamaño que KaiPrinters /
            CompactInsetField (~2rem de fila).
          </p>
          <div className="flex items-center gap-4 rounded-lg border border-border p-4">
            <Switch density="compact" checked={a} onChange={setA} />
            <Switch density="compact" checked={b} onChange={setB} disabled />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Etiqueta simple</h2>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Label a la izquierda (default)</p>
            <Switch label="Enable notifications" checked={a} onChange={setA} />
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Label a la derecha</p>
            <Switch label="Public profile" labelPosition="right" checked={b} onChange={setB} />
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Deshabilitado (off)</p>
            <Switch label="Locked feature" checked={c} onChange={setC} disabled />
          </div>
        </section>
      </div>
    </div>
  );
}
