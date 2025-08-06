import { useEffect, useState, useMemo } from 'react';
import ApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

// Tipos de dados da nossa API
interface ApiData {
  [period: string]: { date: string; value: number }[];
}

interface Series {
  name: string;
  data: [number, number][];
}

// O tipo 'periods' corresponde ao que a página .astro lhe vai passar
interface Props {
  periods: ('3m' | '6m' | '12m')[];
}

export default function EuriborCompareChart({ periods }: Props) {
  const [series, setSeries] = useState<Series[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [isMobile, setIsMobile] = useState(false);

  // Detect theme & mobile
  useEffect(() => {
    const isDark = () => document.documentElement.classList.contains('dark');
    setTheme(isDark() ? 'dark' : 'light');
    const obs = new MutationObserver(() => setTheme(isDark() ? 'dark' : 'light'));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'], });
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => {
      obs.disconnect();
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Fetch data from our central API endpoint
  useEffect(() => {
    fetch('/api/data/euriborQuotasChart')
      .then(r => r.json())
      .then((data: ApiData) => {
        const newSeries = periods.map(p => {
            const seriesData = data[p];
            if (!seriesData) return null;

            return {
                name: `Quota Euribor ${p.replace('m', 'M')}`,
                data: seriesData.map(row => [new Date(row.date).getTime(), row.value ?? 0]),
            };
        }).filter((s): s is Series => s !== null);

        setSeries(newSeries);
      });
  }, [periods]);

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
        title: {
            text: 'Quota de Mercado (%)',
            style: { color: labelColor }
        }
      },
      tooltip: {
        theme,
        style: { fontSize: '12px' },
        x: { format: 'MMM yyyy' },
        y: { formatter: (v: number) => `${v?.toFixed(2)}%` },
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
            legend: { position: 'bottom', offsetY: 10, fontSize: '13px', floating: false, itemMargin: { horizontal: 12, vertical: 6 }, },
          },
        },
      ],
    };
  }, [theme, isMobile]);


  if (!series.length && periods.length > 0) {
    return <p className="text-center p-8">A carregar dados do gráfico...</p>;
  }

  return (
    <ApexChart
      type="line"
      height={isMobile ? 350 : 450}
      series={series}
      options={options}
    />
  );
}