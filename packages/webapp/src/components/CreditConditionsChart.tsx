// packages/webapp/src/components/CreditConditionsChart.tsx
import React, { useEffect, useState, useMemo, type FC } from 'react';
import type { ApexOptions } from 'apexcharts';

// Tipos de dados da nossa API
interface ApiSeriesData {
  date: string;
  value: number;
}

interface ApiResponse {
    ok: boolean;
    data: {
        [seriesCode: string]: ApiSeriesData[];
    }
}

interface Series {
  name: string;
  type: 'line' | 'column';
  data: [number, number][];
}

const ChartPlaceholder: FC<{ message: string }> = ({ message }) => (
    <div className="flex h-96 items-center justify-center text-center p-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">{message}</p>
    </div>
);

const CreditConditionsChart: FC = () => {
    // Estado para o componente do gráfico, que só carrega no browser
    const [ChartComponent, setChartComponent] = useState<FC<any> | null>(null);
    const [series, setSeries] = useState<Series[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [theme, setTheme] = useState<'light' | 'light'>('light');

    // Efeito para carregar o componente do gráfico dinamicamente
    useEffect(() => {
        import('react-apexcharts')
            .then(mod => {
                setChartComponent(() => mod.default);
            })
            .catch(err => {
                console.error("Falha ao carregar ApexCharts", err);
                setError("Não foi possível carregar o componente do gráfico.");
            });
    }, []);

    // Efeito para ir buscar os dados da API
    useEffect(() => {
        fetch('/api/data/creditConditionsChart')
            .then(res => {
                if (!res.ok) throw new Error('Falha na resposta do servidor.');
                return res.json();
            })
            .then((response: ApiResponse) => {
                const data = response.data;
                const createSeries = (code: string, name: string, type: 'line' | 'column'): Series | null => {
                    const seriesData = data[code];
                    if (!seriesData) return null;
                    return { name, type, data: seriesData.map(d => [new Date(d.date).getTime(), d.value ?? 0]) };
                };
                
                const finalSeries = [
                    createSeries('tan_variavel', 'TAN Variável', 'line'),
                    createSeries('tan_fixa', 'TAN Fixa', 'line'),
                    createSeries('prestacao_mediana', 'Prestação Mediana', 'column')
                ].filter((s): s is Series => s !== null);
                
                if (finalSeries.length === 0) {
                    throw new Error("Os dados recebidos da API estão vazios.");
                }

                setSeries(finalSeries);
            })
            .catch(err => {
                console.error("Erro ao carregar dados do gráfico de crédito:", err);
                setError('Não foi possível carregar os dados do gráfico.');
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    // Efeito para gerir o tema
    useEffect(() => {
        const isDarkMode = () => document.documentElement.classList.contains('dark');
        const updateTheme = () => setTheme(isDarkMode() ? 'dark' : 'light');
        updateTheme();
        const obs = new MutationObserver(updateTheme);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => obs.disconnect();
    }, []);

    const chartOptions: ApexOptions = useMemo(() => ({
        chart: {
            height: 450,
            type: 'line',
            stacked: false,
            toolbar: { show: true, tools: { download: false } },
            background: 'transparent',
        },
        stroke: { width: [3, 3, 0], curve: 'smooth' },
        xaxis: {
            type: 'datetime',
            labels: { style: { colors: theme === 'dark' ? '#9ca3af' : '#4b5563' } },
        },
        yaxis: [
            {
                seriesName: 'TAN Variável',
                axisTicks: { show: true },
                axisBorder: { show: true, color: '#3b82f6' },
                labels: {
                    style: { colors: '#3b82f6' },
                    formatter: (val) => `${val.toFixed(2)}%`,
                },
                title: { text: "Taxas de Juro (TAN)", style: { color: '#3b82f6' } },
            },
            { seriesName: 'TAN Fixa', show: false },
            {
                seriesName: 'Prestação Mediana',
                opposite: true,
                axisTicks: { show: true },
                axisBorder: { show: true, color: '#10b981' },
                labels: {
                    style: { colors: '#10b981' },
                    formatter: (val) => `€${val.toFixed(0)}`,
                },
                title: { text: "Prestação Mensal Mediana", style: { color: '#10b981' } },
            },
        ],
        tooltip: {
            theme,
            shared: true,
            intersect: false,
            x: { format: 'MMM yyyy' },
        },
        legend: {
            position: 'top',
            horizontalAlign: 'center',
            labels: { colors: theme === 'dark' ? '#e5e7eb' : '#374151' },
        },
        grid: { borderColor: theme === 'dark' ? '#374151' : '#e5e7eb', strokeDashArray: 4 },
        colors: ['#3b82f6', '#ef4444', '#10b981'],
    }), [theme]);

    if (loading || !ChartComponent) return <ChartPlaceholder message="A carregar dados do gráfico..." />;
    if (error) return <ChartPlaceholder message={error} />;

    return (
        <ChartComponent options={chartOptions} series={series} type="line" height={450} />
    );
};

export default CreditConditionsChart;