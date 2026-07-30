// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

const landingProduct = process.env.LANDING_PRODUCT === 'food' ? 'food' : 'store';
const landingPort = Number(process.env.KAI_LANDING_PORT) || 5066;

export default defineConfig({
  integrations: [react()],
  server: {
    port: landingPort,
    host: true,
  },
  vite: {
    define: {
      'import.meta.env.LANDING_PRODUCT': JSON.stringify(landingProduct),
    },
  },
});
