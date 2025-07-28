// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  // ADICIONA ESTA LINHA:
  // Define o URL de produção do teu site.
  site: 'https://ativos.pt',

  integrations: [
    react(),
    tailwind()
  ],
});
