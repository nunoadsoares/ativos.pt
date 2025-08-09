// C:\Users\nunos\Desktop\ativos.pt\packages\webapp\src\components\inflacao\InflationSectorsCompareChart.tsx
import React, { useEffect, useState, useMemo, type FC, type ComponentType } from 'react';
import type { ApexOptions } from 'apexcharts';

// Tipos de dados
interface SeriesData {
    name: string;
    data: [number, number][];
}

interface Props {
    series: SeriesData[];
}

const ChartPlaceholder: FC<{ message: string }> = ({ message }) => (
    <div className="flex h-96 items-center justify-center text-center p-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">{message}</p>
    </div>
);

const InflationSectorsCompareChart: FC<Props> = ({ series }) => {
    // Estado para guardar o componente do gráfico SÓ depois de carregar no browser
    const [ChartComponent, setChartComponent] = useState<ComponentType<any> | null>(null);
    const [theme, setTheme] = useState<'dark' | 'light'>('light');
    const [isMobile, setIsMobile] = useState(false);

    // Efeito para carregar o componente do gráfico dinamicamente
    useEffect(() => {
        import('react-apexcharts')
            .then(mod => setChartComponent(() => mod.default))
            .catch(err => console.error("Falha ao carregar ApexCharts:", err));
    }, []);

    // Efeito para gerir o tema e o tamanho do ecrã
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

    const options: ApexOptions = useMemo(() => ({
        chart: {
            id: 'inflation-sector-compare-chart',
            zoom: { enabled: true },
            toolbar: { show: true, tools: { download: false, pan: true, zoom: true, zoomin: true, zoomout: true, reset: true } },
            background: 'transparent',
        },
        stroke: { width: 2.5, curve: 'smooth' },
        xaxis: {
            type: 'datetime',
            labels: { style: { colors: theme === 'dark' ? '#9ca3af' : '#4b5563' } },
        },
        yaxis: {
            labels: {
                formatter: (val: number) => val.toFixed(1) + '%',
                style: { colors: theme === 'dark' ? '#9ca3af' : '#4b5563' },
            },
        },
        tooltip: { theme, x: { format: 'MMM yyyy' } },
        legend: {
            position: 'top',
            horizontalAlign: 'center',
            labels: { colors: theme === 'dark' ? '#e5e7eb' : '#374151' },
        },
        grid: { borderColor: theme === 'dark' ? '#374151' : '#e5e7eb' },
    }), [theme]);
    
    // Se o componente do gráfico ainda não carregou, ou se não há dados, mostra um placeholder.
    if (!ChartComponent || !series || series.length === 0) {
        return <ChartPlaceholder message="A carregar dados do gráfico de comparação..." />;
    }

    return (
        <ChartComponent
            type="line"
            height={isMobile ? 350 : 450}
            series={series}
            options={options}
        />
    );
};

export default InflationSectorsCompareChart;