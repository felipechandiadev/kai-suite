import Link from "next/link";

export type EShopUnavailableReason = "disabled" | "not_found" | "backend_unreachable";

const PUBLIC_COPY: Record<
  EShopUnavailableReason,
  { title: string; description: string; retryLabel: string }
> = {
  backend_unreachable: {
    title: "No pudimos conectar con la tienda",
    description:
      "El servicio no está disponible en este momento. Intenta de nuevo en unos minutos.",
    retryLabel: "Volver a intentar",
  },
  disabled: {
    title: "Tienda temporalmente cerrada",
    description:
      "Esta tienda en línea no está disponible en este momento. Vuelve a visitarnos más tarde o contáctanos por nuestros canales habituales.",
    retryLabel: "Volver a intentar",
  },
  not_found: {
    title: "Tienda no encontrada",
    description:
      "No pudimos encontrar la tienda que buscas. Revisa la dirección o intenta nuevamente más tarde.",
    retryLabel: "Ir al inicio",
  },
};

type Props = {
  reason: EShopUnavailableReason;
};

export function EShopStoreUnavailable({ reason }: Props) {
  const copy = PUBLIC_COPY[reason];
  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-foreground">{copy.title}</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{copy.description}</p>
      <Link
        href="/"
        className="mt-8 inline-block text-sm font-medium text-primary hover:underline"
      >
        {copy.retryLabel}
      </Link>

      {isDev ? (
        <details className="mt-10 text-left">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
            Información para desarrollo
          </summary>
          <div className="mt-3 space-y-3 rounded-lg border border-border bg-muted/20 p-4 text-xs text-muted-foreground">
            {reason === "backend_unreachable" ? (
              <p>
                <strong>ECONNREFUSED</strong> al llamar <code className="text-[11px]">BACKEND_API_URL</code>
                . El API Nest no está escuchando (dev: puerto <strong>5030</strong>).
              </p>
            ) : reason === "disabled" ? (
              <p>
                El backend respondió <strong>503</strong>: eShop desactivado en admin o tienda no
                habilitada.
              </p>
            ) : (
              <p>
                El backend respondió <strong>404</strong>: slug de tienda inexistente o no
                coincide con la configuración.
              </p>
            )}
            {reason === "backend_unreachable" ? (
              <ol className="list-decimal space-y-2 pl-4">
                <li>
                  Verifica que el backend esté en ejecución:{" "}
                  <code className="text-[11px]">cd kai-core && npm run start:dev</code> o{" "}
                  <code className="text-[11px]">npm run dev:all</code> en la raíz del monorepo.
                </li>
                <li>
                  En <code className="text-[11px]">kai-eshop/.env.local</code>:{" "}
                  <code className="text-[11px]">BACKEND_API_URL=http://localhost:5030</code>
                </li>
              </ol>
            ) : null}
            {reason !== "backend_unreachable" ? (
              <ol className="list-decimal space-y-2 pl-4">
                <li>
                  En <strong>kai-admin</strong> → Configuración → Empresa → eShop: active la tienda
                  y defina el slug público.
                </li>
                <li>
                  En <code className="text-[11px]">kai-eshop/.env.local</code>:{" "}
                  <code className="text-[11px]">NEXT_PUBLIC_ESHOP_STORE_SLUG=&lt;mismo-slug&gt;</code>
                </li>
                <li>
                  O ejecute:{" "}
                  <code className="text-[11px]">cd kai-core && npm run eshop:enable-demo</code>
                </li>
              </ol>
            ) : null}
          </div>
        </details>
      ) : null}
    </div>
  );
}
