// packages/webapp/src/components/ExchangeRatesChart.tsx
import { useEffect, useMemo, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

// ---- Tipos compatíveis com a tua API ----
type Point = { date: string; value: number };
type ApiData = Record<string, Point[]>;

type Envelope =
  | { ok?: boolean; kind?: string; key?: string; data: ApiData }
  | ApiData;

interface Series {
  name: string;
  data: [number, number][];
}

// Mapa de moedas -> nome/cor (códigos em minúsculas)
const currencyMap = {
  usd: { name: 'Dólar (USD)', color: '#16a34a' },
  gbp: { name: 'Libra (GBP)', color: '#2563eb' },
  chf: { name: 'Franco Suíço (CHF)', color: '#dc2626' },
  cad: { name: 'Dólar Canadiano (CAD)', color: '#f97316' },
  aud: { name: 'Dólar Australiano (AUD)', color: '#9333ea' },
  cny: { name: 'Yuan Chinês (CNY)', color: '#f59e0b' },
  brl: { name: 'Real Brasileiro (BRL)', color: '#14b8a6' },
} as const;

interface Props {
  // quando vens de /cambios/[...pares], recebes algo como ['chf','brl']
  periods?: string[];
}

// Normaliza o payload da API (aceita envelope ou objeto simples)
function unwrap(raw: Envelope): ApiData {
  const base: any = (raw as any)?.data ?? raw;
  // normaliza chaves para minúsculas, p.ex. "USD" -> "usd"
  const out: ApiData = {};
  Object.keys(base || {}).forEach((k) => {
    const key = k.toLowerCase();
    const v = (base as any)[k];
    // alguns backends devolvem {series:[...]} — suporta isso também
    const arr: Point[] = Array.isArray(v) ? v : (v?.series ?? v?.values ?? []);
    out[key] = (arr || []).map((p: any) => ({
      date: String(p.date),
      value: Number(p.value),
    }));
  });
  return out;
}

export default function ExchangeRatesChart({ periods }: Props) {
  const [series, setSeries] = useState<Series[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [isMobile, setIsMobile] = useState(false);

  // Tema + largura
  useEffect(() => {
    const isDark = () => document.documentElement.classList.contains('dark');
    setTheme(isDark() ? 'dark' : 'light');

    const obs = new MutationObserver(() => setTheme(isDark() ? 'dark' : 'light'));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    const onResize = () => setIsMobile(window.innerWidth <= 768);
    onResize();
    window.addEventListener('resize', onResize);

    return () => {
      obs.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, []);

  // Buscar dados da API
  useEffect(() => {
    const ctrl = new AbortController();
    fetch('/api/data/exchangeRatesChart', {
      cache: 'no-cache',
      signal: ctrl.signal,
      headers: { 'x-requested-with': 'ExchangeRatesChart' },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json: Envelope) => {
        const payload = unwrap(json);

        const wanted =
          periods && periods.length
            ? periods.map((c) => c.toLowerCase())
            : (Object.keys(currencyMap) as Array<keyof typeof currencyMap>);

        const next: Series[] = wanted
          .map((code) => {
            const meta = (currencyMap as any)[code];
            const rows = payload[code];
            if (!meta || !rows?.length) return null;
            return {
              name: meta.name,
              data: rows.map((r) => [new Date(r.date).getTime(), r.value] as [number, number]),
            };
          })
          .filter(Boolean) as Series[];

        setSeries(next);
      })
      .catch((err) => {
        console.error('[ExchangeRatesChart] erro a carregar:', err);
        setSeries([]); // mantém placeholder
      });

    return () => ctrl.abort();
  }, [periods]);

  const chartOptions: ApexOptions = useMemo(() => {
    const labelColor = theme === 'dark' ? '#e5e7eb' : '#374151';
    const gridColor = theme === 'dark' ? '#4b5563' : '#e5e7eb';
    const colors = (periods && periods.length ? periods : Object.keys(currencyMap))
      .map((c) => (currencyMap as any)[c]?.color)
      .filter(Boolean) as string[];

    return {
      chart: {
        height: 500,
        type: 'line',
        zoom: { enabled: true, type: 'x' },
        toolbar: { show: true, tools: { download: false, pan: true, reset: true, zoom: true, zoomin: true, zoomout: true } },
        background: 'transparent',
      },
      stroke: { width: 2, curve: 'smooth' },
      xaxis: { type: 'datetime', labels: { style: { colors: labelColor } } },
      yaxis: {
        labels: { formatter: (v) => v.toFixed(2), style: { colors: labelColor } },
        title: { text: '1 Euro equivale a...', style: { color: labelColor, fontWeight: 'normal' } },
      },
      tooltip: { theme, x: { format: 'dd MMM yyyy' }, y: { formatter: (v) => v.toFixed(4) } },
      legend: {
        position: 'top',
        horizontalAlign: 'left',
        fontSize: '14px',
        labels: { colors: labelColor },
        itemMargin: { horizontal: 10, vertical: 5 },
        markers: { radius: 6 },
        onItemClick: { toggleDataSeries: true },
      },
      grid: { borderColor: gridColor, strokeDashArray: 3 },
      colors,
    };
  }, [theme, isMobile, periods]);

  if (!series.length) {
    return (
      <div className="flex h-96 items-center justify-center text-center p-8">
        A carregar dados do gráfico...
      </div>
    );
  }

  return <ReactApexChart options={chartOptions} series={series} type="line" height={500} />;
}
