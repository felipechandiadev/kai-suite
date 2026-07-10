'use client'
import React, { useState, useCallback } from 'react';
import { Plus, Search } from 'lucide-react';
import IconButton from '../../IconButton';
import { ButtonPill } from '../../Button';
import type { DataGridAddButtonVariant } from '../DataGrid';
import Toolbar from './Toolbar';
import TextField from '../../TextField';
import { usePathname, useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { ColHeader } from './ColHeader';
import { calculateColumnStyles, useScreenSize } from '../utils/columnStyles';
import type { DataGridColumn } from '../DataGrid';
import Dialog from '../../Dialog';

interface HeaderProps {
  title?: string;
  filterMode?: boolean;
  onToggleFilterMode?: () => void;
  columns?: DataGridColumn[];
  createForm?: React.ReactNode;
  createFormTitle?: string;
  onAddClick?: () => void; // Callback para el botón + (abre diálogo externo)
  addDisabled?: boolean; // Deshabilita el botón + sin ocultarlo
  addButtonVariant?: DataGridAddButtonVariant;
  addButtonLabel?: string;
  screenWidth?: number;
  onExportExcel?: () => Promise<void>;
  headerActions?: React.ReactNode; // Slot para componentes adicionales (ej: filtros externos)
  showSortButton?: boolean;
  showFilterButton?: boolean;
  showExportButton?: boolean;
  showSearch?: boolean;
  onSearchChange?: (value: string) => void;
}

const Header: React.FC<HeaderProps> = ({
  title,
  filterMode = false,
  onToggleFilterMode,
  columns = [],
  createForm,
  createFormTitle,
  onAddClick,
  addDisabled = false,
  addButtonVariant = 'icon',
  addButtonLabel,
  screenWidth = 1024,
  onExportExcel,
  headerActions,
  showSortButton = true,
  showFilterButton = true,
  showExportButton = true,
  showSearch = true,
  onSearchChange,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');

  const filtration = searchParams.get('filtration') === 'true';

  React.useEffect(() => {
    setSearchInput(searchParams.get('search') || '');
  }, [searchParams]);

  // Debounce search updates to avoid excessive URL changes
  const debounceTimer = React.useRef<NodeJS.Timeout | null>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setSearchInput(value);

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer for 300ms debounce
    debounceTimer.current = setTimeout(() => {
      if (onSearchChange) {
        onSearchChange(value);
      } else {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
          params.set('search', value);
        } else {
          params.delete('search');
        }
        // Reset to page 1 when searching
        params.set('page', '1');
        router.replace(`?${params.toString()}`);
      }
    }, 300);
  }, [searchParams, router, onSearchChange]);

  // Limpiar búsqueda de forma inmediata (cancela debounce y actualiza la URL o llama onSearchChange)
  const handleClear = useCallback(() => {
    setSearchInput('');

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (onSearchChange) {
      onSearchChange('');
    } else {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('search');
      params.set('page', '1');
      router.replace(`?${params.toString()}`);
    }
  }, [searchParams, router, onSearchChange]);

  // Calcular estilos computados para las columnas usando utilidad centralizada
  const computedStyles = calculateColumnStyles(columns, screenWidth);

  // border-b border-gray-300 bg-gray-100
  return (
    <div className="w-full pb-4" data-test-id="data-grid-header">
      {/* Primera fila: Add button + Title + (Toolbar + Search en desktop) */}
      <div className="flex w-full items-center gap-2 py-0">
        {/* Add button - usa onAddClick si está definido, sino abre el modal interno */}
        {(createForm || onAddClick) && (
          <div
            className={
              addButtonVariant === 'pillOutlined'
                ? 'flex min-w-0 shrink-0 items-center overflow-visible'
                : 'flex shrink-0 items-center'
            }
          >
            {addButtonVariant === 'pillOutlined' ? (
              <ButtonPill
                type="button"
                variant="outlined"
                disabled={addDisabled}
                onClick={onAddClick || (() => setIsCreateModalOpen(true))}
                className="!inline-flex !w-auto !max-w-none items-center gap-1.5 whitespace-nowrap"
                data-test-id="add-button-pill"
                aria-label={
                  addButtonLabel?.trim()
                    ? `Agregar ${addButtonLabel.trim()}`
                    : 'Agregar'
                }
              >
                <Plus className="h-4 w-4 shrink-0 text-secondary" aria-hidden />
                <span>{addButtonLabel?.trim() ? addButtonLabel.trim() : 'Agregar'}</span>
              </ButtonPill>
            ) : (
              <IconButton
                icon="Plus"
                variant="action"
                size="md"
                onClick={onAddClick || (() => setIsCreateModalOpen(true))}
                disabled={addDisabled}
                data-test-id="add-button"
                aria-label="Agregar"
              />
            )}
          </div>
        )}
        {title?.trim() ? (
          <div className="min-w-0 shrink-0 whitespace-nowrap text-lg font-semibold text-foreground">
            {title.trim()}
          </div>
        ) : null}
        {headerActions && (
          <div className="hidden sm:flex flex-1 items-center justify-center gap-3" data-test-id="header-actions-slot">
            {headerActions}
          </div>
        )}

        {/* Spacer para empujar toolbar a la derecha (solo si no hay headerActions) */}
        {!headerActions && <div className="flex-1" />}
        
        {/* Toolbar y Search - solo visible en sm y superior */}
        <div className="hidden items-center gap-2 sm:flex">
          {/* Toolbar */}
          <div className="flex-shrink-0">
            <Toolbar
              filterMode={filterMode}
              onToggleFilterMode={onToggleFilterMode}
              columns={columns}
              title={title}
              onExportExcel={onExportExcel}
              showSortButton={showSortButton}
              showFilterButton={showFilterButton}
              showExportButton={showExportButton}
            />
          </div>
          {/* Search field */}
          {showSearch ? (
            <div className="flex items-start gap-2 overflow-visible pt-1">
              <TextField
                label="Buscar"
                name="datagrid-search"
                value={searchInput}
                onChange={handleChange}
                placeholder="Buscar..."
                startAdornment={<Search className="h-4 w-4 shrink-0 text-secondary" aria-hidden />}
                className="w-full sm:w-64"
                data-test-id="data-grid-search-input"
              />
            </div>
          ) : null}
        </div>
      </div>

      {/* Mobile Toolbar and Search */}
      
      {/* Segunda fila: Header Actions (móvil) - solo si hay headerActions */}
      {headerActions && (
        <div className="mt-0 flex items-center justify-center gap-2 sm:hidden" data-test-id="header-actions-slot-mobile">
          {headerActions}
        </div>
      )}

      {/* Tercera fila: Toolbar + Search - solo visible en móvil (menor a sm) */}
      <div className="mt-0 flex items-start justify-end gap-2 sm:hidden">
        {/* Toolbar */}
        <div>
          <Toolbar
            columns={columns}
            title={title}
            onExportExcel={onExportExcel}
            filterMode={filterMode}
            onToggleFilterMode={onToggleFilterMode}
            showSortButton={showSortButton}
            showFilterButton={showFilterButton}
            showExportButton={showExportButton}
          />
        </div>
        {/* Search field */}
        <div className="flex flex-1 max-w-xs items-start">
          <label htmlFor="datagrid-search-mobile" className="sr-only">Buscar</label>
          <div className="flex w-full items-start gap-2">
            <TextField
              label="Buscar"
              placeholder="Buscar..."
              name="datagrid-search-mobile"
              value={searchInput}
              onChange={handleChange}
              startAdornment={<Search className="h-4 w-4 shrink-0 text-secondary" aria-hidden />}
              className="w-full text-sm"
            />
          </div>
        </div>
      </div>
      
      {/* Create Modal */}
      {createForm && (
        <Dialog 
          open={isCreateModalOpen} 
          onClose={() => setIsCreateModalOpen(false)} 
          size="lg"
          scroll="body"
          hideActions={true}
          title={createFormTitle}
        >
          {/* Wrapper to pass onClose to createForm */}
          {React.isValidElement(createForm)
            ? React.cloneElement(createForm, {
                onClose: () => setIsCreateModalOpen(false),
              } as any)
            : createForm}
        </Dialog>
      )}
    </div>
  );
};

export default Header;
