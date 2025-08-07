// astro.config.mjs
import { defineConfig } from 'astro/config'
import react    from '@astrojs/react'
import tailwind from '@astrojs/tailwind'
import sitemap  from '@astrojs/sitemap'
import icon     from 'astro-icon'
import node     from '@astrojs/node'       // ← adapter Node

/* ─────────── Constantes ─────────── */
const SITE_URL = 'https://www.ativos.pt'
const TODAY    = new Date().toISOString().split('T')[0] // AAAA-MM-DD

/* ───────── Configuração ────────── */
export default defineConfig({
  site: SITE_URL,
  output: 'server',                       // SSR
  adapter: node({ mode: 'standalone' }),

  // 🔀 REDIRECTS (301 por defeito)
  redirects: {
    '/comparar/[list]': '/plataformas/comparar/[list]',
    '/comparar':        '/plataformas/comparar', // índice (opcional)
    // Se preferir 308, faça:
    // '/comparar/[list]': { status: 308, destination: '/plataformas/comparar/[list]' }
  },

  server: {
    host: true,   // bind a 0.0.0.0 dentro do container
    port: 8080
  },

  integrations: [
    react(),
    tailwind(),
    icon(),
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      serialize(entry) {
        return {
          url: entry.url,
          lastmod: TODAY,
          changefreq: 'weekly',
          priority: 0.7
        }
      }
    })
  ],

  vite: {
    ssr: {
      external: ['better-sqlite3']        // evita erro de bundle
    }
  }
})
