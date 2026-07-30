import Link from "next/link";

export default function NotFoundPage() {
  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-foreground">Página no encontrada</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        El enlace que seguiste no existe o ya no está disponible.
      </p>
      <Link href="/" className="mt-8 inline-block text-sm font-medium text-primary hover:underline">
        Volver al inicio
      </Link>

      {isDev ? (
        <p className="mt-10 text-xs text-muted-foreground">
          Si esperabas ver la tienda, revise la configuración del eShop en admin y el slug en{" "}
          <code className="text-[11px]">.env.local</code>.
        </p>
      ) : null}
    </div>
  );
}
