'use client';

import { useState } from 'react';
import { Dialog } from '@kai/ui';
import { Button } from '@kai/ui';

/** Tabla de referencia: prop, tipo, default, descripción. */
function DialogPropsReference({
  rows,
}: {
  rows: { prop: string; type: string; default: string; desc: string }[];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[48rem] text-left text-sm">
        <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-600">
          <tr>
            <th className="w-[10rem] px-3 py-2">Prop</th>
            <th className="w-[16rem] px-3 py-2">Type</th>
            <th className="w-[7rem] px-3 py-2">Default</th>
            <th className="px-3 py-2">Función</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={r.prop} className="align-top">
              <td className="px-3 py-2 font-mono text-xs text-primary">{r.prop}</td>
              <td className="px-3 py-2 font-mono text-xs text-gray-600 whitespace-pre-wrap">{r.type}</td>
              <td className="px-3 py-2 font-mono text-xs text-gray-500">{r.default}</td>
              <td className="px-3 py-2 text-gray-700">{r.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const DIALOG_PROPS_ROWS: { prop: string; type: string; default: string; desc: string }[] = [
  {
    prop: 'open',
    type: 'boolean',
    default: '—',
    desc: 'Controla la visibilidad del modal. Sin esto, el diálogo no se muestra.',
  },
  {
    prop: 'onClose',
    type: '() => void',
    default: '—',
    desc: 'Se invoca al cerrar: backdrop, tecla Escape, botón de cerrar del título, etc. (según otras props).',
  },
  {
    prop: 'title',
    type: 'string (opcional)',
    default: 'undefined',
    desc: 'Título en la cabecera. Si no se pasa o es vacío, no se renderiza la fila de título (solo cuerpos/slots).',
  },
  {
    prop: 'children',
    type: 'ReactNode',
    default: '—',
    desc: 'Contenido principal del cuerpo del diálogo (texto, formularios, etc.).',
  },
  {
    prop: 'alertArea',
    type: 'ReactNode (opcional)',
    default: 'undefined',
    desc: 'Bloque hermano del cuerpo y de la fila de `actions` (no forma parte de las acciones). Usar con `Alert`. No hace scroll con `scroll="paper"`.',
  },
  {
    prop: 'size',
    type: "'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'custom'",
    default: "'md'",
    desc: "Ancho según preset interno. Con 'custom' se combina con maxWidth (y minWidth) para afinar el panel.",
  },
  {
    prop: 'customSize',
    type: "Partial<Record<'xs'|'sm'|'md'|'lg'|'xl', number>>",
    default: 'undefined',
    desc: 'Sobrescribe el ancho en px por “breakpoint lógico” (se mezcla con el preset de size).',
  },
  {
    prop: 'maxWidth',
    type: 'number | string',
    default: 'undefined',
    desc: "Cuando size es 'custom', limita el ancho máximo (número = px, o string CSS, p. ej. '90vw').",
  },
  {
    prop: 'fullWidth',
    type: 'boolean',
    default: 'false',
    desc: 'Si true, el contenido horizontal usa ancho completo (con márgenes del contenedor).',
  },
  {
    prop: 'minWidth',
    type: 'number | string',
    default: 'undefined',
    desc: 'Ancho mínimo del panel (número en px o string CSS).',
  },
  {
    prop: 'scroll',
    type: "'body' | 'paper'",
    default: "'body'",
    desc: "body: el overlay hace scroll con la página. paper: el panel con altura máxima y scroll interno en el contenido.",
  },
  {
    prop: 'height',
    type: 'number | string',
    default: 'undefined',
    desc: 'Altura fija del panel (px si es número).',
  },
  {
    prop: 'maxHeight',
    type: 'number | string',
    default: 'undefined',
    desc: 'Altura máxima del panel; útil con scroll en paper o contenidos largos.',
  },
  {
    prop: 'minHeight',
    type: 'number | string',
    default: 'undefined',
    desc: 'Altura mínima del panel.',
  },
  {
    prop: 'animationDuration',
    type: 'number (ms)',
    default: '200',
    desc: 'Duración de la transición al abrir/cerrar (escala y opacidad).',
  },
  {
    prop: 'overflowBehavior',
    type: "'visible' | 'hidden' | 'auto'",
    default: "'auto'",
    desc: 'Comportamiento de overflow en el contenedor de contenido del diálogo.',
  },
  {
    prop: 'zIndex',
    type: 'number',
    default: '50',
    desc: "Orden de apilado del portal del modal; subirlo si otra capa (otro portal) lo tapa.",
  },
  {
    prop: 'disableBackdropClick',
    type: 'boolean',
    default: 'false',
    desc: "Si true, un clic en el fondo (backdrop) no dispara onClose.",
  },
  {
    prop: 'persistent',
    type: 'boolean',
    default: 'false',
    desc: "Si true, no se ciere con Escape ni (según otras reglas) backdrop; forzar cierre con botones propios.",
  },
  {
    prop: 'className',
    type: 'string',
    default: "''",
    desc: "Clases extra en el contenedor del 'paper' (caja blanca) del diálogo.",
  },
  {
    prop: 'contentStyle',
    type: 'CSSProperties',
    default: 'undefined',
    desc: "Estilos en línea en el mismo contenedor; útil para ajustar width/height puntuales.",
  },
  {
    prop: 'actions',
    type: 'ReactNode',
    default: 'undefined',
    desc: "Pie de acciones: fila flex; por defecto justify-between. Pasar un fragment con varios botones o un solo nodo con actionsJustify 'end' para alinear a la derecha.",
  },
  {
    prop: 'hideActions',
    type: 'boolean',
    default: 'false',
    desc: "Oculta el área de acciones aunque se haya pasado 'actions' (p. ej. el pie lo maneja el children).",
  },
  {
    prop: 'actionsJustify',
    type: "'between' | 'start' | 'end' | 'center'",
    default: "'between'",
    desc: "Alineación del pie de 'actions' (map a flex justify-*). 'end' para un solo botón a la derecha.",
  },
  {
    prop: 'showCloseButton',
    type: 'boolean',
    default: 'false',
    desc: "Muestra un botón de cierre outline junto al título (además de onClose).",
  },
  {
    prop: 'closeButtonText',
    type: 'string',
    default: "'cerrar'",
    desc: "Texto de ese botón (si showCloseButton es true).",
  },
  {
    prop: 'onCloseButtonClick',
    type: '() => void (opcional)',
    default: 'undefined',
    desc: "Callback extra al pulsar el botón de cerrar del título; onClose también se dispara según el flujo del componente.",
  },
  {
    prop: 'data-test-id',
    type: 'string (opcional)',
    default: 'undefined',
    desc: "Atributo de pruebas e2e en el contenido del panel (el paper), no en el nodo raíz del portal.",
  },
];

export default function DialogPage() {
  const [isOpen1, setIsOpen1] = useState(false);
  const [isOpen2, setIsOpen2] = useState(false);
  const [isOpen3, setIsOpen3] = useState(false);
  const [isOpen4, setIsOpen4] = useState(false);
  const [dialogResult, setDialogResult] = useState('');

  return (
    <div className="p-8 space-y-12 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dialog Component Showcase</h1>
        <p className="text-gray-600">
          Modal con pie opcional vía <code className="rounded bg-gray-100 px-1.5 py-0.5 text-sm">actions</code> y{' '}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 text-sm">actionsJustify</code>. Abajo, ejemplos; primero, la
          referencia de API alineada con{' '}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 text-sm">src/shared/components/Dialog/Dialog.tsx</code>.
        </p>
      </div>

      <section className="space-y-3" aria-labelledby="dialog-props-title">
        <h2 id="dialog-props-title" className="text-2xl font-semibold text-foreground">
          Todas las props y su función
        </h2>
        <p className="text-sm text-gray-600">
          Con tipo, valor por defecto en el componente (cuando aplica) y qué hace en la UI. Escape cierra salvo que{' '}
          <code className="rounded bg-gray-100 px-1">persistent</code> sea <code className="rounded bg-gray-100 px-1">true</code>
          . Al abrir, el scroll del <code className="rounded bg-gray-100 px-1">body</code> se bloquea.
        </p>
        <DialogPropsReference rows={DIALOG_PROPS_ROWS} />
      </section>

      {/* Basic Dialog — actions prop, two buttons on edges */}
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">
          Basic Dialog — <span className="text-base font-normal text-gray-600">actions (between)</span>
        </h2>
        <p className="text-sm text-gray-500">
          Pass <code className="rounded bg-gray-100 px-1">actions</code> with two sibling elements (e.g. fragment) so
          the footer row uses space-between: secondary left, primary right.
        </p>
        <Button onClick={() => setIsOpen1(true)}>Open Basic Dialog</Button>
        <Dialog
          open={isOpen1}
          onClose={() => setIsOpen1(false)}
          title="Welcome"
          actions={
            <>
              <Button variant="outlined" onClick={() => setIsOpen1(false)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  setIsOpen1(false);
                  setDialogResult('Confirmed basic');
                }}
              >
                Confirm
              </Button>
            </>
          }
        >
          <p className="text-gray-700">
            This dialog uses the <strong>actions</strong> slot for the footer. The container applies{' '}
            <code className="rounded bg-gray-100 px-1">flex</code> and{' '}
            <code className="rounded bg-gray-100 px-1">justify-between</code> by default.
          </p>
        </Dialog>
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">
          Confirmation — <span className="text-base font-normal text-gray-600">actions (between)</span>
        </h2>
        <Button onClick={() => setIsOpen2(true)}>Open Confirmation</Button>
        <Dialog
          open={isOpen2}
          onClose={() => setIsOpen2(false)}
          title="Confirm Action"
          actions={
            <>
              <Button variant="outlined" onClick={() => setIsOpen2(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setIsOpen2(false);
                  setDialogResult('Action confirmed');
                }}
              >
                Delete
              </Button>
            </>
          }
        >
          <p className="text-gray-700">
            Are you sure you want to proceed with this action? This cannot be undone.
          </p>
        </Dialog>
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">
          Info — <span className="text-base font-normal text-gray-600">actions (justify end)</span>
        </h2>
        <p className="text-sm text-gray-500">
          One primary button: set <code className="rounded bg-gray-100 px-1">actionsJustify="end"</code> so it sits on
          the right.
        </p>
        <Button onClick={() => setIsOpen3(true)}>Open Info</Button>
        <Dialog
          open={isOpen3}
          onClose={() => setIsOpen3(false)}
          title="Information"
          actionsJustify="end"
          actions={
            <Button onClick={() => setIsOpen3(false)}>
              OK
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="rounded border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-900">
                <strong>Note:</strong> This is an informational dialog. It displays important information to the user.
              </p>
            </div>
            <p className="text-gray-700">Dialogs are useful for:</p>
            <ul className="list-inside list-disc space-y-1 text-sm text-gray-700">
              <li>Confirming user actions</li>
              <li>Displaying important information</li>
              <li>Collecting user input</li>
              <li>Showing alerts or warnings</li>
            </ul>
          </div>
        </Dialog>
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">
          Buttons only in body (no <code className="text-lg">actions</code>)
        </h2>
        <p className="text-sm text-gray-500">
          You can still place buttons inside <code className="rounded bg-gray-100 px-1">children</code> and control
          layout yourself (e.g. <code className="rounded bg-gray-100 px-1">flex justify-end</code>).
        </p>
        <Button onClick={() => setIsOpen4(true)}>Open dialog (body buttons)</Button>
        <Dialog open={isOpen4} onClose={() => setIsOpen4(false)} title="Custom footer in body">
          <div className="space-y-4">
            <p className="text-gray-700">
              Here the actions live inside the main content, not in the{' '}
              <code className="rounded bg-gray-100 px-1">actions</code> prop.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outlined" onClick={() => setIsOpen4(false)}>
                Dismiss
              </Button>
            </div>
          </div>
        </Dialog>
      </div>

      {dialogResult && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-green-900">
            <strong>Last action:</strong> {dialogResult}
          </p>
        </div>
      )}
    </div>
  );
}
