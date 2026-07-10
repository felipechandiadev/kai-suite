"use client";
import React from "react";

import {
  layoutPageContentClassName,
  layoutPageHeaderClassName,
  layoutPageRootClassName,
  layoutPageSubtitleClassName,
  layoutPageTitleClassName,
} from "./layoutPageTokens";

export type BasicPageLayoutProps = {
  /** Título principal (h1). */
  title?: React.ReactNode;
  /** Texto o nodo bajo el título. */
  subtitle?: React.ReactNode;
  /** Contenido principal de la página. */
  children: React.ReactNode;
  className?: string;
  /** Clases extra en el contenedor del cuerpo (debajo del encabezado). */
  contentClassName?: string;
  "data-test-id"?: string;
};

function hasHeadingChunk(node: React.ReactNode): boolean {
  if (node == null || node === false) return false;
  if (typeof node === "string") return node.trim().length > 0;
  if (typeof node === "number") return true;
  return true;
}

/**
 * Layout mínimo de página: encabezado opcional (título + subtítulo) y área de contenido.
 * Sin `"use client"` — usable en Server y Client Components.
 */
export function BasicPageLayout({
  title,
  subtitle,
  children,
  className = "",
  contentClassName = "",
  "data-test-id": dataTestId,
}: BasicPageLayoutProps) {
  const showTitle = hasHeadingChunk(title);
  const showSubtitle = hasHeadingChunk(subtitle);
  const showHeading = showTitle || showSubtitle;

  return (
    <div
      className={`${layoutPageRootClassName} ${className}`.trim()}
      data-test-id={dataTestId ?? "basic-page-layout"}
    >
      {showHeading ? (
        <header className={layoutPageHeaderClassName}>
          {showTitle ? (
            <h1 className={layoutPageTitleClassName}>{title}</h1>
          ) : null}
          {showSubtitle ? (
            <p
              className={layoutPageSubtitleClassName}
              data-test-id="basic-page-layout-subtitle"
            >
              {subtitle}
            </p>
          ) : null}
        </header>
      ) : null}

      <section
        className={`${layoutPageContentClassName} ${contentClassName}`.trim()}
        data-test-id="basic-page-layout-content"
      >
        {children}
      </section>
    </div>
  );
}
