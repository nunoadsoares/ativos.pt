// packages/webapp/src/data/db.ts
import path from 'node:path';

/* ─────────── Tipos ─────────── */
export interface Indicator {
  indicator_key: string;
  label:         string;
  value:         number;
  unit:          string;
  reference_date:string;
  updated_at:    string;
}

/* ─────────── Cache ─────────── */
let cache: Indicator[] | null = null;

/**
 * Devolve a lista mais recente de indicadores.
 * • No SSR (build) lê directamente a SQLite via better-sqlite3
 * • No browser faz fetch ao JSON gerado pelo data-worker
 */
export async function getLatestIndicators(): Promise<Indicator[]> {
  if (cache) return cache; // evita leituras repetidas

  if (import.meta.env.SSR) {
    /* ----------- Só corre no build/SSR ----------- */
    // Import dinâmico para não entrar no bundle de browser
    const { default: Database } = await import('better-sqlite3');
    const dbPath = path.join(process.cwd(), 'public', 'datahub.db');
    const db     = new Database(dbPath, { readonly: true });

    cache = db.prepare('SELECT * FROM key_indicators').all() as Indicator[];
    return cache;
  }

  /* ----------- Fallback no browser ----------- */
  const resp = await fetch('/data/datalake/latest.json');
  const json = await resp.json();

  cache = Object.entries(json.indicadores).map(([key, value]) => ({
    indicator_key: key,
    label:         key,
    value:         value as number,
    unit:          typeof value === 'number' ? '%' : '',
    reference_date: json.data,
    updated_at:    json.data,
  })) as Indicator[];

  return cache;
}
