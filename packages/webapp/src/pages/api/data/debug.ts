// packages/webapp/src/pages/api/data/debug.ts
import type { APIRoute } from 'astro';
// CORREÇÃO: Importamos 'db' diretamente.
import { db } from '~/lib/db';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    // CORREÇÃO: Usamos a instância 'db' diretamente.
    const indicators = db.prepare(
      'SELECT indicator_key, value, unit, reference_date FROM key_indicators ORDER BY indicator_key'
    ).all();
    const series = db.prepare(
      'SELECT series_key, COUNT(*) as rows, MIN(date) as min_date, MAX(date) as max_date FROM historical_series GROUP BY series_key ORDER BY series_key'
    ).all();
    
    return new Response(JSON.stringify({ indicators, series }, null, 2), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }, null, 2), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
};