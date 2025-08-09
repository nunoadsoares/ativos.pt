// C:\Users\nunos\Desktop\ativos.pt\packages\webapp\src\components\inflacao\InflationBreakdownChart.tsx
import React, { useEffect, useState, useMemo, type FC, type ComponentType } from 'react';
import type { ApexOptions } from 'apexcharts';

// Tipos de dados
interface Indicator { value: number; };
interface ApiResponse { ok: boolean; data: Record<string, Indicator | null> };

const categoryNames: { [key: string]: string } = {
    food_drinks: "Alimentação e Bebidas", alcoholic_tobacco: "Bebidas Alcoólicas e Tabaco", clothing_footwear: "Vestuário e Calçado",
    housing_utilities: "Habitação e Combustíveis", furnishings: "Mobiliário e Equipamentos", health: "Saúde", transport: "Transportes",
    communications: "Comunicações", recreation_culture: "Lazer e Cultura", education: "Educação", restaurants_hotels: "Restaurantes e Hotéis",
    misc_goods_services: "Bens e Serviços Diversos"
};

const ChartPlaceholder: FC<{ message: string }> = ({ message }) => (
    <div className="flex h-[500px] items-center justify-center text-center p-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">{message}</p>
    </div>
);

const InflationBreakdownChart: FC = () => {
    const [ChartComponent, setChartComponent] = useState<ComponentType<any> | null>(null);
    const [series, setSeries] = useState<ApexAxisChartSeries>([]);
    const [categories, setCategories] = useState<string[]>([]);
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

        fetch('/api/data/inflationBreakdownIndicators')
            .then(res => {
                if (!res.ok) throw new Error("Falha na resposta do servidor.");
                return res.json();
            })
            .then((response: ApiResponse) => {
                const breakdown = Object.entries(response.data)
                    .map(([key, indicator]) => ({ key, value: indicator?.value ?? 0 }))
                    .filter(item => item.value !== 0);
                
                const sortedData = breakdown.sort((a, b) => a.value - b.value);
                
                setCategories(sortedData.map(item => categoryNames[item.key] || item.key));
                setSeries([{ name: 'Inflação Homóloga', data: sortedData.map(item => item.value) }]);
            })
            .catch(err => {
                console.error("Falha ao carregar dados de breakdown da inflação:", err);
                setError("Não foi possível carregar os dados do gráfico.");
            })
            .finally(() => {
                setLoading(false);
            });
    }, [ChartComponent]);

    const options: ApexOptions = useMemo(() => ({
        chart: { id: 'inflation-breakdown-chart', toolbar: { show: false }, background: 'transparent' },
        plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '70%' } },
        colors: [(ctx: any) => (ctx.w.globals.series[0][ctx.dataPointIndex] < 0) ? '#ef4444' : '#10b981'],
        xaxis: {
            categories: categories,
            labels: { 
                formatter: (val: string) => parseFloat(val).toFixed(1) + '%', 
                style: { colors: theme === 'dark' ? '#9ca3af' : '#4b5563' } 
            },
            axisBorder: { show: false }, 
            axisTicks: { show: false },
        },
        yaxis: { 
            labels: { 
                style: { colors: theme === 'dark' ? '#9ca3af' : '#4b5563', fontSize: '13px' } 
            } 
        },
        tooltip: {
            theme, x: { show: false },
            y: {
                formatter: (val: number) => val.toFixed(2) + '%',
                title: { formatter: (seriesName: string, opts: any) => categories[opts.dataPointIndex] || seriesName },
            },
        },
        grid: { 
            borderColor: theme === 'dark' ? '#374151' : '#e5e7eb', 
            xaxis: { lines: { show: true } },
            yaxis: { lines: { show: false } } 
        },
        dataLabels: { enabled: false }
    }), [categories, theme, isMobile]);

    if (loading || !ChartComponent) return <ChartPlaceholder message="A carregar gráfico..." />;
    if (error) return <ChartPlaceholder message={error} />;

    return <ChartComponent type="bar" height={500} series={series} options={options} />;
};

export default InflationBreakdownChart;