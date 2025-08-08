// packages/webapp/src/components/acoes/StockChart.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Highcharts from 'highcharts/highstock';
import HighchartsReactOfficial from 'highcharts-react-official';

/* ------------------------------------------------------------------ */
/* 1. Carregar módulos Highcharts                                     */
/* ------------------------------------------------------------------ */
let annotationsLoaded = false;
function loadAnnotations(): Promise<void> {
  if (annotationsLoaded || typeof window === 'undefined') return Promise.resolve();
  return import('highcharts/modules/annotations')
    .then((m) => {
      (m as any).default?.(Highcharts) || (m as any)(Highcharts);
      annotationsLoaded = true;
    })
    .catch((err) => console.error('Erro a carregar annotations:', err));
}

if (typeof window !== 'undefined') {
  import('highcharts/modules/exporting').then((m) => (m as any).default(Highcharts));
}

/* ------------------------------------------------------------------ */
/* 2. Tipos e dados                                                   */
/* ------------------------------------------------------------------ */
const HighchartsReact =
  ((HighchartsReactOfficial as any).default as typeof HighchartsReactOfficial) ||
  HighchartsReactOfficial;

interface StockChartProps extends React.HTMLAttributes<HTMLDivElement> {
  chartData: [number, number][];
  companyName: string;
}

const ranges = [
  { key: '1D', text: '1D', ms: 24 * 3600_000 },
  { key: '1W', text: '1S', ms: 7 * 24 * 3600_000 },
  { key: '1M', text: '1M', ms: 30 * 24 * 3600_000 },
  { key: '3M', text: '3M', ms: 90 * 24 * 3600_000 },
  { key: '6M', text: '6M', ms: 180 * 24 * 3600_000 },
  { key: 'YTD', text: 'YTD' },
  { key: '1Y', text: '1A', ms: 365 * 24 * 3600_000 },
  { key: 'ALL', text: 'Tudo' },
];

/* ------------------------------------------------------------------ */
/* 3. Componente                                                      */
/* ------------------------------------------------------------------ */
const StockChart: React.FC<StockChartProps> = ({ chartData, companyName, ...rest }) => {
  const chartRef = useRef<HighchartsReactOfficial.RefObject>(null);
  const [ready, setReady] = useState(false);
  const [range, setRange] = useState('YTD');
  const [perf, setPerf] = useState<string | null>(null);

  const isDark =
    typeof window !== 'undefined' &&
    document.documentElement.classList.contains('dark');

/* ------------ helpers -------------------------------------------- */
  const applyRange = useCallback(
    (k: string) => {
      const chart = chartRef.current?.chart;
      if (!chart || !chartData.length) return;
      const now = Date.now();
      if (k === 'ALL') {
        chart.xAxis[0].setExtremes(undefined, undefined);
        return;
      }
      if (k === 'YTD') {
        chart.xAxis[0].setExtremes(new Date(new Date().getFullYear(), 0, 1).getTime(), now);
        return;
      }
      const r = ranges.find((r) => r.key === k);
      if (r?.ms) chart.xAxis[0].setExtremes(now - r.ms, now);
    },
    [chartData.length],
  );

  const calcPerf = useCallback(() => {
    const chart = chartRef.current?.chart;
    if (!chart) return;
    const pts = chart.series[0]?.points ?? [];
    if (pts.length < 2) return;
    const { min, max } = chart.xAxis[0].getExtremes();
    const vis = pts.filter((p) => p.x >= min && p.x <= max);
    if (vis.length < 2) return;
    const first = vis[0], last = vis[vis.length - 1];
    if (!first.y || !last.y) return;
    const pct = ((last.y - first.y) / first.y) * 100;
    setPerf(`${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`);
  }, []);

  /* ------------ efeitos ------------------------------------------- */
  useEffect(() => {
    loadAnnotations().then(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready) {
      applyRange(range);      // garante YTD à 1ª render
      calcPerf();
    }
  }, [ready, range, applyRange, calcPerf]);

/* ------------ Spinner -------------------------------------------- */
  if (!ready) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <svg className="animate-spin w-6 h-6 text-blue-500" viewBox="0 0 24 24">
          <circle className="opacity-25" r="10" cx="12" cy="12" strokeWidth="4" stroke="currentColor" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      </div>
    );
  }

/* ------------ Highcharts options --------------------------------- */
  const options: Highcharts.Options = {
    time: { useUTC: false },
    chart: {
      backgroundColor: 'transparent',
      plotBackgroundColor: 'transparent',
      style: { fontFamily: 'Inter, sans-serif' },
      events: { redraw: calcPerf },
      spacing: [0, 0, 8, 0],
    },
    title: { text: undefined },
    credits: { enabled: false },
    xAxis: {
      type: 'datetime',
      gridLineColor: isDark ? '#374151' : '#e5e7eb',
      lineColor: isDark ? '#4b5563' : '#9ca3af',
      labels: { style: { color: isDark ? '#d1d5db' : '#4b5563' } },
    },
    yAxis: {
      opposite: true,
      gridLineColor: isDark ? '#374151' : '#e5e7eb',
      labels: { style: { color: isDark ? '#d1d5db' : '#4b5563' } },
      title: { text: undefined },
    },
    tooltip: {
      shared: true,
      backgroundColor: isDark ? '#374151' : '#f9fafb',
      borderColor: isDark ? '#4b5563' : '#cbd5e1',
      style: { color: isDark ? '#f3f4f6' : '#1f2937' },
      headerFormat: '',
      pointFormat: '<b>${point.y:.2f}</b>',
    },
    navigator: { enabled: false },
    scrollbar: { enabled: false },
    rangeSelector: { enabled: false },
    exporting: { enabled: false },
    series: [
      {
        type: 'area',
        name: companyName,
        data: chartData,
        lineColor: '#3b82f6',
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, Highcharts.color('#3b82f6').setOpacity(0.4).get('rgba') as string],
            [1, Highcharts.color('#3b82f6').setOpacity(0).get('rgba') as string],
          ],
        },
      },
    ],
  };

/* ------------ Render --------------------------------------------- */
  return (
    <div {...rest}>
      {/* header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 px-2">
        {perf && (
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Variação no período:{' '}
            <span className={`font-semibold ${perf.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
              {perf}
            </span>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {ranges.map((r) => (
            <button
              key={r.key}
              onClick={() => { setRange(r.key); applyRange(r.key); }}
              className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${
                range === r.key
                  ? 'bg-blue-500 text-white'
                  : 'bg-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {r.text}
            </button>
          ))}
        </div>
      </div>

      {/* gráfico */}
      <HighchartsReact
        highcharts={Highcharts}
        constructorType="stockChart"
        options={options}
        ref={chartRef}
      />
    </div>
  );
};

export default StockChart;
