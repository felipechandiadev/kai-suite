# kai-pwa-admin

Admin web de la plataforma Kai (Next.js 16).

## Desarrollo

Desde la **raíz del monorepo**:

```bash
npm install          # workspaces: PWAs + @kai/*
cd pwa-admin && npm run dev   # http://localhost:5071
```

No hace falta `npm install` dentro de `pwa-admin`: las dependencias se hoistean desde la raíz.

Ver [README raíz](../README.md).
