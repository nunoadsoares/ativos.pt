// packages/webapp/src/components/HousingPriceChart.tsx
import { useEffect, useState, useMemo } from 'react';
import ApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

// --- Tipos e Constantes ---
type Point = [number, number]; // [timestamp, value]
interface SeriesData {
  total: Point[];
  new: Point[];
  existing: Point[];
}
type View = keyof SeriesData;

interface ApiPoint { date: string, value: number };
type ApiData = Record<View, ApiPoint[]>;

const SERIES_LABELS: Record<View, string> = {
  total: 'o total do mercado',
  new: 'os alojamentos novos',
  existing: 'os alojamentos existentes',
};

// --- Componente ---
export default function HousingPriceChart() {
  const [seriesData, setSeriesData] = useState<SeriesData | null>(null);
  const [activeView, setActiveView] = useState<View>('total');
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  // --- Efeitos ---
  useEffect(() => {
    const isDark = () => document.documentElement.classList.contains('dark');
    const updateTheme = () => setTheme(isDark() ? 'dark' : 'light');
    updateTheme();
    const obs = new MutationObserver(updateTheme);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    fetch('/api/data/housingPriceIndexChart')
      .then(res => res.json())
      .then((data: ApiData) => {
        // Transforma os dados da API (com datas em string) para o formato que o gráfico precisa (com timestamps)
        const formattedData: SeriesData = {
            total: data.total.map(p => [new Date(p.date).getTime(), p.value]),
            new: data.new.map(p => [new Date(p.date).getTime(), p.value]),
            existing: data.existing.map(p => [new Date(p.date).getTime(), p.value]),
        };
        setSeriesData(formattedData);
      })
      .catch(console.error);
  }, []);
  
  // --- Cálculos e Texto Dinâmico ---
  const dynamicSummary = useMemo(() => {
    if (!seriesData || seriesData[activeView].length < 2) return null;

    const activeSeries = seriesData[activeView];
    const lastPoint = activeSeries[activeSeries.length - 1];
    const prevPoint = activeSeries[activeSeries.length - 2];

    const lastValue = lastPoint[1];
    const prevValue = prevPoint[1];
    const quarterlyChange = ((lastValue / prevValue) - 1) * 100;
    
    const lastDate = new Date(lastPoint[0]).toLocaleString('pt-PT', { month: 'long', year: 'numeric' });

    return {
      label: SERIES_LABELS[activeView],
      lastValue: lastValue.toFixed(2),
      quarterlyChange: quarterlyChange.toFixed(2),
      changeDirection: quarterlyChange >= 0 ? 'subiu' : 'desceu',
      changeColor: quarterlyChange >= 0 ? 'text-red-600' : 'text-green-600',
      lastDate,
    };
  }, [seriesData, activeView]);

  const displaySeries = useMemo(() => {
    if (!seriesData) return [];
    const seriesNames: Record<View, string> = {
      total: 'Índice de Preços (Total)',
      new: 'Índice de Preços (Aloj. Novos)',
      existing: 'Índice de Preços (Aloj. Existentes)',
    };
    return [{
      name: seriesNames[activeView],
      data: seriesData[activeView],
    }];
  }, [seriesData, activeView]);

  if (!seriesData) {
    return <div className="text-center py-10">A carregar gráfico...</div>;
  }

  const labelColor = theme === 'dark' ? '#e5e7eb' : '#374151';
  const gridColor = theme === 'dark' ? '#4b5563' : '#e5e7eb';
  
  const options: ApexOptions = {
    chart: { id: 'housing-price-index', toolbar: { show: true }, zoom: { enabled: true }, background: 'transparent' },
    stroke: { width: 2.5, curve: 'smooth' },
    xaxis: { type: 'datetime', labels: { style: { colors: labelColor, fontWeight: 500 } }, axisBorder: { color: gridColor }, axisTicks: { color: gridColor }},
    yaxis: { labels: { formatter: (v: number) => v.toFixed(0), style: { colors: labelColor, fontWeight: 500 }}},
    tooltip: { theme, x: { format: 'dd MMM yyyy' } },
    grid: { borderColor: gridColor },
    dataLabels: { enabled: false },
    colors: ['#6366f1'], // Cor unificada para o gráfico
  };

  return (
    <div>
      <div className="flex flex-wrap justify-center items-center gap-2 mb-4">
        {(Object.keys(SERIES_LABELS) as View[]).map(view => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            className={`px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-bold rounded-full transition ${ activeView === view ? 'bg-primary text-white shadow-lg' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
          >
            {view === 'total' ? 'Total' : view === 'new' ? 'Aloj. Novos' : 'Aloj. Existentes'}
          </button>
        ))}
      </div>

      {dynamicSummary && (
        <div className="mt-6 p-4 border-l-4 border-primary-500 bg-primary-50 dark:bg-primary-900/20 rounded-r-lg">
          <p className="text-gray-700 dark:text-gray-300">
            Analisando <strong>{dynamicSummary.label}</strong>, o último índice registado em <strong>{dynamicSummary.lastDate}</strong> foi de <strong>{dynamicSummary.lastValue}</strong>.
            Isto representa uma variação de <span className={`font-bold ${dynamicSummary.changeColor}`}>{dynamicSummary.quarterlyChange}%</span> ({dynamicSummary.changeDirection}) face ao trimestre anterior.
          </p>
        </div>
      )}

      <div className="mt-4">
        <ApexChart
          type="area"
          height={400}
          series={displaySeries}
          options={options}
        />
      </div>
    </div>
  );
}