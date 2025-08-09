// C:\Users\nunos\Desktop\ativos.pt\packages\webapp\src\components\EuriborCompareChart.tsx
import { useEffect, useMemo, useState } from 'react';
import type { ApexOptions } from 'apexcharts';

interface ApiSeriesPoint { date: string; value: number }
interface ApiData { [period: string]: ApiSeriesPoint[] }
interface ApiResponse { ok: boolean; kind: string; key: string; data: ApiData }

interface Series {
  name: string;
  data: [number, number][];
}

interface Props {
  periods: ('3m' | '6m' | '12m')[];
}

export default function EuriborCompareChart({ periods }: Props) {
  const [ApexComp, setApexComp] = useState<null | ((props: any) => JSX.Element)>(null);
  const [series, setSeries] = useState<Series[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 1) Carregar react-apexcharts apenas no cliente
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

  // 2) Tema + responsive
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

  // 3) Buscar dados (com timeout, no-store e validação)
  useEffect(() => {
    if (!ApexComp) return; // só buscar quando o componente do chart existir
    let mounted = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000); // 15s timeout

    async function fetchData(retry = false) {
      try {
        setLoading(true);
        setLoadError(null);

        const resp = await fetch('/api/data/euriborQuotasChart', {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
          headers: { 'Accept': 'application/json' },
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const payload = (await resp.json()) as ApiResponse;

        if (!payload?.ok || !payload?.data || typeof payload.data !== 'object') {
          throw new Error('Estrutura inválida da API');
        }

        const built: Series[] = periods
          .map((p) => {
            const rows = payload.data[p];
            if (!Array.isArray(rows)) return null;
            return {
              name: `Quota Euribor ${p.replace('m', 'M')}`,
              data: rows.map((r) => [new Date(r.date).getTime(), Number(r.value ?? 0)]),
            };
          })
          .filter((x): x is Series => x !== null);

        if (!mounted) return;
        setSeries(built);
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        console.error('Erro a carregar euriborQuotasChart:', err);
        if (!retry) {
          // pequeno retry para apanhar race conditions iniciais
          setTimeout(() => { if (mounted) fetchData(true); }, 400);
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

    fetchData();
    return () => {
      mounted = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [periods, ApexComp]);

  const options: ApexOptions = useMemo(() => {
    const labelColor = theme === 'dark' ? '#fff' : '#222';
    const gridColor = theme === 'dark' ? '#555' : '#eee';

    return {
      chart: {
        id: 'euribor-compare',
        type: 'line',
        height: isMobile ? 350 : 450,
        zoom: { enabled: true },
        toolbar: { show: true },
        background: 'transparent',
      },
      stroke: { width: 2, curve: 'smooth' },
      xaxis: {
        type: 'datetime',
        labels: { style: { colors: labelColor, fontWeight: 500 } },
        axisBorder: { color: gridColor },
        axisTicks: { color: gridColor },
      },
      yaxis: {
        min: 0,
        max: 100,
        labels: {
          formatter: (v: number) => v.toFixed(1) + '%',
          style: { colors: labelColor, fontWeight: 500 },
        },
        title: { text: 'Quota de Mercado (%)', style: { color: labelColor } },
      },
      tooltip: {
        theme,
        style: { fontSize: '12px' },
        x: { format: 'MMM yyyy' },
        y: { formatter: (v: number) => `${(v ?? 0).toFixed(2)}%` },
      },
      legend: {
        position: isMobile ? 'bottom' : 'top',
        horizontalAlign: 'center',
        fontSize: isMobile ? '13px' : '15px',
        itemMargin: { horizontal: 12, vertical: 6 },
        labels: { colors: labelColor },
      },
      grid: { borderColor: gridColor },
      colors: ['#3b82f6', '#f97316', '#ef4444'],
      responsive: [
        {
          breakpoint: 768,
          options: {
            chart: { toolbar: { offsetY: 20 } },
            legend: {
              position: 'bottom',
              offsetY: 10,
              fontSize: '13px',
              floating: false,
              itemMargin: { horizontal: 12, vertical: 6 },
            },
          },
        },
      ],
    };
  }, [theme, isMobile]);

  // UI states
  if (!ApexComp) return <p className="text-center p-8">A preparar gráfico…</p>;
  if (loading) return <p className="text-center p-8">A carregar dados do gráfico...</p>;
  if (loadError) return <p className="text-center p-8 text-red-600">Erro: {loadError}</p>;
  if (!series.length) return <p className="text-center p-8">Sem dados para mostrar.</p>;

  const Chart = ApexComp;
  return <Chart type="line" height={isMobile ? 350 : 450} series={series} options={options} />;
}
