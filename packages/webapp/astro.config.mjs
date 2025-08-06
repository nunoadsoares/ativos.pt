// astro.config.mjs
import { defineConfig } from 'astro/config'
import react   from '@astrojs/react'
import tailwind from '@astrojs/tailwind'
import sitemap from '@astrojs/sitemap'
import icon    from 'astro-icon'
import node    from '@astrojs/node'          // ← NOVO

/* ─────────── Constantes ─────────── */
const SITE_URL = 'https://www.ativos.pt'
const TODAY    = new Date().toISOString().split('T')[0] // AAAA-MM-DD

/* ───────── Configuração ────────── */
export default defineConfig({
  site: SITE_URL,
  output: 'server',                          // Geração server-side
  adapter: node({ mode: 'standalone' }),     // Standalone server para Docker

  server: {
    host: true,   // ← ESSENCIAL: faz bind a 0.0.0.0 em vez de localhost
    port: 8080    // Porta usada internamente pelo container "app"
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
      external: ['better-sqlite3'] // evita erro de bundle com SQLite em SSR
    }
  }
})
