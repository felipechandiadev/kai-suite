import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Regla nueva de React 19: marca patrones habituales del POS (leer almacenamiento al montar,
      // reiniciar estado al cambiar props, cargar datos). Se mantiene como aviso hasta migrarlos
      // por lotes con pruebas de interfaz; no reescribir a ciegas el carrito ni el pago.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
