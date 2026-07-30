'use client';

import { useState } from 'react';
import { Mail, Search } from 'lucide-react';
import { TextField } from '@kai/ui';
import { IconButton } from '@kai/ui';
import { Switch } from '@kai/ui';
import { Card } from '@kai/ui';
import { Dialog } from '@kai/ui';
import { Button } from '@kai/ui';

export default function TextFieldPage() {
  const [texto, setTexto] = useState('');
  const [conPlaceholder, setConPlaceholder] = useState('');
  const [requerido, setRequerido] = useState('');
  const [deshabilitado, setDeshabilitado] = useState('No editable');
  const [soloLectura, setSoloLectura] = useState('Solo lectura');
  const [password, setPassword] = useState('secreto');
  const [email, setEmail] = useState('');
  const [numero, setNumero] = useState('42');
  const [dni, setDni] = useState('');
  const [moneda, setMoneda] = useState('1500000');
  const [monedaDecimal, setMonedaDecimal] = useState('1234,5');
  const [telefono, setTelefono] = useState('+56');
  const [anio, setAnio] = useState('2020');
  const [notas, setNotas] = useState('');
  const [normal, setNormal] = useState('Variante normal');
  const [contrast, setContrast] = useState('Sobre fondo primary');
  const [autocomplete, setAutocomplete] = useState('Búsqueda');
  const [demoEndSymbol, setDemoEndSymbol] = useState('');
  const [codigo, setCodigo] = useState('');
  const [adornmentSearchDemo, setAdornmentSearchDemo] = useState('');
  const [adornmentEmailDemo, setAdornmentEmailDemo] = useState('');
  const [compactStackAlias, setCompactStackAlias] = useState('Tickets caja 1');
  const [compactInsetAlias, setCompactInsetAlias] = useState('Tickets caja 1');
  const [compactInsetLogoEnabled, setCompactInsetLogoEnabled] = useState(true);
  const [compactInsetLogoFile, setCompactInsetLogoFile] = useState('logo-tickets.png');
  const [clienteSeleccionado, setClienteSeleccionado] = useState('');
  const [buscadorClienteOpen, setBuscadorClienteOpen] = useState(false);
  const [enlaceVenta, setEnlaceVenta] = useState('https://kai.app/venta/VTA2600016');
  const [enlaceCopiado, setEnlaceCopiado] = useState(false);

  const clientesDemo = [
    'Ana Pérez',
    'Comercial Los Andes SpA',
    'Distribuidora Sur Ltda.',
    'Juan Soto',
  ];

  return (
    <div className="p-8 space-y-12 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold mb-2">TextField — casos de uso</h1>
        <p className="text-gray-600">
          Ejemplos interactivos del input con etiqueta flotante, formatos (RUT, moneda, teléfono),
          <code className="mx-1 rounded bg-muted/50 px-1 text-xs">startSymbol</code>/
          <code className="rounded bg-muted/50 px-1 text-xs">endSymbol</code> (cadenas),{" "}
          <code className="rounded bg-muted/50 px-1 text-xs">startAdornment</code> /{" "}
          <code className="rounded bg-muted/50 px-1 text-xs">endAdornment</code>, variantes y patrón{" "}
          <strong className="font-medium text-foreground">CompactInsetField</strong>.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Texto básico</h2>
        <TextField
          label="Nombre"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Ej: Ana Pérez"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">selectOnFocus</h2>
        <p className="text-sm text-muted-foreground">
          Al enfocar (Tab o primer clic) se selecciona todo el texto para reemplazarlo rápido. Si el campo ya tenía foco,
          un clic coloca el cursor donde corresponda. Con <code className="rounded bg-muted/50 px-1">type=&quot;number&quot;</code>{" "}
          el control se renderiza como texto con teclado numérico para que la selección funcione en todos los navegadores.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Cantidad"
            type="number"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            selectOnFocus
            min={0}
          />
          <TextField
            label="Código"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            startSymbol="#"
            selectOnFocus
            placeholder="Tab o clic para seleccionar todo"
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Placeholder distinto al label</h2>
        <TextField
          label="Búsqueda"
          value={conPlaceholder}
          onChange={(e) => setConPlaceholder(e.target.value)}
          placeholder="Escribe para filtrar…"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Requerido</h2>
        <TextField
          label="Correo corporativo"
          required
          value={requerido}
          onChange={(e) => setRequerido(e.target.value)}
          type="email"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Deshabilitado y solo lectura</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Deshabilitado"
            value={deshabilitado}
            onChange={(e) => setDeshabilitado(e.target.value)}
            disabled
          />
          <TextField
            label="Solo lectura"
            value={soloLectura}
            onChange={(e) => setSoloLectura(e.target.value)}
            readOnly
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Contraseña (toggle de visibilidad)</h2>
        <TextField
          label="Contraseña"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Email y número</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            label="Stock"
            type="number"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            min={0}
            max={9999}
            step={1}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">DNI / RUT (formateo chileno)</h2>
        <TextField
          label="RUT o DNI"
          type="dni"
          name="dni"
          value={dni}
          onChange={(e) => setDni(e.target.value)}
          placeholder="12.345.678-9"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Moneda (CLP)</h2>
        <TextField
          label="Precio de lista"
          type="currency"
          value={moneda}
          onChange={(e) => setMoneda(e.target.value)}
          currencySymbol="$"
          startSymbol="$"
        />
        <p className="text-sm text-gray-500">
          El símbolo va en <code className="rounded bg-muted/50 px-1 text-xs">startSymbol</code>; el valor formateado solo
          muestra dígitos con separadores es-CL. <code className="rounded bg-muted/50 px-1 text-xs">currencySymbol</code>{" "}
          sigue usándose para parsear lo que el usuario pega o escribe.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Moneda con decimales (coma)</h2>
        <TextField
          label="Monto con centavos"
          type="currency"
          value={monedaDecimal}
          onChange={(e) => setMonedaDecimal(e.target.value)}
          currencySymbol="€"
          startSymbol="€"
          allowDecimalComma
        />
        <p className="text-sm text-gray-500">
          Mismo patrón: <code className="rounded bg-muted/50 px-1 text-xs">startSymbol=&quot;€&quot;</code> y número con coma
          decimal en el área de texto.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Teléfono con prefijo</h2>
        <TextField
          label="Celular"
          type="tel"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          phonePrefix="+56"
          startSymbol="+56"
        />
        <p className="text-sm text-gray-500">
          <code className="rounded bg-muted/50 px-1 text-xs">startSymbol</code> muestra el prefijo; el valor sigue
          almacenando <code className="rounded bg-muted/50 px-1 text-xs">+56</code> + dígitos y el campo solo formatea la
          parte nacional con espacios.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Año (datePicker interno: número 1800—actual)</h2>
        <TextField
          label="Año de fabricación"
          type="datePicker"
          value={anio}
          onChange={(e) => setAnio(e.target.value)}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Textarea (varias líneas)</h2>
        <TextField
          label="Notas"
          type="textarea"
          rows={4}
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Detalle opcional…"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Símbolos al inicio y al final (cadena)</h2>
        <p className="text-sm text-muted-foreground">
          <code className="rounded bg-muted/50 px-1">startSymbol</code> y{" "}
          <code className="rounded bg-muted/50 px-1">endSymbol</code> son texto corto en la misma caja que el input (p.
          ej. <code className="rounded bg-muted/50 px-1">#</code>, moneda o ✓). Para iconos SVG use{" "}
          <code className="rounded bg-muted/50 px-1">startAdornment</code> (ver siguiente bloque).
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Código (sin selectOnFocus)"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            startSymbol="#"
            placeholder="Edición normal con clic"
            className="w-full"
          />
          <TextField
            label="Etiqueta final"
            value={demoEndSymbol}
            onChange={(e) => setDemoEndSymbol(e.target.value)}
            endSymbol="✓"
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">startAdornment (mismo hueco que startSymbol)</h2>
        <p className="text-sm text-muted-foreground">
          El padding izquierdo del campo es el mismo con símbolo (cadena) o con adorno (React). Si se pasan ambos, solo se
          muestra <code className="rounded bg-muted/50 px-1">startSymbol</code>.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Búsqueda con adorno"
            value={adornmentSearchDemo}
            onChange={(e) => setAdornmentSearchDemo(e.target.value)}
            placeholder="Filtrar…"
            startAdornment={<Search className="h-4 w-4" aria-hidden />}
          />
          <TextField
            label="Correo con adorno"
            value={adornmentEmailDemo}
            onChange={(e) => setAdornmentEmailDemo(e.target.value)}
            type="email"
            startAdornment={<Mail className="h-4 w-4" aria-hidden />}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">endAdornment como botón que abre un diálogo</h2>
        <p className="text-sm text-muted-foreground">
          El <code className="rounded bg-muted/50 px-1 text-xs">endAdornment</code> admite cualquier nodo React, incluido un{" "}
          <code className="rounded bg-muted/50 px-1 text-xs">IconButton</code> con un{" "}
          <code className="rounded bg-muted/50 px-1 text-xs">onClick</code> que ejecute acciones (abrir un buscador,
          seleccionar en un modal, etc.). Aquí el botón abre un diálogo y el valor elegido se escribe en el campo. Se usa{" "}
          <code className="rounded bg-muted/50 px-1 text-xs">readOnly</code> para que el valor solo se defina desde el diálogo.
        </p>
        <TextField
          label="Cliente"
          value={clienteSeleccionado}
          onChange={(e) => setClienteSeleccionado(e.target.value)}
          readOnly
          placeholder="Selecciona un cliente…"
          endAdornment={
            <IconButton
              icon="Search"
              variant="action"
              size="sm"
              ariaLabel="Buscar cliente"
              tabIndex={-1}
              onClick={() => setBuscadorClienteOpen(true)}
            />
          }
        />
        <Dialog
          open={buscadorClienteOpen}
          onClose={() => setBuscadorClienteOpen(false)}
          title="Buscar cliente"
          size="sm"
          showCloseButton
          actions={
            <Button variant="outlined" size="sm" onClick={() => setBuscadorClienteOpen(false)}>
              Cancelar
            </Button>
          }
          actionsJustify="end"
        >
          <ul className="divide-y divide-border/70">
            {clientesDemo.map((cliente) => (
              <li key={cliente}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-1 py-2.5 text-left text-sm text-foreground hover:text-primary"
                  onClick={() => {
                    setClienteSeleccionado(cliente);
                    setBuscadorClienteOpen(false);
                  }}
                >
                  <span>{cliente}</span>
                  <Search className="h-4 w-4 opacity-40" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </Dialog>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">endAdornment con hasta 3 botones de acción</h2>
        <p className="text-sm text-muted-foreground">
          El <code className="rounded bg-muted/50 px-1 text-xs">endAdornment</code> acepta varios{" "}
          <code className="rounded bg-muted/50 px-1 text-xs">IconButton</code> dentro de un fragmento. Aquí un campo de
          enlace con tres acciones: <strong className="font-medium text-foreground">copiar</strong>,{" "}
          <strong className="font-medium text-foreground">abrir</strong> y{" "}
          <strong className="font-medium text-foreground">limpiar</strong>. Usa{" "}
          <code className="rounded bg-muted/50 px-1 text-xs">size=&quot;xs&quot;</code> y{" "}
          <code className="rounded bg-muted/50 px-1 text-xs">{"tabIndex={-1}"}</code> para que no interfieran con la edición.
        </p>
        <TextField
          label="Enlace de la venta"
          value={enlaceVenta}
          onChange={(e) => {
            setEnlaceVenta(e.target.value);
            setEnlaceCopiado(false);
          }}
          placeholder="https://…"
          endAdornment={
            <>
              <IconButton
                icon={enlaceCopiado ? 'Check' : 'Copy'}
                variant="action"
                size="xs"
                ariaLabel={enlaceCopiado ? 'Enlace copiado' : 'Copiar enlace'}
                tabIndex={-1}
                disabled={!enlaceVenta}
                onClick={() => {
                  navigator.clipboard?.writeText(enlaceVenta);
                  setEnlaceCopiado(true);
                }}
              />
              <IconButton
                icon="ExternalLink"
                variant="action"
                size="xs"
                ariaLabel="Abrir enlace"
                tabIndex={-1}
                disabled={!enlaceVenta}
                onClick={() => window.open(enlaceVenta, '_blank', 'noopener,noreferrer')}
              />
              <IconButton
                icon="X"
                variant="action"
                size="xs"
                ariaLabel="Limpiar enlace"
                tabIndex={-1}
                disabled={!enlaceVenta}
                onClick={() => {
                  setEnlaceVenta('');
                  setEnlaceCopiado(false);
                }}
              />
            </>
          }
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Variantes: normal, contrast, autocomplete</h2>
        <TextField
          label="Normal"
          variante="normal"
          value={normal}
          onChange={(e) => setNormal(e.target.value)}
        />
        <div className="rounded-lg border border-primary/30 bg-primary p-4">
          <TextField
            label="Contrast (texto claro en barra de color)"
            variante="contrast"
            value={contrast}
            onChange={(e) => setContrast(e.target.value)}
          />
        </div>
        <Card>
          <p className="text-sm text-gray-500 mb-3">
            Autocomplete: sin borde, pensado para ir dentro de un contenedor (p. ej. desplegable).
          </p>
          <TextField
            label="Buscar en lista"
            variante="autocomplete"
            value={autocomplete}
            onChange={(e) => setAutocomplete(e.target.value)}
            startAdornment={<Search className="h-4 w-4" aria-hidden />}
          />
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Compact — label arriba (stack)</h2>
        <p className="text-sm text-muted-foreground">
          <code className="rounded bg-muted/50 px-1 text-xs">density=&quot;compact&quot;</code> con{" "}
          <code className="rounded bg-muted/50 px-1 text-xs">labelLayout=&quot;stack&quot;</code> (valor por defecto):
          altura ~2rem y etiqueta encima del control.
        </p>
        <TextField
          label="Alias"
          name="compact-stack-alias"
          density="compact"
          labelLayout="stack"
          placeholder="Ej. Tickets caja 1"
          required
          value={compactStackAlias}
          onChange={(e) => setCompactStackAlias(e.target.value)}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">CompactInsetField — label inline</h2>
        <p className="text-sm text-muted-foreground">
          Patrón <strong className="font-medium text-foreground">CompactInsetField</strong>:{" "}
          <code className="rounded bg-muted/50 px-1 text-xs">density=&quot;compact&quot;</code> +{" "}
          <code className="rounded bg-muted/50 px-1 text-xs">labelLayout=&quot;inline&quot;</code>.
          Label y valor comparten un único borde.
        </p>
        <TextField
          label="Alias"
          name="compact-inset-alias"
          density="compact"
          labelLayout="inline"
          placeholder="Ej. Tickets caja 1"
          required
          value={compactInsetAlias}
          onChange={(e) => setCompactInsetAlias(e.target.value)}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">CompactInsetField — leading + trailing</h2>
        <p className="text-sm text-muted-foreground">
          <code className="rounded bg-muted/50 px-1 text-xs">inlineLeadingAdornment</code> +{" "}
          <code className="rounded bg-muted/50 px-1 text-xs">endAdornment</code> (caso logo en KaiPrinters). Use{" "}
          <code className="rounded bg-muted/50 px-1 text-xs">Switch density=&quot;compact&quot;</code>.
        </p>
        <TextField
          label="Logo"
          name="compact-inset-logo"
          density="compact"
          labelLayout="inline"
          readOnly
          disabled={!compactInsetLogoEnabled}
          placeholder={compactInsetLogoEnabled ? 'Sin logo (PNG/JPG)' : 'Desactivado'}
          value={compactInsetLogoEnabled ? compactInsetLogoFile : ''}
          onChange={() => {}}
          inlineLeadingAdornment={
            <Switch
              density="compact"
              checked={compactInsetLogoEnabled}
              onChange={setCompactInsetLogoEnabled}
              data-test-id="inset-logo-enabled"
            />
          }
          endAdornment={
            <>
              {compactInsetLogoFile ? (
                <IconButton
                  icon="X"
                  variant="action"
                  size="xs"
                  className="min-h-5 min-w-5 p-0"
                  ariaLabel="Quitar logo"
                  tabIndex={-1}
                  disabled={!compactInsetLogoEnabled}
                  onClick={() => setCompactInsetLogoFile('')}
                />
              ) : null}
              <IconButton
                icon="FolderOpen"
                variant="action"
                size="xs"
                className="min-h-5 min-w-5 p-0"
                ariaLabel="Seleccionar imagen"
                tabIndex={-1}
                disabled={!compactInsetLogoEnabled}
                onClick={() => setCompactInsetLogoFile('logo-demo.png')}
              />
            </>
          }
        />
      </section>
    </div>
  );
}
