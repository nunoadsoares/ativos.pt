// C:\Users\nunos\Desktop\ativos.pt\packages\webapp\src\components\inflacao\InflationHistoricalChart.tsx
import React, { useEffect, useState, useMemo, type FC, type ComponentType } from 'react';
import type { ApexOptions } from 'apexcharts';

// Tipos de dados
interface ApiSeriesData { date: string, value: number };
interface ApiResponse {
    ok: boolean;
    data: {
        yoy: ApiSeriesData[];
        core_yoy: ApiSeriesData[];
    }
};

const ChartPlaceholder: FC<{ message: string }> = ({ message }) => (
    <div className="flex h-96 items-center justify-center text-center p-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">{message}</p>
    </div>
);

const InflationHistoricalChart: FC = () => {
    const [ChartComponent, setChartComponent] = useState<ComponentType<any> | null>(null);
    const [series, setSeries] = useState<ApexAxisChartSeries>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [theme, setTheme] = useState<'dark' | 'light'>('light');
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        import('react-apexcharts')
            .then(mod => setChartComponent(() => mod.default))
            .catch(err => {
                console.error("Falha ao carregar ApexCharts:", err);
                setError("Não foi possível carregar o componente do gráfico.");
            });
    }, []);

    useEffect(() => {
        const isDark = () => document.documentElement.classList.contains('dark');
        const updateTheme = () => setTheme(isDark() ? 'dark' : 'light');
        updateTheme();
        const obs = new MutationObserver(updateTheme);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => {
            obs.disconnect();
            window.removeEventListener('resize', checkMobile);
        };
    }, []);

    useEffect(() => {
        if (!ChartComponent) return;

        fetch('/api/data/inflationHistoricalChart')
            .then(res => {
                if (!res.ok) throw new Error("Falha na resposta do servidor.");
                return res.json();
            })
            .then((response: ApiResponse) => {
                const data = response.data;
                const formatData = (d: ApiSeriesData[]) => d ? d.map(p => [new Date(p.date).getTime(), p.value]) : [];
                
                setSeries([
                    { name: 'Inflação Homóloga', data: formatData(data.yoy) },
                    { name: 'Inflação Subjacente', data: formatData(data.core_yoy) },
                ]);
            })
            .catch(err => {
                console.error("Falha ao carregar dados históricos da inflação:", err);
                setError("Não foi possível carregar os dados do gráfico.");
            })
            .finally(() => {
                setLoading(false);
            });
    }, [ChartComponent]);

    const options: ApexOptions = useMemo(() => ({
        chart: {
            id: 'inflation-historical-chart',
            zoom: { enabled: true },
            toolbar: { show: true, tools: { download: false, pan: true, zoom: true, zoomin: true, zoomout: true, reset: true } },
            background: 'transparent',
        },
        colors: ['#a855f7', '#4f46e5'],
        stroke: { width: 2.5, curve: 'smooth' },
        xaxis: {
            type: 'datetime',
            labels: { style: { colors: theme === 'dark' ? '#9ca3af' : '#4b5563' } },
            axisBorder: { color: theme === 'dark' ? '#374151' : '#e5e7eb' },
            axisTicks: { color: theme === 'dark' ? '#374151' : '#e5e7eb' },
        },
        yaxis: {
            labels: { formatter: (val: number) => val.toFixed(1) + '%', style: { colors: theme === 'dark' ? '#9ca3af' : '#4b5563' } },
        },
        tooltip: { theme, style: { fontSize: '12px' }, x: { format: 'MMM yyyy' } },
        legend: {
            position: 'top',
            horizontalAlign: 'left',
            offsetX: 10,
            fontSize: '14px',
            labels: { colors: theme === 'dark' ? '#e5e7eb' : '#374151' },
            itemMargin: { horizontal: 16 }
        },
        grid: { borderColor: theme === 'dark' ? '#374151' : '#e5e7eb' },
    }), [theme, isMobile]);

    if (loading || !ChartComponent) return <ChartPlaceholder message="A carregar gráfico..." />;
    if (error) return <ChartPlaceholder message={error} />;

    return <ChartComponent type="line" height={isMobile ? 350 : 400} series={series} options={options} />;
};

export default InflationHistoricalChart;