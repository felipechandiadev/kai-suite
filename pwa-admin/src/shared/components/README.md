# Componentes compartidos — Kai Admin

Los **primitivos UI** viven en [`@kai/ui`](../../../packages/ui). Esta carpeta contiene solo componentes **de dominio** (TopBar, Multimedia, compras, etc.).

Ver [`packages/ui/ADAPTACION.md`](../../../packages/ui/ADAPTACION.md) para la matriz app × componente.

**Imports:** `import { Button, Dialog } from "@kai/ui";`

## Estructura local (dominio)

```
shared/components/
├── TopBar/                     # Barra superior + SideBar
├── Multimedia/                 # Campos y grids multimedia
├── PurchaseDocumentBuilder/    # Compras / recepciones
├── PlannedPaymentLines/        # Planes de pago
├── PrintDocuments/             # Layouts de impresión ERP
├── FileUploader/               # Compat multimedia legacy
├── BaseForm/                   # Formularios auto-generados
├── Calendar/                   # Calendario mensual
├── SplashScreen/               # Pantalla de inicio
├── LocationPicker/             # Mapa / coordenadas
└── StockThresholdField/        # Umbrales de stock
```

> Los ejemplos siguientes usan `@/shared/components` histórico; en código nuevo usar `@kai/ui` para primitivos.

---

## 🎨 Componentes UI Base

### Alert
Componente para mostrar notificaciones.

```tsx
import { Alert } from '@/shared/components';

<Alert variant="success">Operación completada</Alert>
<Alert variant="error">Error al procesar</Alert>
<Alert variant="warning">Advertencia importante</Alert>
<Alert variant="info">Información</Alert>
```

**Props:**
- `variant`: `"success" | "info" | "warning" | "error"` (default: `"info"`)
- `children`: Contenido de la alerta
- `className`: Clases Tailwind adicionales

---

### Button & ButtonPill
Botones con múltiples variantes y tamaños.

```tsx
import { Button, ButtonPill } from '@/shared/components';

<Button variant="primary" size="md">Guardar</Button>
<Button variant="secondary">Cancelar</Button>
<Button variant="outlined">Editar</Button>
<Button variant="danger">Eliminar</Button>
<Button variant="text">Más opciones</Button>

<ButtonPill>Badge button</ButtonPill>
```

**Props:**
- `variant`: `"primary" | "secondary" | "outlined" | "outlinedSecondary" | "text" | "danger"`
- `size`: `"sm" | "md" | "lg"` (default: `"md"`)
- `loading`: Mostrar estado de carga
- `disabled`: Desactivar botón
- `className`: Clases adicionales

---

### Card
Contenedor base reutilizable.

```tsx
import { Card } from '@/shared/components';

<Card>
  <div className="p-4">
    <h3>Contenido</h3>
  </div>
</Card>
```

**Props:**
- `children`: Contenido
- `className`: Clases adicionales
- `onClick`: Callback al hacer clic

---

### TextField
Campo de texto avanzado con soporte para tipos especiales.

**Inicio del campo:** use `startSymbol` para un carácter o texto muy corto (cadena), o `startAdornment` para un nodo React (icono Lucide, etc.). Ambos comparten el mismo padding izquierdo (`pl-10`). Si envía `startSymbol` y `startAdornment`, solo se muestra el símbolo. Al final, `endSymbol` funciona igual que `startSymbol` pero a la derecha.

```tsx
import { TextField } from '@/shared/components';

// Texto normal
<TextField
  label="Nombre"
  value={name}
  onChange={(e) => setName(e.target.value)}
/>

// Email
<TextField type="email" label="Correo" value={email} onChange={handleChange} />

// Moneda
<TextField
  type="currency"
  label="Monto"
  currencySymbol="$"
  value={amount}
  onChange={handleChange}
/>

// Teléfono
<TextField
  type="tel"
  label="Teléfono"
  phonePrefix="+56"
  value={phone}
  onChange={handleChange}
/>

// Contraseña con toggle
<TextField
  type="password"
  label="Contraseña"
  passwordVisibilityToggle={true}
  value={password}
  onChange={handleChange}
/>

// Textarea
<TextField
  label="Descripción"
  rows={4}
  value={description}
  onChange={handleChange}
/>
```

