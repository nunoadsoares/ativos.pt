import { useEffect, useState, type FC } from 'react';
import ApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

// O componente agora recebe os dados prontos a usar via props
interface SeriesData {
    name: string;
    data: [number, number][];
}

interface Props {
    series: SeriesData[];
}

const InflationSectorsCompareChart: FC<Props> = ({ series }) => {
    const [theme, setTheme] = useState<'dark' | 'light'>('light');
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

    if (!series || series.length === 0) {
        return <div className="text-center p-8 text-red-500">Não foi possível carregar os dados para os setores selecionados.</div>
    }

    const labelColor = theme === 'dark' ? '#9ca3af' : '#374151';
    const gridColor = theme === 'dark' ? '#374151' : '#e5e7eb';

    const options: ApexOptions = {
        chart: {
            id: 'inflation-sector-compare-chart',
            zoom: { enabled: true },
            toolbar: { show: true, tools: { download: false, pan: true, zoom: true, zoomin: true, zoomout: true, reset: true } },
            background: 'transparent',
        },
        stroke: { width: 2.5, curve: 'smooth' },
        xaxis: {
            type: 'datetime',
            labels: { style: { colors: labelColor, fontWeight: 500 } },
        },
        yaxis: {
            labels: {
                formatter: (val: number) => val.toFixed(1) + '%',
                style: { colors: labelColor, fontWeight: 500 },
            },
        },
        tooltip: { theme, x: { format: 'MMM yyyy' } },
        legend: {
            position: 'top',
            horizontalAlign: 'center',
            labels: { colors: labelColor },
        },
        grid: { borderColor: gridColor },
    };

    return (
        <ApexChart
            type="line"
            height={isMobile ? 350 : 450}
            series={series}
            options={options}
        />
    );
};

export default InflationSectorsCompareChart;