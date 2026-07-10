'use client';

import { useState } from 'react';
import {
  Button,
  ButtonGroup,
  ButtonGroupItem,
  ButtonGroupToggle,
} from '@kai/ui';

export default function ButtonPage() {
  const [clickCount, setClickCount] = useState(0);
  const [viewMode, setViewMode] = useState('list');
  const [align, setAlign] = useState('left');

  return (
    <div className="space-y-12 p-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold">Button Component Showcase</h1>
        <p className="text-gray-600">Testing different button variants and states</p>
      </div>

      {/* Variants */}
      <div>
        <h2 className="mb-4 text-2xl font-semibold">Variants</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <p className="text-sm font-medium">Primary (relleno)</p>
            <Button variant="primary">Primary</Button>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Outlined</p>
            <Button variant="outlined">Outlined</Button>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Text</p>
            <Button variant="text">Text</Button>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Disabled</p>
            <Button disabled>Disabled</Button>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Loading</p>
            <Button loading>Loading</Button>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Full Width</p>
            <Button className="w-full">Full Width</Button>
          </div>
        </div>
      </div>

      {/* Button group */}
      <div>
        <h2 className="mb-4 text-2xl font-semibold">Button group</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Botones unidos (segmented control). Usa <code className="rounded bg-muted px-1">ButtonGroup</code>,{' '}
          <code className="rounded bg-muted px-1">ButtonGroupItem</code> o{' '}
          <code className="rounded bg-muted px-1">ButtonGroupToggle</code> para selección única.
        </p>
        <div className="flex flex-col gap-6">
          <div className="space-y-2">
            <p className="text-sm font-medium">Toggle (vista)</p>
            <ButtonGroupToggle
              aria-label="Modo de vista"
              value={viewMode}
              onChange={setViewMode}
              options={[
                { id: 'list', label: 'Lista' },
                { id: 'grid', label: 'Grilla' },
                { id: 'map', label: 'Mapa' },
              ]}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Toggle compact (alineación)</p>
            <ButtonGroupToggle
              aria-label="Alineación compacta"
              value={align}
              onChange={setAlign}
              density="compact"
              options={[
                { id: 'left', label: 'Izquierda' },
                { id: 'center', label: 'Centro' },
                { id: 'right', label: 'Derecha' },
              ]}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Grupo manual compact</p>
            <ButtonGroup density="compact" aria-label="Acciones compactas">
              <ButtonGroupItem type="button">Copiar</ButtonGroupItem>
              <ButtonGroupItem type="button">Imprimir</ButtonGroupItem>
              <ButtonGroupItem type="button" variant="danger">
                Eliminar
              </ButtonGroupItem>
            </ButtonGroup>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Grupo manual (acciones)</p>
            <ButtonGroup aria-label="Acciones de documento">
              <ButtonGroupItem type="button">Copiar</ButtonGroupItem>
              <ButtonGroupItem type="button">Imprimir</ButtonGroupItem>
              <ButtonGroupItem type="button" variant="danger">
                Eliminar
              </ButtonGroupItem>
            </ButtonGroup>
          </div>
        </div>
      </div>

      {/* Colors */}
      <div>
        <h2 className="mb-4 text-2xl font-semibold">Colors</h2>
        <div className="flex flex-wrap gap-4">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outlined">Outlined</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="outlinedSecondary">Outlined secondary</Button>
        </div>
      </div>

      {/* Sizes */}
      <div>
        <h2 className="mb-4 text-2xl font-semibold">Sizes</h2>
        <div className="flex flex-wrap items-center gap-4">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </div>

      {/* Interactive Example */}
      <div>
        <h2 className="mb-4 text-2xl font-semibold">Interactive Example</h2>
        <div className="space-y-4">
          <p className="text-lg">
            Click count: <span className="font-bold text-primary">{clickCount}</span>
          </p>
          <Button onClick={() => setClickCount(clickCount + 1)} variant="primary">
            Click Me! ({clickCount})
          </Button>
          <Button onClick={() => setClickCount(0)} variant="outlined">
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}
