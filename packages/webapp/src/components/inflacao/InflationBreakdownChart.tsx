import { useEffect, useState, type FC } from 'react';
import ApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

// Tipos de dados da nossa API (um indicador completo)
interface Indicator { value: number; /* outros campos... */ };
type ApiData = Record<string, Indicator | null>;

const categoryNames: { [key: string]: string } = {
    food_drinks: "Alimentação e Bebidas", alcoholic_tobacco: "Bebidas Alcoólicas e Tabaco", clothing_footwear: "Vestuário e Calçado",
    housing_utilities: "Habitação e Combustíveis", furnishings: "Mobiliário e Equipamentos", health: "Saúde", transport: "Transportes",
    communications: "Comunicações", recreation_culture: "Lazer e Cultura", education: "Educação", restaurants_hotels: "Restaurantes e Hotéis",
    misc_goods_services: "Bens e Serviços Diversos"
};

const InflationBreakdownChart: FC = () => {
    const [series, setSeries] = useState<ApexAxisChartSeries>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [theme, setTheme] = useState<'dark' | 'light'>('light');
    const [loading, setLoading] = useState(true);
    const [isMobile, setIsMobile] = useState(false);

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
        // Busca os dados do grupo de indicadores da nossa API
        fetch('/api/data/inflationBreakdownIndicators')
            .then(res => res.json())
            .then((data: ApiData) => {
                const breakdown = Object.entries(data)
                    .map(([key, indicator]) => ({ key, value: indicator?.value ?? 0 }))
                    .filter(item => item.value !== 0);
                
                const sortedData = breakdown.sort((a, b) => a.value - b.value);
                
                setCategories(sortedData.map(item => categoryNames[item.key] || item.key));
                setSeries([{ name: 'Inflação Homóloga', data: sortedData.map(item => item.value) }]);
                setLoading(false);
            })
            .catch(err => {
                console.error("Falha ao carregar dados de breakdown da inflação:", err);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return <div className="text-center p-8 text-gray-500 dark:text-gray-400">A carregar gráfico...</div>;
    }

    const labelColor = theme === 'dark' ? '#9ca3af' : '#374151';
    const gridColor = theme === 'dark' ? '#374151' : '#e5e7eb';

    const options: ApexOptions = {
        chart: { id: 'inflation-breakdown-chart', toolbar: { show: false }, background: 'transparent' },
        plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '70%' } },
        colors: [(ctx: { w: any; dataPointIndex: number }) => {
            return (ctx.w.globals.series[0][ctx.dataPointIndex] < 0) ? '#ef4444' : '#10b981';
        }],
        xaxis: {
            categories: categories,
            labels: { 
                show: !isMobile,
                formatter: (val: string) => parseFloat(val).toFixed(1) + '%', 
                style: { colors: labelColor, fontWeight: 500 } 
            },
            axisBorder: { show: false }, 
            axisTicks: { show: false },
        },
        yaxis: { 
            labels: { 
                show: true,
                style: { colors: labelColor, fontWeight: 500, fontSize: '13px' } 
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
            borderColor: gridColor, 
            xaxis: { lines: { show: true } },
            yaxis: { lines: { show: false } } 
        },
        dataLabels: { enabled: false }
    };

    return <ApexChart type="bar" height={500} series={series} options={options} />;
};

export default InflationBreakdownChart;