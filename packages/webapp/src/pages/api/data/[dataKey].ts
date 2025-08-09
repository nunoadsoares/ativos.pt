// packages/webapp/src/pages/api/data/[dataKey].ts
import type { APIRoute } from 'astro';
import { getIndicator, getSeries } from '~/lib/db';
// Retrocompatibilidade (fallback). Se quiseres, depois removemos.
import { CHART_SERIES_MAP, KPI_MAP, INDICATOR_GROUP_MAP } from '~/lib/data-map';

export const prerender = false;

function json(body: unknown, status = 200, maxAge = 300) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': `public, s-maxage=${maxAge}, stale-while-revalidate=86400`,
    },
  });
}

function parseLimit(v?: string | null) {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

async function resolveDirect(key: string, since?: string, limit?: number) {
  // 1) Indicador único (tabela key_indicators)
  const ind = getIndicator(key);
  if (ind) return { kind: 'indicator' as const, key, data: ind };

  // 2) Série histórica (tabela historical_series)
  const series = getSeries(key, { since, limit });
  if (series && series.length > 0) return { kind: 'series' as const, key, data: series };

  // 3) Não encontrado diretamente
  return null;
}

async function resolveViaMaps(key: string, since?: string, limit?: number) {
  // Grupo de séries (ex.: vários traces num gráfico)
  if (CHART_SERIES_MAP && key in CHART_SERIES_MAP) {
    const map = CHART_SERIES_MAP[key as keyof typeof CHART_SERIES_MAP] as Record<string, string>;
    const data: Record<string, unknown> = {};
    for (const alias in map) {
      data[alias] = getSeries(map[alias], { since, limit });
    }
    return { kind: 'series_group' as const, key, data };
  }

  // Grupo de indicadores (ex.: breakdown por componentes)
  if (INDICATOR_GROUP_MAP && key in INDICATOR_GROUP_MAP) {
    const map = INDICATOR_GROUP_MAP[key as keyof typeof INDICATOR_GROUP_MAP] as Record<string, string>;
    const data: Record<string, unknown> = {};
    for (const alias in map) {
      data[alias] = getIndicator(map[alias]);
    }
    return { kind: 'indicator_group' as const, key, data };
  }

  // Alias simples para um indicador (retrocompatibilidade de KPIs)
  if (KPI_MAP && key in KPI_MAP) {
    const realKey = KPI_MAP[key as keyof typeof KPI_MAP] as string;
    const ind = getIndicator(realKey);
    if (ind) return { kind: 'indicator' as const, key: realKey, data: ind };
  }

  return null;
}

export const GET: APIRoute = async ({ params, url }) => {
  const dataKey = params.dataKey || '';
  const keysParam = url.searchParams.get('keys');
  const since = url.searchParams.get('since') || undefined;
  const limit = parseLimit(url.searchParams.get('limit'));

  try {
    // Batch: /api/data/qualquer?keys=a,b,c
    if (keysParam) {
      const keys = keysParam.split(',').map(s => s.trim()).filter(Boolean);
      if (keys.length === 0) return json({ error: 'Parâmetro "keys" vazio.' }, 400);

      const out: Record<string, unknown> = {};
      const notFound: string[] = [];

      for (const k of keys) {
        const direct = await resolveDirect(k, since, limit);
        const resolved = direct ?? (await resolveViaMaps(k, since, limit));
        if (resolved) {
          out[k] = resolved.data;
        } else {
          notFound.push(k);
        }
      }

      if (notFound.length > 0) {
        return json({ ok: false, data: out, notFound }, 404);
      }
      return json({ ok: true, data: out });
    }

    // Single key pelo path
    if (!dataKey) return json({ error: 'dataKey inválida.' }, 400);

    const direct = await resolveDirect(dataKey, since, limit);
    const resolved = direct ?? (await resolveViaMaps(dataKey, since, limit));

    if (!resolved) {
      return json(
        { error: `A chave '${dataKey}' não existe como indicador, série ou alias nos mapas.` },
        404
      );
    }

    return json({ ok: true, kind: resolved.kind, key: resolved.key ?? dataKey, data: resolved.data });
  } catch (e: any) {
    console.error('[API data] erro:', e);
    return json({ error: String(e?.message || e) }, 500);
  }
};
