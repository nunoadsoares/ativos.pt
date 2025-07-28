import type { APIRoute } from 'astro';
import { getAllBrokers } from '~/utils/brokers';

export const get: APIRoute = async () => {
  const data = await getAllBrokers();
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  });
};
