// C:\Users\nunos\Desktop\ativos.pt\packages\webapp\src\components\acoes\RecTrendChart.tsx

import React, { useState, useEffect, useRef } from 'react';
import Highcharts from 'highcharts';
import HighchartsReactOfficial from 'highcharts-react-official';
import type { RecommendationTrend } from '~/lib/stock-data-fetcher';
import { IconUsersGroup } from '@tabler/icons-react';

// Interop do wrapper (ESM/CJS)
const HighchartsReact = (HighchartsReactOfficial as any).default ?? HighchartsReactOfficial;

/* ---------- Loader dos módulos (cliente, uma vez, 100% robusto) ---------- */
let hcPatched = false;
let hcLoadPromise: Promise<void> | null = null;

function applyModule(mod: any) {
  const fn = mod?.default ?? mod;
  if (typeof fn === 'function') fn(Highcharts);
}

async function loadHighchartsModules(): Promise<void> {
  if (hcPatched || typeof window === 'undefined') return;
  if (!hcLoadPromise) {
    hcLoadPromise = (async () => {
      // usar caminhos com .js (Vite resolve no browser)
      const more = await import('highcharts/highcharts-more.js');
      applyModule(more);
      const solid = await import('highcharts/modules/solid-gauge.js');
      applyModule(solid);
      const exporting = await import('highcharts/modules/exporting.js');
      applyModule(exporting);
      hcPatched = true;
    })().catch((e) => {
      hcLoadPromise = null; // permite retry se falhar
      throw e;
    });
  }
  await hcLoadPromise;
}

