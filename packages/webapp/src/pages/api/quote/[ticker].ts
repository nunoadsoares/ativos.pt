// packages/webapp/src/pages/api/quote/[ticker].ts

import type { APIRoute } from 'astro';
import { getQuoteData } from '~/lib/stock-data-fetcher';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const { ticker } = params;
  if (!ticker) {
    return new Response(JSON.stringify({ error: 'Ticker em falta.' }), { status: 400 });
  }

  try {
    const quoteData = await getQuoteData(ticker.toUpperCase());
    return new Response(JSON.stringify(quoteData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error(`API Error for ${ticker}:`, error);
    return new Response(JSON.stringify({ error: 'Não foi possível obter a cotação.' }), { status: 500 });
  }
};