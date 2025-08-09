// packages/webapp/src/components/HousingPriceChart.tsx
import React, { useEffect, useState, useMemo, type FC, type ComponentType } from 'react';
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
interface ApiResponse { ok: boolean; data: Record<View, ApiPoint[]> };

const SERIES_LABELS: Record<View, string> = {
    total: 'o total do mercado',
    new: 'os alojamentos novos',
    existing: 'os alojamentos existentes',
};

const ChartPlaceholder: FC<{ message: string }> = ({ message }) => (
    <div className="flex h-96 items-center justify-center text-center p-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">{message}</p>
    </div>
);

// --- Componente ---
const HousingPriceChart: FC = () => {
    // Estado para o componente do gráfico, que só carrega no browser
    const [ChartComponent, setChartComponent] = useState<ComponentType<any> | null>(null);

    const [seriesData, setSeriesData] = useState<SeriesData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeView, setActiveView] = useState<View>('total');
    const [theme, setTheme] = useState<'dark' | 'light'>('light');

    // Efeito para carregar o componente do gráfico de forma segura
    useEffect(() => {
        import('react-apexcharts')
            .then(mod => setChartComponent(() => mod.default))
            .catch(err => {
                console.error("Falha ao carregar ApexCharts:", err);
                setError("Não foi possível carregar o componente do gráfico.");
            });
    }, []);

    // Efeito para gerir o tema
    useEffect(() => {
        const isDark = () => document.documentElement.classList.contains('dark');
        const updateTheme = () => setTheme(isDark() ? 'dark' : 'light');
        updateTheme();
        const obs = new MutationObserver(updateTheme);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => obs.disconnect();
    }, []);

    // Efeito para ir buscar os dados
    useEffect(() => {
        fetch('/api/data/housingPriceIndexChart')
            .then(res => {
                if (!res.ok) throw new Error("Falha na resposta do servidor.");
                return res.json();
            })
            .then((response: ApiResponse) => {
                const data = response.data;
                const formattedData: SeriesData = {
                    total: data.total.map(p => [new Date(p.date).getTime(), p.value]),
                    new: data.new.map(p => [new Date(p.date).getTime(), p.value]),
                    existing: data.existing.map(p => [new Date(p.date).getTime(), p.value]),
                };
                setSeriesData(formattedData);
            })
            .catch(err => {
                console.error("Erro ao carregar dados do gráfico de habitação:", err);
                setError("Não foi possível carregar os dados do gráfico.");
            });
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

    const options: ApexOptions = useMemo(() => ({
        chart: { id: 'housing-price-index', toolbar: { show: true }, zoom: { enabled: true }, background: 'transparent' },
        stroke: { width: 2.5, curve: 'smooth' },
        xaxis: { type: 'datetime', labels: { style: { colors: theme === 'dark' ? '#9ca3af' : '#4b5563' } } },
        yaxis: { labels: { formatter: (v: number) => v.toFixed(0), style: { colors: theme === 'dark' ? '#9ca3af' : '#4b5563' }}},
        tooltip: { theme, x: { format: 'dd MMM yyyy' } },
        grid: { borderColor: theme === 'dark' ? '#374151' : '#e5e7eb' },
        dataLabels: { enabled: false },
        colors: ['#6366f1'],
    }), [theme]);

    if (error) return <ChartPlaceholder message={error} />;
    if (!ChartComponent || !seriesData) return <ChartPlaceholder message="A carregar dados do gráfico..." />;

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
                <ChartComponent
                    type="area"
                    height={400}
                    series={displaySeries}
                    options={options}
                />
            </div>
        </div>
    );
};

export default HousingPriceChart;