/* ------------------- Componente ------------------- */
const RecTrendChart: React.FC<{ trends: RecommendationTrend[] }> = ({ trends = [] }) => {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [activePeriod, setActivePeriod] = useState(trends[0]?.period || '0m');

  const chartRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Mantém período válido
  useEffect(() => {
    if (!trends.length) return;
    if (!activePeriod || !trends.some(t => t.period === activePeriod)) {
      setActivePeriod(trends[0].period);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trends]);

  // Carrega módulos e marca ready (sem esperar por visibilidade)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadHighchartsModules();
        if (cancelled) return;
        // força render no próximo frame
        requestAnimationFrame(() => !cancelled && setReady(true));
      } catch (e) {
        console.error('[RecTrendChart] Falha ao carregar Highcharts:', e);
        if (!cancelled) setFailed(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Reflows agressivos (inicial + backoff + resize + viewport + load)
  useEffect(() => {
    if (!ready) return;

    const reflow = () => {
      try {
        const chart = chartRef.current?.chart;
        chart?.reflow?.();
        chart?.redraw?.();
      } catch {}
    };

    // 1) agora + próximos frames
    const raf1 = requestAnimationFrame(reflow);
    const raf2 = requestAnimationFrame(() => setTimeout(reflow, 0));

    // 2) backoff (cobre tabs/accordions/layout tardio)
    const timeouts = [80, 200, 450, 900, 1600, 2600].map(ms =>
      window.setTimeout(reflow, ms)
    );

    // 3) resize/viewport/onload
    let ro: ResizeObserver | null = null;
    if (containerRef.current && 'ResizeObserver' in window) {
      ro = new ResizeObserver(reflow);
      ro.observe(containerRef.current);
    }
    const onResize = () => reflow();
    window.addEventListener('resize', onResize);

    let io: IntersectionObserver | null = null;
    if (containerRef.current && 'IntersectionObserver' in window) {
      io = new IntersectionObserver((entries) => {
        for (const e of entries) if (e.isIntersecting) reflow();
      }, { threshold: 0.05 });
      io.observe(containerRef.current);
    }

    const onLoad = () => reflow();
    window.addEventListener('load', onLoad);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      timeouts.forEach(clearTimeout);
      if (ro) ro.disconnect();
      if (io) io.disconnect();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('load', onLoad);
    };
  }, [ready]);

  // -------- UI States --------
  if (!trends.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[280px] text-center">
        <IconUsersGroup size={40} className="text-gray-400 dark:text-gray-500 mb-4" />
        <h4 className="font-semibold text-gray-700 dark:text-gray-300">Sentimento dos Analistas</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Dados de recomendações não disponíveis.</p>
      </div>
    );
  }

  if (failed) {
    return (
      <div className="flex flex-col items-center justify-center h-[220px] text-center rounded-lg bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700">
        <IconUsersGroup size={32} className="text-gray-400 dark:text-gray-500 mb-2" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Não foi possível carregar o gráfico agora. Tenta recarregar a página.
        </p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex justify-center items-center h-[240px]">
        <svg className="animate-spin w-6 h-6 text-blue-500" viewBox="0 0 24 24">
          <circle className="opacity-25" r="10" cx="12" cy="12" strokeWidth="4" stroke="currentColor" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  // -------- Cálculos --------
  const activeTrend = trends.find(t => t.period === activePeriod) || trends[0];
  const strongBuy = Number(activeTrend.strongBuy || 0);
  const buy = Number(activeTrend.buy || 0);
  const hold = Number(activeTrend.hold || 0);
  const underperform = Number(activeTrend.underperform || 0);
  const sell = Number(activeTrend.sell || 0);
  const total = strongBuy + buy + hold + underperform + sell;

  const score =
    total > 0
      ? (strongBuy * 5 + buy * 4 + hold * 3 + underperform * 2 + sell * 1) / total
      : 0;

  const getSentiment = (s: number) => {
    if (s >= 4.5) return { text: 'Compra Muito Forte', color: '#10b981' };
    if (s >= 3.5) return { text: 'Comprar', color: '#22c55e' };
    if (s >= 2.5) return { text: 'Manter', color: '#facc15' };
    if (s >= 1.5) return { text: 'Vender', color: '#f97316' };
    return { text: 'Venda Forte', color: '#ef4444' };
  };

  const sentiment = getSentiment(score);
  const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');

  const options: Highcharts.Options = {
    chart: { type: 'solidgauge', backgroundColor: 'transparent', height: 200, margin: [0,0,0,0] },
    title: { text: undefined },
    credits: { enabled: false },
    exporting: { enabled: false },
    pane: {
      center: ['50%', '70%'],
      size: '120%',
      startAngle: -90,
      endAngle: 90,
      background: [{
        backgroundColor: isDark ? '#374151' : '#e5e7eb',
        innerRadius: '60%',
        outerRadius: '100%',
        shape: 'arc',
        borderWidth: 0,
      }]
    },
    yAxis: {
      min: 1, max: 5,
      stops: [ [0.1, '#ef4444'], [0.3, '#f97316'], [0.5, '#facc15'], [0.7, '#22c55e'], [0.9, '#10b981'] ],
      lineWidth: 0, tickAmount: 2, labels: { enabled: false },
    },
    plotOptions: {
      solidgauge: { dataLabels: { enabled: false }, linecap: 'round', stickyTracking: false, rounded: true }
    },
    tooltip: { enabled: false },
    series: [{
      type: 'solidgauge',
      name: 'Sentimento',
      data: [Number.isFinite(score) ? Number(score.toFixed(4)) : 0],
    }]
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center p-1 bg-gray-100 dark:bg-gray-800 rounded-lg mb-4">
        {trends.map(trend => (
          <button
            key={trend.period}
            onClick={() => setActivePeriod(trend.period)}
            className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${
              activePeriod === trend.period
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {trend.period.replace('m', ' Mês')}
          </button>
        ))}
      </div>

      <div ref={containerRef} className="relative w-full">
        <HighchartsReact
          ref={chartRef}
          highcharts={Highcharts}
          options={options}
          containerProps={{ style: { width: '100%', height: '200px' } }} // altura fixa evita 0px
        />

        <div className="absolute bottom-[20%] left-0 right-0 text-center pointer-events-none">
          <div className="font-bold text-4xl text-gray-900 dark:text-gray-100">{score.toFixed(2)}</div>
          <div className="font-semibold text-lg" style={{ color: sentiment.color }}>{sentiment.text}</div>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400 mt-2">
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" /> <span>Compra Forte ({strongBuy})</span></div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" /> <span>Comprar ({buy})</span></div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#facc15]" /> <span>Manter ({hold})</span></div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#f97316]" /> <span>Vender ({underperform})</span></div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" /> <span>Venda Forte ({sell})</span></div>
      </div>
    </div>
  );
};

export default RecTrendChart;
