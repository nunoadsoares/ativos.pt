import type { APIRoute } from 'astro';
import { getSeries, getIndicator } from '~/lib/db';
// Importa o novo INDICATOR_GROUP_MAP
import { CHART_SERIES_MAP, KPI_MAP, INDICATOR_GROUP_MAP } from '~/lib/data-map';

export const prerender = false;

function jsonResponse(body: unknown, status = 200, maxAge = 3600) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, s-maxage=${maxAge}, stale-while-revalidate=86400`,
    },
  });
}

export const GET: APIRoute = ({ params, url }) => {
  const { dataKey } = params;
  if (!dataKey) return jsonResponse({ error: 'dataKey inválida.' }, 400);

  const since = url.searchParams.get('since') || undefined;
  const limit = Number(url.searchParams.get('limit')) || undefined;

  // Lógica para GRÁFICOS DE SÉRIES HISTÓRICAS
  if (dataKey in CHART_SERIES_MAP) {
    try {
      const seriesMap = CHART_SERIES_MAP[dataKey];
      const responseData: Record<string, unknown> = {};
      for (const identifier in seriesMap) {
        responseData[identifier] = getSeries(seriesMap[identifier], { since, limit });
      }
      return jsonResponse(responseData);
    } catch (error) { console.error(`[API] Erro em CHART_SERIES_MAP para '${dataKey}':`, error); return jsonResponse({ error: 'Erro interno.' }, 500); }
  }

  // NOVA LÓGICA para GRUPOS DE INDICADORES (para o gráfico de breakdown)
  if (dataKey in INDICATOR_GROUP_MAP) {
    try {
      const indicatorMap = INDICATOR_GROUP_MAP[dataKey];
      const responseData: Record<string, unknown> = {};
      for (const identifier in indicatorMap) {
        responseData[identifier] = getIndicator(indicatorMap[identifier]);
      }
      return jsonResponse(responseData);
    } catch (error) { console.error(`[API] Erro em INDICATOR_GROUP_MAP para '${dataKey}':`, error); return jsonResponse({ error: 'Erro interno.' }, 500); }
  }
  
  // Lógica para INDICADORES ÚNICOS
  if (dataKey in KPI_MAP) {
    try {
      return jsonResponse(getIndicator(KPI_MAP[dataKey]));
    } catch (error) { console.error(`[API] Erro em KPI_MAP para '${dataKey}':`, error); return jsonResponse({ error: 'Erro interno.' }, 500); }
  }

  return jsonResponse({ error: `A chave de dados '${dataKey}' não foi encontrada.` }, 404);
};