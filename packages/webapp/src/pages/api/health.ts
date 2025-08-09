// packages/webapp/src/pages/api/health.ts
import type { APIRoute } from 'astro';
import { getDb, ping, getIndicator } from '~/lib/db';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const db = getDb();
    const ok = ping();
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