**Props:**
- `label`: Etiqueta
- `value`: Valor actual
- `onChange`: Callback de cambio
- `type`: Tipo de campo (text, email, password, number, date, tel, etc.)
- `placeholder`: Placeholder
- `required`: Campo requerido
- `disabled`: Desactivado
- `startSymbol` / `endSymbol`: carácter o símbolo corto (cadena) al inicio o al final.
- `startAdornment`: nodo React al inicio (p. ej. icono Lucide); mismo espacio y padding que `startSymbol`. Si se pasan ambos, prevalece `startSymbol`.
- `currencySymbol`: Símbolo de moneda
- `phonePrefix`: Prefijo de teléfono
- `passwordVisibilityToggle`: Mostrar/ocultar contraseña

---

### Badge
Etiqueta pequeña.

```tsx
import { Badge } from '@/shared/components';

<Badge>Nueva</Badge>
<Badge variant="success">Aprobado</Badge>
```

---

### Switch
Interruptor on/off.

```tsx
import { Switch } from '@/shared/components';

<Switch
  label="Activar notificaciones"
  checked={enabled}
  onChange={(checked) => setEnabled(checked)}
/>
```

---

### Tabs
Pestañas con contenido.

```tsx
import { Tabs } from '@/shared/components';

<Tabs
  tabs={[
    { label: 'Información', content: <InfoPanel /> },
    { label: 'Historial', content: <HistoryPanel /> },
    { label: 'Configuración', content: <SettingsPanel /> }
  ]}
/>
```

---

### IconButton
Botón con icono.

```tsx
import { IconButton } from '@/shared/components';

<IconButton icon="trash" onClick={handleDelete} />
<IconButton icon="edit" variant="primary" />
```

---

## 🔽 Selectores

### Select
Selector de opciones.

```tsx
import { Select } from '@/shared/components';

<Select
  label="País"
  options={[
    { id: 'cl', label: 'Chile' },
    { id: 'co', label: 'Colombia' }
  ]}
  value={country}
  onChange={(id) => setCountry(id)}
/>
```

---

### AutoComplete
Autocompletador.

```tsx
import { AutoComplete } from '@/shared/components';

<AutoComplete
  label="Cliente"
  options={customers}
  value={selectedCustomer}
  onChange={(option) => setSelectedCustomer(option)}
/>
```

---

### DropdownList
Dropdown simple.

```tsx
import { DropdownList } from '@/shared/components';

<DropdownList
  label="Acciones"
  options={[
    { id: 'edit', label: 'Editar' },
    { id: 'delete', label: 'Eliminar' }
  ]}
/>
```

---

## 📊 Componentes de Datos

### DataGrid
Tabla avanzada con paginación, búsqueda y acciones.

```tsx
import { DataGrid, RowActions } from '@/shared/components';

const columns = [
  { key: 'id', label: 'ID', width: '80px' },
  { key: 'name', label: 'Nombre', width: '200px' },
  { key: 'email', label: 'Email', width: '250px' },
  { key: 'status', label: 'Estado' }
];

<DataGrid
  columns={columns}
  data={users}
  onRowClick={(row) => navigateToDetail(row.id)}
  selectable={true}
/>
```

---

## 🪟 Diálogos

### Dialog
Modal genérico.

```tsx
import { Dialog } from '@/shared/components';

<Dialog
  open={open}
  onClose={() => setOpen(false)}
  title="Confirmar"
>
  <p>¿Deseas continuar?</p>
  <Button onClick={handleConfirm}>Aceptar</Button>
</Dialog>
```

---

### PrintDialog
Diálogo de impresión.

```tsx
import { PrintDialog } from '@/shared/components';

<PrintDialog
  open={showPrint}
  content={reportContent}
  title="Reporte de Ventas"
/>
```

---

## 🎛️ Controles Especializados

### RangeSlider
Selector de rango.

```tsx
import { RangeSlider } from '@/shared/components';

<RangeSlider
  min={0}
  max={1000}
  value={range}
  onChange={(newRange) => setRange(newRange)}
/>
```

