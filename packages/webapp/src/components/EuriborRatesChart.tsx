// C:\Users\nunos\Desktop\ativos.pt\packages\webapp\src\components\EuriborRatesChart.tsx
import { useEffect, useMemo, useState } from 'react';
import type { ApexOptions } from 'apexcharts';

// Tipos do payload
interface ApiPoint { date: string; value: number }
interface ApiData { [period: string]: ApiPoint[] }
interface ApiResponse {
  ok?: boolean;
  kind?: string;
  key?: string;
  data?: ApiData;        // formato preferido
  // fallback: alguns endpoints antigos podem devolver diretamente o mapa
  [k: string]: any;
}

interface Series {
  name: string;
  data: [number, number][]; // [timestamp, value]
}

interface Props {
  periods: ('3_meses' | '6_meses' | '12_meses')[];
}

// Normalizar nome para a legenda
function labelFromPeriod(p: '3_meses' | '6_meses' | '12_meses') {
  if (p === '3_meses') return 'Euribor 3M';
  if (p === '6_meses') return 'Euribor 6M';
  return 'Euribor 12M';
}

// Tentar várias chaves possíveis na resposta
function resolveSeriesArray(source: ApiData | undefined, p: string): ApiPoint[] | undefined {
  if (!source) return undefined;
  // 1) chave exata
  if (Array.isArray(source[p])) return source[p];
  // 2) fallback para 3m/6m/12m
  const map: Record<string, string> = { '3_meses': '3m', '6_meses': '6m', '12_meses': '12m' };
  const alt = map[p];
  if (alt && Array.isArray(source[alt])) return source[alt];
  return undefined;
}

export default function EuriborRatesChart({ periods }: Props) {
  const [ApexComp, setApexComp] = useState<null | ((props: any) => JSX.Element)>(null);
  const [series, setSeries] = useState<Series[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Carregar react-apexcharts apenas no cliente
  useEffect(() => {
    let mounted = true;
    if (typeof window === 'undefined') return;
    import('react-apexcharts')
      .then((m) => {
        if (!mounted) return;
        const Comp = (m as any).default ?? (m as any);
        setApexComp(() => Comp);
      })
      .catch((e) => {
        console.error('Falha a carregar react-apexcharts:', e);
        setLoadError('Falha a inicializar o gráfico');
      });
    return () => { mounted = false; };
  }, []);

  // Tema + responsive
  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    const isDark = () => document.documentElement.classList.contains('dark');
    setTheme(isDark() ? 'dark' : 'light');

    const mo = new MutationObserver(() => setTheme(isDark() ? 'dark' : 'light'));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    const onResize = () => setIsMobile(window.innerWidth <= 768);
    onResize();
    window.addEventListener('resize', onResize);

    return () => {
      mo.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, []);

  // Buscar dados (robusto + timeout + retry curto)
  useEffect(() => {
    if (!ApexComp) return; // só buscar quando o componente do chart existir
    let mounted = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000); // 15s

    async function load(retry = false) {
      try {
        setLoading(true);
        setLoadError(null);

        const resp = await fetch('/api/data/euriborRatesChart', {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const payload = (await resp.json()) as ApiResponse;

        // Extrair o dicionário de séries (aceita {ok,data:{...}} ou {...} direto)
        const bag: ApiData | undefined =
          (payload && typeof payload === 'object' && payload.data && typeof payload.data === 'object')
            ? payload.data as ApiData
            : (payload as unknown as ApiData);

        if (!bag || typeof bag !== 'object') {
          throw new Error('Resposta da API sem campo "data" válido');
        }

        const built: Series[] = periods
          .map((p) => {
            const rows = resolveSeriesArray(bag, p);
            if (!Array.isArray(rows)) return null;
            return {
              name: labelFromPeriod(p),
              data: rows.map((r) => [new Date(r.date).getTime(), Number(r.value ?? 0)]),
            };
          })
          .filter((x): x is Series => x !== null);

        if (!mounted) return;
        setSeries(built);
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        console.error('Erro a carregar euriborRatesChart:', err);
        if (!retry) {
          // pequeno retry para apanhar race conditions iniciais
          setTimeout(() => { if (mounted) load(true); }, 400);
          return;
        }
        if (mounted) {
          setLoadError(err?.message || 'Erro a carregar dados');
          setSeries([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [periods, ApexComp]);

  const chartOptions: ApexOptions = useMemo(() => {
    const labelColor = theme === 'dark' ? '#e5e7eb' : '#374151';
    const gridColor = theme === 'dark' ? '#4b5563' : '#e5e7eb';

    return {
      chart: {
        id: 'euribor-rates-chart',
        type: 'line',
        height: isMobile ? 350 : 450,
        zoom: { enabled: true, type: 'x' },
        toolbar: { show: true, tools: { download: false } },
        background: 'transparent',
      },
      stroke: { width: 3, curve: 'smooth' },
      xaxis: {
        type: 'datetime',
        labels: { style: { colors: labelColor, fontWeight: 500 } },
        axisBorder: { show: false },
        axisTicks: { color: gridColor },
      },
      yaxis: {
        labels: {
          formatter: (v: number) => `${(v ?? 0).toFixed(2)}%`,
          style: { colors: labelColor, fontWeight: 500 },
        },
        title: { text: 'Taxa (%)', style: { color: labelColor } },
      },
      tooltip: {
        theme,
        x: { format: 'dd MMM yyyy' },
        y: { formatter: (v: number) => `${(v ?? 0).toFixed(3)}%` },
      },
      legend: {
        position: isMobile ? 'bottom' : 'top',
        horizontalAlign: 'center',
        fontSize: '14px',
        itemMargin: { horizontal: 10, vertical: 5 },
        labels: { colors: labelColor },
      },
      grid: {
        borderColor: gridColor,
        strokeDashArray: 4,
        xaxis: { lines: { show: false } },
      },
      colors: ['#3b82f6', '#f97316', '#ef4444'],
    };
  }, [theme, isMobile]);

  // Estados de UI
  if (!ApexComp) return <div className="text-center p-8">A preparar gráfico…</div>;
  if (loading) return <div className="text-center p-8">A carregar dados do gráfico...</div>;
  if (loadError) return <div className="text-center p-8 text-red-600">Erro: {loadError}</div>;
  if (!series.length) return <div className="text-center p-8">Sem dados para mostrar.</div>;

  const Chart = ApexComp;
  return <Chart type="line" series={series} options={chartOptions} height={isMobile ? 350 : 450} />;
}
