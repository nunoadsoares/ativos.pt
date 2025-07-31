// astro.config.mjs
import { defineConfig } from 'astro/config';
import react      from '@astrojs/react';
import tailwind   from '@astrojs/tailwind';
import sitemap    from '@astrojs/sitemap';

/* ──────────────── Constantes ──────────────── */
const SITE_URL = 'https://www.ativos.pt';
const TODAY    = new Date().toISOString().split('T')[0]; // AAAA-MM-DD

/* ─────────────── Configuração ─────────────── */
export default defineConfig({
  site: SITE_URL,

  integrations: [
    react(),
    tailwind(),

    /* Sitemap v4 – gera sitemap-index.xml + sub-sitemaps */
    sitemap({
      changefreq: 'weekly', // valor por defeito
      priority:   0.7,       // valor por defeito

      /**
       * `entry` é um objeto que contém o URL e outras propriedades.
       * Acedemos a `entry.url` para obter o URL correto.
       */
      serialize(entry) {
        return {
          url:      entry.url, // <-- A CORREÇÃO ESTÁ AQUI
          lastmod:  TODAY,
          changefreq:'weekly',
          priority: 0.7,
        };
      },
    }),
  ],

  /* ─────────────── Extra Vite (ignorar better-sqlite3 no bundle) ─────────────── */
  vite: {
    resolve: {
      alias: {
        'better-sqlite3': false,
      },
    },
    ssr: {
      external: ['better-sqlite3'],
    },
  },
});