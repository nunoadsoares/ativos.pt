// packages/webapp/src/pages/api/health.ts
import type { APIRoute } from 'astro';
// CORREÇÃO: Importamos 'db' diretamente e a função 'getIndicator'.
import { db, getIndicator } from '~/lib/db';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    // CORREÇÃO: Usamos uma query simples para verificar a saúde da BD.
    const ping = db.prepare('SELECT 1').get();
    const ok = !!ping;
    
    const sample = getIndicator('latest_exchange_rate_eur_usd') ?? null;
    const name = (db as any).name || 'unknown';
    
    return new Response(JSON.stringify({ ok, dbPath: name, sample }, null, 2), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }, null, 2), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
};