---

### NumberStepper
Incrementador/Decrementador.

```tsx
import { NumberStepper } from '@/shared/components';

<NumberStepper
  value={quantity}
  min={1}
  max={10}
  onChange={(val) => setQuantity(val)}
/>
```

---

### Stepper
Chrome visual para asistentes multi-paso: puntos de estado (activo / completado / pendiente), título y descripción del paso actual, ranura `children` para el formulario y `footer` opcional para botones. La navegación la controla el padre.

Si el Stepper está **dentro de un `Dialog`**, conviene dejar `footer` vacío y poner **Atrás / Siguiente** (y Guardar) en `Dialog.actions`, con `justify-between`: Cancelar a un lado y el grupo de navegación al otro — patrón usado en **Ventas → Promociones → editor**.

```tsx
import { Stepper } from '@/shared/components';

<Stepper
  steps={[
    { id: '1', title: 'Tipo', description: 'Elige una opción.' },
    { id: '2', title: 'Detalle', description: 'Completa los datos.' },
  ]}
  activeIndex={step}
  allowClickCompletedSteps
  onCompletedStepClick={setStep}
  footer={<div>...</div>}
>
  {stepContent}
</Stepper>
```

---

### LocationPicker
Selector de ubicación.

```tsx
import { LocationPickerWrapper } from '@/shared/components';

<LocationPickerWrapper
  value={location}
  onChange={(lat, lng) => setLocation({ lat, lng })}
/>
```

---

## 📤 Carga de Archivos

### FileUploader
Cargador de archivos general.

```tsx
import { FileUploader } from '@/shared/components';

<FileUploader
  accept=".pdf,.doc,.docx"
  maxSize={10485760}
  onUpload={(files) => handleUpload(files)}
/>
```

---

### MultimediaUploader
Cargador de imágenes y videos.

```tsx
import { MultimediaUploader } from '@/shared/components';

<MultimediaUploader
  type="image"
  multiple={true}
  onUpload={(files) => handleUpload(files)}
/>
```

---

## 📈 Indicadores

### DotProgress
Indicador de progreso con puntos.

```tsx
import { DotProgress } from '@/shared/components';

<DotProgress current={2} total={5} />
```

---

### SplashScreen
Pantalla de inicio.

```tsx
import { SplashScreen } from '@/shared/components';

<SplashScreen loading={isLoading} />
```

---

## 📐 Layout

### TopBar
Barra superior con logo y menú.

```tsx
import { TopBar } from '@/shared/components';

<TopBar title="Dashboard" showMenu={true} />
```

---

## 📋 Formularios Auto-generados

### CreateBaseForm
Formulario auto-generado para crear registros.

```tsx
import { CreateBaseForm } from '@/shared/components';

const fields = [
  { name: 'name', label: 'Nombre', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { 
    name: 'role', 
    label: 'Rol', 
    type: 'select',
    options: [
      { id: 'admin', label: 'Admin' },
      { id: 'user', label: 'Usuario' }
    ]
  }
];

<CreateBaseForm
  fields={fields}
  onSubmit={(data) => saveUser(data)}
  title="Nuevo Usuario"
/>
```

---

### UpdateBaseForm
Formulario para editar registros.

```tsx
import { UpdateBaseForm } from '@/shared/components';

<UpdateBaseForm
  initialData={user}
  fields={fields}
  onSubmit={(data) => updateUser(data)}
  title="Editar Usuario"
/>
```

---

### DeleteBaseForm
Formulario para confirmar eliminación.

```tsx
import { DeleteBaseForm } from '@/shared/components';

<DeleteBaseForm
  itemName="Usuario"
  onConfirm={() => deleteUser(id)}
  onCancel={() => setShowDelete(false)}
/>
```

---

## 🎯 Mejores Prácticas

### 1. **Importación Centralizada**
```tsx
// ✅ Bien - Una importación
import { Button, Card, StatisticsCard, Alert } from '@/shared/components';

// ❌ Evitar - Importación individual
import Button from '@/shared/components/Button';
import { Card, StatisticsCard } from '@/shared/components/Cards';
```

