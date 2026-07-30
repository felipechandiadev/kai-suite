export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="text-2xl font-semibold tracking-tight">Login</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Esta ruta se mantiene solo por compatibilidad temporal. El login real está en <code>/</code>.
      </p>
      <p className="mt-2 text-sm">
        Ve a <a className="underline" href="/">/</a>.
      </p>
    </div>
  );
}

