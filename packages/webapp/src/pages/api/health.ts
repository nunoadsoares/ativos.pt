import type { APIRoute } from 'astro';
import { openDb } from '~/lib/db'; // ou o helper que já uses para sqlite

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    // tenta abrir a DB em readonly e fazer um SELECT leve
    const db = openDb({ readonly: true }); // adapta ao teu util
    const ok = db.prepare("SELECT 1").get();
    return new Response(JSON.stringify({ ok: true, db: !!ok }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
};
