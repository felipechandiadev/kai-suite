"use client";

import type { ReactNode } from "react";
import { CollectionPageLayout, type CollectionPageLayoutProps } from "@kai/ui";

type Props = Partial<CollectionPageLayoutProps> & { children?: ReactNode };

/**
 * Demo: ajusta título, búsqueda, `contentItems` y columnas; recibe RSC o nodos vía <code>children</code> si no usas <code>contentItems</code>.
 */
export function CollectionPageLayoutShowcaseClient({
  children,
  contentItems,
  contentGridColumns,
  contentGridGapClassName,
  contentGridClassName,
  showSearch = true,
  searchParamName = "search",
  searchLabel = "Buscar",
  searchPlaceholder = "Escribe y mira la barra de direcciones…",
  title = "CollectionPageLayout",
  subtitle = "Colección/índice: lista, grilla o tarjetas. `contentItems` + `contentGridColumns` o `children` sueltos. Búsqueda con ?search= y SSR.",
  onAddClick = () => {
    window.alert("Acción añadir (en una página real: abrir diálogo o navegar a /new).");
  },
  addButtonAriaLabel = "Añadir (demo)",
  ...rest
}: Props) {
  return (
    <CollectionPageLayout
      title={title}
      subtitle={subtitle}
      onAddClick={onAddClick}
      addButtonAriaLabel={addButtonAriaLabel}
      showSearch={showSearch}
      searchParamName={searchParamName}
      searchLabel={searchLabel}
      searchPlaceholder={searchPlaceholder}
      contentItems={contentItems}
      contentGridColumns={contentGridColumns}
      contentGridGapClassName={contentGridGapClassName}
      contentGridClassName={contentGridClassName}
      {...rest}
    >
      {children}
    </CollectionPageLayout>
  );
}
