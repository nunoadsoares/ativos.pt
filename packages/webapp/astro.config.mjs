// astro.config.mjs
import { defineConfig } from 'astro/config';
import react    from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap  from '@astrojs/sitemap';

/* ──────────────── Constantes ──────────────── */
const SITE_URL = 'https://www.ativos.pt';               // domínio final (obrigatório)
const TODAY    = new Date().toISOString().split('T')[0]; // AAAA-MM-DD

/* ─────────────── Configuração ─────────────── */
export default defineConfig({
  site: SITE_URL,

  integrations: [
    react(),
    tailwind(),

    /* Sitemap v4 – gera sitemap-index.xml + sub-sitemaps */
    sitemap({
      changefreq: 'weekly',   // valor por defeito
      priority:   0.7,        // valor por defeito

      /** 
       * `entry` chega como string com URL absoluto (porque `site` está definido).
       * Basta devolvê-lo com os meta-dados extra que quisermos.
       */
      serialize(entry) {
        return {
          url:       entry,   // URL correcto
          lastmod:   TODAY,   // mesma data p/ todas (podes evoluir depois)
          changefreq:'weekly',
          priority:  0.7,
        };
      },
    }),
  ],

  /* ─────────────── Extra Vite (ignorar better-sqlite3 no bundle) ─────────────── */
  vite: {
    resolve: {
      alias: {
        'better-sqlite3': false,   // torna-se “falso” no bundle de browser
      },
    },
    ssr: {
      external: ['better-sqlite3'], // continua disponível no build/SSR
    },
  },
});
