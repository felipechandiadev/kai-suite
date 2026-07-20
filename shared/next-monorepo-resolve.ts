import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

/**
 * Resuelve la raíz de un paquete desde el contexto de una app del monorepo
 * (soporta hoist de npm workspaces en la raíz).
 * No usa `pkg/package.json` en resolve (muchos packages no lo exportan).
 */
export function resolvePackageRoot(appRoot: string, packageName: string): string {
  const require = createRequire(path.join(appRoot, "package.json"));
  const entry = require.resolve(packageName);
  let dir = path.dirname(entry);
  for (;;) {
    const pkgJson = path.join(dir, "package.json");
    if (fs.existsSync(pkgJson)) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(
        `Could not resolve package root for "${packageName}" from ${appRoot}`,
      );
    }
    dir = parent;
  }
}

/**
 * No aliasar `react` / `react-dom` en Next App Router.
 *
 * Forzar webpack a `node_modules/react` choca con el React interno de Next
 * (`next/dist/compiled/react`) y produce "Invalid hook call" /
 * `Cannot read properties of null (reading 'useContext')` en DevTools
 * (`SegmentTrieNode` / `useSegmentState`).
 *
 * Con npm workspaces, React ya queda hoisted a una sola copia en la raíz;
 * `@kai/ui` debe declarar `react` como peerDependency.
 */
export function monorepoReactAliases(_appRoot: string): Record<string, string> {
  return {};
}

/** Alias next-auth cuando la app lo declara (admin/pos/stock). */
export function monorepoNextAuthAliases(appRoot: string): Record<string, string> {
  const nextAuthRoot = resolvePackageRoot(appRoot, "next-auth");
  return {
    "next-auth": nextAuthRoot,
    "next-auth/react": path.join(nextAuthRoot, "react"),
  };
}
