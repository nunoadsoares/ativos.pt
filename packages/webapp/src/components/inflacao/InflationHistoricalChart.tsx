import { useEffect, useState, type FC } from 'react';
import ApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

type HistoricalData = {
    yoy: [number, number][];
    core_yoy: [number, number][];
};

const InflationHistoricalChart: FC = () => {
    const [series, setSeries] = useState<ApexAxisChartSeries>([]);
    const [theme, setTheme] = useState<'dark' | 'light'>('light');
    const [isMobile, setIsMobile] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const isDark = () => document.documentElement.classList.contains('dark');
        setTheme(isDark() ? 'dark' : 'light');
        const obs = new MutationObserver(() => setTheme(isDark() ? 'dark' : 'light'));
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
        fetch('/data/inflation_summary.json')
            .then(res => res.json())
            .then(data => {
                const historical: HistoricalData = data.historical;
                setSeries([
                    { name: 'Inflação Homóloga', data: historical.yoy },
                    { name: 'Inflação Subjacente', data: historical.core_yoy },
                ]);
                setLoading(false);
            })
            .catch(err => {
                console.error("Falha ao carregar dados históricos da inflação:", err);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return <div className="text-center p-8 text-gray-500 dark:text-gray-400">A carregar gráfico...</div>;
    }

    const labelColor = theme === 'dark' ? '#9ca3af' : '#374151';
    const gridColor = theme === 'dark' ? '#374151' : '#e5e7eb';

    const options: ApexOptions = {
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
            labels: { style: { colors: labelColor, fontWeight: 500 } },
            axisBorder: { color: gridColor },
            axisTicks: { color: gridColor },
        },
        yaxis: {
            labels: { formatter: (val: number) => val.toFixed(1) + '%', style: { colors: labelColor, fontWeight: 500 } },
        },
        tooltip: { theme, style: { fontSize: '12px' }, x: { format: 'MMM yyyy' } },
        legend: {
            position: 'top',
            // --- CORREÇÃO: Alinhar a legenda à esquerda para não sobrepor a toolbar ---
            horizontalAlign: 'left',
            offsetX: 10, // Pequeno espaçamento da margem
            fontSize: '14px',
            labels: { colors: labelColor },
            itemMargin: { horizontal: 16 }
        },
        grid: { borderColor: gridColor },
    };

    return <ApexChart type="line" height={isMobile ? 350 : 400} series={series} options={options} />;
};

export default InflationHistoricalChart;