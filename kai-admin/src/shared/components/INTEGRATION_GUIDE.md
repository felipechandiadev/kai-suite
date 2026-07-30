# Guía de Integración de Componentes Compartidos

Instrucciones paso a paso para integrar componentes en features según la arquitectura Server Actions Only del proyecto.

**Primitivos UI** (`Button`, `Dialog`, `DataGrid`, `TextField`, etc.): importar desde `@kai/ui`.  
**Dominio admin** (`TopBar`, `Multimedia`, `BaseForm`, …): importar desde `@/shared/components/...`.

---

## 🎯 Estructura Recomendada por Feature

```
features/
└── {feature-name}/
    ├── actions/
    │   └── {action-name}.action.ts          # Server Actions
    ├── application/
    │   └── {usecase-name}.usecase.ts        # Lógica de orquestación
    ├── domain/
    │   ├── {entity-name}.entity.ts          # Reglas de negocio
    │   └── {validation-name}.validation.ts  # Validaciones con Zod
    ├── infrastructure/
    │   └── {request-name}.request.ts        # Fetches HTTP
    ├── components/
    │   ├── index.ts                         # Exporta componentes
    │   ├── {Component}Form.tsx              # Usa BaseForm + componentes
    │   ├── {Component}Grid.tsx              # Usa DataGrid
    │   ├── {Component}Dialog.tsx            # Usa Dialog + componentes
    │   └── {Component}Actions.tsx           # Usa Button, IconButton
    ├── hooks/
    │   └── use-{feature}.hook.ts            # Estado local solo
    └── types/
        └── {feature}.types.ts              # Tipos específicos
```

---

## 📝 Ejemplo Práctico: Feature "Products"

### 1. Domain - Validaciones y Reglas

**`features/products/domain/product.entity.ts`**
```typescript
import { z } from 'zod';

export const CreateProductSchema = z.object({
  name: z.string().min(3, 'Mínimo 3 caracteres'),
  description: z.string().optional(),
  price: z.number().positive('Precio debe ser positivo'),
  sku: z.string().min(1, 'SKU requerido'),
  category: z.string().min(1, 'Categoría requerida'),
  stock: z.number().int().min(0, 'Stock no puede ser negativo'),
  active: z.boolean().default(true),
  image: z.string().optional(),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;

export class ProductEntity {
  static validateCreate(data: unknown): CreateProductInput {
    return CreateProductSchema.parse(data);
  }

  static calculateDiscountedPrice(price: number, discount: number): number {
    return price * (1 - discount / 100);
  }
}
```

---

### 2. Infrastructure - Requests HTTP