### 2. **Tipado Completo**
```tsx
// ✅ Con tipos
import { BaseFormField } from '@/shared/components';

const fields: BaseFormField[] = [
  { name: 'email', label: 'Email', type: 'email' }
];

// ❌ Sin tipos
const fields = [{ name: 'email', label: 'Email' }];
```

### 3. **Propiedades por Defecto**
Todos los componentes tienen valores por defecto sensatos. Personaliza solo cuando sea necesario:

```tsx
// ✅ Bien - Valores por defecto
<Button>Guardar</Button>
<Button variant="secondary">Cancelar</Button>

// ❌ Innecesario
<Button variant="primary" size="md" disabled={false}>Guardar</Button>
```

### 4. **Callbacks Tipados**
```tsx
// ✅ Con tipos
const handleChange = (value: string) => setName(value);
<TextField value={name} onChange={(e) => handleChange(e.target.value)} />

// ❌ Sin tipos
const handleChange = (e) => setName(e.target.value);
```

---

## 🚀 Uso en Features

Ejemplo de integración en una feature:

```
features/
└── users/
    ├── actions/
    ├── application/
    ├── domain/
    ├── infrastructure/
    ├── components/
    │   ├── UserForm.tsx          # Usa BaseForm + componentes compartidos
    │   ├── UserGrid.tsx          # Usa DataGrid
    │   └── UserActions.tsx       # Usa Button, Dialog
    ├── hooks/
    └── types/
```

**Archivo: `features/users/components/UserForm.tsx`**
```tsx
'use client';

import {
  CreateBaseForm,
  UpdateBaseForm,
  Card,
  Alert,
  Button,
  BaseFormField
} from '@/shared/components';

const fields: BaseFormField[] = [
  { name: 'name', label: 'Nombre', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  {
    name: 'role',
    label: 'Rol',
    type: 'select',
    options: [
      { id: 'admin', label: 'Administrador' },
      { id: 'editor', label: 'Editor' }
    ]
  }
];

export function UserForm({ mode, initialData, onSubmit }) {
  if (mode === 'create') {
    return (
      <CreateBaseForm
        fields={fields}
        onSubmit={onSubmit}
        title="Nuevo Usuario"
      />
    );
  }

  return (
    <UpdateBaseForm
      initialData={initialData}
      fields={fields}
      onSubmit={onSubmit}
      title="Editar Usuario"
    />
  );
}
```

---

## 📦 Exportaciones Disponibles

```tsx
import {
  // UI Base
  Alert,
  Button,
  ButtonPill,
  Card,
  TextField,
  Badge,
  Switch,
  Tabs,
  IconButton,

  // Selectores
  Select,
  AutoComplete,
  DropdownList,

  // Datos
  DataGrid,
  RowActions,

  // Diálogos
  Dialog,
  PrintDialog,

  // Controles
  RangeSlider,
  NumberStepper,
  Stepper,
  LocationPickerWrapper,

  // Archivos
  FileUploader,
  MultimediaUploader,

  // Indicadores
  DotProgress,
  SplashScreen,

  // Layout
  TopBar,

  // Formularios
  CreateBaseForm,
  UpdateBaseForm,
  DeleteBaseForm,

  // Tipos
  type BaseFormField,
  type DataGridColumn,
  type DataGridProps
} from '@/shared/components';
```

---

## 🔧 Personalización

Todos los componentes aceptan `className` para personalización con Tailwind:

```tsx
<Button className="rounded-full text-lg">Personalizado</Button>
<Card className="shadow-lg border-2 border-blue-500">Contenido</Card>
<TextField className="bg-gray-50" />
```

---

## 📱 Responsive

Los componentes incluyen clases responsive de Tailwind:

```tsx
<Card className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  {items.map(item => <ItemCard key={item.id} item={item} />)}
</Card>
```

---

## ✨ Próximas Mejoras

- [x] Stepper para flujos paso a paso (`Stepper/`, demo en `/design-system/components/stepper`)
- [ ] Tooltip mejorado
- [ ] Autocomplete con búsqueda remota
- [ ] Carga de imágenes con preview
- [ ] Temas personalizables (light/dark)
