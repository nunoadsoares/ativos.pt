// packages/webapp/src/components/EuriborRatesChart.tsx
import { useEffect, useState, useMemo } from 'react';
import ApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

// Tipos de dados da nossa API
interface ApiData {
  [period: string]: { date: string; value: number }[];
}

interface Series {
  name: string;
  data: [number, number][]; // [timestamp, value]
}

interface Props {
  periods: ('3_meses' | '6_meses' | '12_meses')[];
}

export default function EuriborRatesChart({ periods }: Props) {
  const [series, setSeries] = useState<Series[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const isDark = () => document.documentElement.classList.contains('dark');
    setTheme(isDark() ? 'dark' : 'light');
    const obs = new MutationObserver(() => setTheme(isDark() ? 'dark' : 'light'));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      obs.disconnect();
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  useEffect(() => {
    // Busca os dados das TAXAS usando a nova dataKey
    fetch('/api/data/euriborRatesChart')
      .then(r => r.json())
      .then((data: ApiData) => {
        const newSeries = periods.map(p => {
          const seriesData = data[p];
          if (!seriesData) return null;

          return {
            name: `Euribor ${p.replace('_', ' ').replace('meses', 'M')}`,
            data: seriesData.map(row => [new Date(row.date).getTime(), row.value ?? 0]),
          };
        }).filter((s): s is Series => s !== null);
        
        setSeries(newSeries);
      });
  }, [periods]);

  const chartOptions: ApexOptions = useMemo(() => {
    const labelColor = theme === 'dark' ? '#e5e7eb' : '#374151';
    const gridColor = theme === 'dark' ? '#4b5563' : '#e5e7eb';

    return {
      chart: {
        id: 'euribor-rates-chart',
        type: 'line',
        height: isMobile ? 350 : 450,
        zoom: { enabled: true, type: 'x' },
        toolbar: { show: true, tools: { download: false } },
        background: 'transparent',
      },
      stroke: { width: 3, curve: 'smooth' },
      xaxis: {
        type: 'datetime',
        labels: { style: { colors: labelColor, fontWeight: 500 } },
        axisBorder: { show: false },
        axisTicks: { color: gridColor },
      },
      yaxis: {
        labels: {
          formatter: (v: number) => `${v?.toFixed(2)}%`,
          style: { colors: labelColor, fontWeight: 500 },
        },
        title: {
            text: 'Taxa (%)',
            style: { color: labelColor }
        }
      },
      tooltip: {
        theme,
        x: { format: 'dd MMM yyyy' },
        y: { formatter: (v: number) => `${v?.toFixed(3)}%` },
      },
      legend: {
        position: isMobile ? 'bottom' : 'top',
        horizontalAlign: 'center',
        fontSize: '14px',
        itemMargin: { horizontal: 10, vertical: 5 },
        labels: { colors: labelColor },
      },
      grid: {
        borderColor: gridColor,
        strokeDashArray: 4,
        xaxis: { lines: { show: false } },
      },
      colors: ['#3b82f6', '#f97316', '#ef4444'],
    };
  }, [theme, isMobile]);

  if (!series.length && periods.length > 0) {
    return <div className="text-center p-8">A carregar dados do gráfico...</div>;
  }

  return <ApexChart type="line" series={series} options={chartOptions} height={isMobile ? 350 : 450} />;
}