**`features/products/infrastructure/product.request.ts`**
```typescript
import { authOptions } from '@/lib/auth/auth-options';
import { getServerSession } from 'next-auth/next';

export class ProductRequest {
  private static baseURL = process.env.BACKEND_API_URL!;

  static async create(data: any) {
    const session = await getServerSession(authOptions);
    const token = session?.user?.accessToken;

    const response = await fetch(`${this.baseURL}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error('Error creating product');
    return response.json();
  }

  static async getAll(filters?: any) {
    const session = await getServerSession(authOptions);
    const token = session?.user?.accessToken;

    const query = new URLSearchParams(filters).toString();
    const response = await fetch(
      `${this.baseURL}/products${query ? '?' + query : ''}`,
      {
        headers: { 'Authorization': `Bearer ${token}` },
      }
    );

    if (!response.ok) throw new Error('Error fetching products');
    return response.json();
  }

  static async getById(id: string) {
    const session = await getServerSession(authOptions);
    const token = session?.user?.accessToken;

    const response = await fetch(`${this.baseURL}/products/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) throw new Error('Error fetching product');
    return response.json();
  }

  static async update(id: string, data: any) {
    const session = await getServerSession(authOptions);
    const token = session?.user?.accessToken;

    const response = await fetch(`${this.baseURL}/products/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error('Error updating product');
    return response.json();
  }

  static async delete(id: string) {
    const session = await getServerSession(authOptions);
    const token = session?.user?.accessToken;

    const response = await fetch(`${this.baseURL}/products/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) throw new Error('Error deleting product');
    return response.json();
  }
}
```

---

### 3. Application - Use Cases

**`features/products/application/create-product.usecase.ts`**
```typescript
import { ProductEntity, CreateProductInput } from '../domain/product.entity';
import { ProductRequest } from '../infrastructure/product.request';

export class CreateProductUseCase {
  static async execute(input: CreateProductInput) {
    // Validar con reglas del domain
    const validatedData = ProductEntity.validateCreate(input);

    // Ejecutar lógica de negocio
    const discountedPrice = ProductEntity.calculateDiscountedPrice(
      validatedData.price,
      0
    );

    // Llamar al backend
    return ProductRequest.create({
      ...validatedData,
      discountedPrice,
    });
  }
}
```

---

### 4. Server Actions

**`features/products/actions/product.action.ts`**
```typescript
'use server';

import { CreateProductUseCase } from '../application/create-product.usecase';
import { ProductRequest } from '../infrastructure/product.request';
import { ProductEntity } from '../domain/product.entity';

export async function createProductAction(formData: FormData) {
  try {
    const data = Object.fromEntries(formData);
    const result = await CreateProductUseCase.execute(data as any);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
  }
}

export async function getProductsAction(filters?: Record<string, string>) {
  try {
    const data = await ProductRequest.getAll(filters);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Error' };
  }
}

export async function getProductByIdAction(id: string) {
  try {
    const data = await ProductRequest.getById(id);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Error' };
  }
}

export async function updateProductAction(id: string, formData: FormData) {
  try {
    const data = Object.fromEntries(formData);
    const result = await ProductRequest.update(id, data);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Error' };
  }
}

export async function deleteProductAction(id: string) {
  try {
    await ProductRequest.delete(id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Error' };
  }
}
```

---

### 5. Hooks - Estado UI Local

**`features/products/hooks/use-product-form.hook.ts`**
```typescript
'use client';

import { useState } from 'react';

export function useProductForm() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    sku: '',
    category: '',
    stock: 0,
    active: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpiar error si existe
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const setFormErrors = (newErrors: Record<string, string>) => {
    setErrors(newErrors);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: 0,
      sku: '',
      category: '',
      stock: 0,
      active: true,
    });
    setErrors({});
  };

  return {
    formData,
    errors,
    updateField,
    setFormErrors,
    resetForm,
    setFormData,
  };
}
```

---

### 6. Componentes - Vistas

**`features/products/components/ProductForm.tsx`**
```typescript
'use client';

import {
  CreateBaseForm,
  UpdateBaseForm,
  BaseFormField,
  Alert
} from '@/shared/components';
import { createProductAction, updateProductAction } from '../actions/product.action';
import { useProductForm } from '../hooks/use-product-form.hook';
import { useState } from 'react';

const fields: BaseFormField[] = [
  {
    name: 'name',
    label: 'Nombre del Producto',
    type: 'text',
    required: true,
    placeholder: 'Ej: Laptop Dell XPS 13',
  },
  {
    name: 'description',
    label: 'Descripción',
    type: 'textarea',
    rows: 3,
    placeholder: 'Descripción detallada...',
  },
  {
    name: 'sku',
    label: 'SKU',
    type: 'text',
    required: true,
    placeholder: 'Ej: DELL-XPS-2024',
  },
  {
    name: 'price',
    label: 'Precio',
    type: 'currency',
    required: true,
    currencySymbol: '$',
  },
  {
    name: 'category',
    label: 'Categoría',
    type: 'select',
    required: true,
    options: [
      { id: 'electronics', label: 'Electrónica' },
      { id: 'clothing', label: 'Ropa' },
      { id: 'food', label: 'Alimentos' },
    ],
  },
  {
    name: 'stock',
    label: 'Stock',
    type: 'number',
    required: true,
    min: 0,
  },
  {
    name: 'active',
    label: 'Activo',
    type: 'switch',
  },
  {
    name: 'image',
    label: 'Imagen',
    type: 'image',
  },
];

interface ProductFormProps {
  mode: 'create' | 'update';
  initialData?: any;
  onSuccess?: () => void;
}

export function ProductForm({ mode, initialData, onSuccess }: ProductFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { resetForm } = useProductForm();

  const handleSubmit = async (data: any) => {
    setIsLoading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formData.append(key, String(value));
        }
      });

      const result = mode === 'create'
        ? await createProductAction(formData)
        : await updateProductAction(initialData?.id, formData);

      if (result.success) {
        setMessage({ type: 'success', text: 'Producto guardado correctamente' });
        if (mode === 'create') resetForm();
        setTimeout(() => onSuccess?.(), 1500);
      } else {
        setMessage({ type: 'error', text: result.error || 'Error al guardar' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error inesperado' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {message && (
        <Alert variant={message.type === 'success' ? 'success' : 'error'}>
          {message.text}
        </Alert>
      )}

      {mode === 'create' ? (
        <CreateBaseForm
          fields={fields}
          onSubmit={handleSubmit}
          title="Nuevo Producto"
        />
      ) : (
        <UpdateBaseForm
          initialData={initialData}
          fields={fields}
          onSubmit={handleSubmit}
          title="Editar Producto"
        />
      )}
    </div>
  );
}
```

---

**`features/products/components/ProductGrid.tsx`**
```typescript
'use client';

import { DataGrid, DataGridColumn, Button, Dialog } from '@/shared/components';
import { deleteProductAction, getProductsAction } from '../actions/product.action';
import { useEffect, useState } from 'react';

const columns: DataGridColumn[] = [
  { key: 'id', label: 'ID', width: '80px' },
  { key: 'name', label: 'Nombre', width: '200px' },
  { key: 'sku', label: 'SKU', width: '120px' },
  { key: 'price', label: 'Precio', width: '120px' },
  { key: 'stock', label: 'Stock', width: '100px' },
  {
    key: 'actions',
    label: 'Acciones',
    width: '150px',
    render: (_, row) => (
      <div className="flex gap-2">
        <Button size="sm" onClick={() => handleEdit(row)}>Editar</Button>
        <Button size="sm" variant="danger" onClick={() => handleDelete(row)}>
          Eliminar
        </Button>
      </div>
    ),
  },
];

export function ProductGrid() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    const result = await getProductsAction();
    if (result.success) {
      setProducts(result.data);
    }
    setLoading(false);
  };

  const handleDelete = async (product: any) => {
    setDeleteId(product.id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const result = await deleteProductAction(deleteId);
    if (result.success) {
      await loadProducts();
    }
    setDeleteId(null);
  };

  return (
    <>
      <DataGrid
        columns={columns}
        data={products}
        loading={loading}
        selectable={true}
      />

      <Dialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Confirmar eliminación"
      >
        <p>¿Deseas eliminar este producto?</p>
        <div className="flex gap-2 mt-4">
          <Button variant="danger" onClick={confirmDelete}>
            Eliminar
          </Button>
          <Button variant="secondary" onClick={() => setDeleteId(null)}>
            Cancelar
          </Button>
        </div>
      </Dialog>
    </>
  );
}
```

---

### 7. Página - Server Component

**`app/admin/products/page.tsx`**
```typescript
import { ProductGrid } from '@/features/products/components/ProductGrid';
import { ProductForm } from '@/features/products/components/ProductForm';
import { Card, Tabs } from '@/shared/components';

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Gestión de Productos</h1>

      <Tabs
        tabs={[
          {
            label: 'Lista',
            content: (
              <Card className="p-4">
                <ProductGrid />
              </Card>
            ),
          },
          {
            label: 'Nuevo Producto',
            content: (
              <Card className="p-4">
                <ProductForm mode="create" />
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
```

---

## 🎯 Checklist de Integración

Cuando integres un componente compartido, verifica:

- [ ] Importado desde `@/shared/components`
- [ ] Props tipadas correctamente
- [ ] Callbacks manejados (onChange, onClick, etc.)
- [ ] Estados locales en hooks si es necesario
- [ ] Server Actions usados para backend
- [ ] Validaciones en Domain
- [ ] No hay fetch directo en componentes
- [ ] Mensajes de error mostrados con Alert
- [ ] Loading states manejados
- [ ] Responsive con clases Tailwind

---

## 🚀 Tips Rápidos

### Reutilizar Formularios
```tsx
// ✅ Bien - Reutilizar BaseForm para todas las features
<CreateBaseForm fields={fields} onSubmit={handleCreate} />

// ❌ Evitar - Crear formularios personalizados para cada feature
// Usa BaseForm y personaliza con CSS si es necesario
```

### DataGrid Avanzado
```tsx
// ✅ Bien - Acciones en columna
{
  key: 'actions',
  render: (_, row) => (
    <RowActions
      items={[
        { label: 'Editar', onClick: () => handleEdit(row) },
        { label: 'Eliminar', onClick: () => handleDelete(row) }
      ]}
    />
  )
}
```

### Dialogs Confirmación
```tsx
// ✅ Bien - Dialog reutilizable
<Dialog open={showConfirm} onClose={() => setShowConfirm(false)}>
  <p>¿Estás seguro?</p>
  <Button onClick={handleConfirm}>Confirmar</Button>
</Dialog>
```

---

## 📚 Referencias

- **Documentación**: `src/shared/components/README.md`
- **Tipos Centralizados**: `src/shared/components/types.ts`
- **Exportaciones**: `src/shared/components/index.ts`

¡Listo para integrar! 🎉
