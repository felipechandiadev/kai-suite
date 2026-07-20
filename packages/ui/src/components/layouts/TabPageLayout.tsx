import React from "react";

import {
  layoutPageContentClassName,
  layoutPageHeaderClassName,
  layoutPageRootClassName,
  layoutPageRootClassNameCompact,
  layoutPageSubtitleClassName,
  layoutPageTitleClassName,
} from "./layoutPageTokens";

export type TabPageLayoutProps = {
  /** Título principal (h1), en el bloque de títulos (izquierda). */
  title?: React.ReactNode;
  /** Texto o nodo bajo el título, en el mismo bloque. */
  subtitle?: React.ReactNode;
  /**
   * Navegación por pestañas (p. ej. `<Tabs items={...} />` desde un Client Component).
   * Misma fila que el bloque de títulos en `md+`, alineada a la derecha.
   */
  tabs?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  /** Clases extra en el contenedor del encabezado (grid títulos + tabs). */
  headerClassName?: string;
  /** Menos espacio vertical entre la fila de pestañas y el contenido. */
  compact?: boolean;
  "data-test-id"?: string;
};

function hasChunk(node: React.ReactNode): boolean {
  if (node == null || node === false) {
    return false;
  }
  if (typeof node === "string") {
    return node.trim().length > 0;
  }
  if (typeof node === "number") {
    return true;
  }
  return true;
}

/**
 * Layout de página con pestañas: comparte tokens de `layoutPageTokens` con {@link CollectionPageLayout}
 * (raíz, título `text-lg`, subtítulo, bloque de contenido).
 *
 * Sin `"use client"` — usable en Server y Client Components (el slot `tabs` puede ser un Client Component).
 *
 * Encabezado: grid con bloque de títulos (title arriba, subtitle abajo) a la **izquierda**
 * y `tabs` a la **derecha**, a la misma altura (`items-center`). En viewport angosto se apilan.
 */
export function TabPageLayout({
  title,
  subtitle,
  tabs,
  children,
  className = "",
  contentClassName = "",
  headerClassName = "",
  compact = false,
  "data-test-id": dataTestId,
}: TabPageLayoutProps) {
  const rootBase = compact ? layoutPageRootClassNameCompact : layoutPageRootClassName;
  const showTitle = hasChunk(title);
  const showSubtitle = hasChunk(subtitle);
  const showHeading = showTitle || showSubtitle;
  const showTabs = hasChunk(tabs);

  const titlesBlock =
    showHeading ? (
      <div className="min-w-0" data-test-id="tab-page-layout-titles">
        {showTitle ? (
          <h1 className={layoutPageTitleClassName}>{title}</h1>
        ) : null}
        {showSubtitle ? (
          <p
            className={layoutPageSubtitleClassName}
            data-test-id="tab-page-layout-subtitle"
          >
            {subtitle}
          </p>
        ) : null}
      </div>
    ) : null;

  return (
    <div
      className={`${rootBase} ${className}`.trim()}
      data-test-id={dataTestId ?? "tab-page-layout"}
    >
      {showHeading || showTabs ? (
        <header
          className={`${layoutPageHeaderClassName} ${headerClassName}`.trim()}
          data-test-id="tab-page-layout-header"
        >
          {showHeading && showTabs ? (
            <div
              className="grid w-full min-w-0 grid-cols-1 items-center gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:gap-4"
              data-test-id="tab-page-layout-header-row"
            >
              {titlesBlock}
              <div
                className="flex min-w-0 justify-start overflow-x-auto md:justify-end md:justify-self-end md:pb-px"
                data-test-id="tab-page-layout-tabs"
              >
                {tabs}
              </div>
            </div>
          ) : showHeading ? (
            titlesBlock
          ) : (
            <div
              className="flex min-w-0 w-full justify-end overflow-x-auto md:pb-px"
              data-test-id="tab-page-layout-tabs"
            >
              {tabs}
            </div>
          )}
        </header>
      ) : null}

      <section
        className={`${layoutPageContentClassName} ${contentClassName}`.trim()}
        data-test-id="tab-page-layout-content"
      >
        {children}
      </section>
    </div>
  );
}
