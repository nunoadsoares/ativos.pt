// packages/webapp/src/components/CreditConditionsChart.tsx
import { useEffect, useState, useMemo } from 'react';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

// Tipos de dados da nossa API
interface ApiData {
  [seriesCode: string]: { date: string; value: number }[];
}

interface Series {
  name: string;
  type: 'line' | 'column';
  data: [number, number][];
}

export default function CreditConditionsChart() {
  const [series, setSeries] = useState<Series[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const isDarkMode = () => document.documentElement.classList.contains('dark');
    setTheme(isDarkMode() ? 'dark' : 'light');
    const obs = new MutationObserver(() => setTheme(isDarkMode() ? 'dark' : 'light'));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      obs.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    fetch('/api/data/creditConditionsChart')
      .then(r => r.json())
      .then((data: ApiData) => {

        const createSeries = (code: string, name: string, type: 'line' | 'column'): Series | null => {
            const seriesData = data[code];
            if (!seriesData) return null;
            return {
                name: name,
                type: type,
                data: seriesData.map(d => [new Date(d.date).getTime(), d.value ?? 0])
            };
        };

        const tanVariavel = createSeries('tan_variavel', 'TAN Variável', 'line');
        const tanFixa = createSeries('tan_fixa', 'TAN Fixa', 'line');
        const prestacao = createSeries('prestacao_mediana', 'Prestação Mediana', 'column');

        const finalSeries = [tanVariavel, tanFixa, prestacao].filter((s): s is Series => s !== null);
        
        setSeries(finalSeries);
      });
  }, []);

  const chartOptions: ApexOptions = useMemo(() => {
    const labelColor = theme === 'dark' ? '#e5e7eb' : '#374151';
    const gridColor = theme === 'dark' ? '#4b5563' : '#e5e7eb';

    return {
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
        labels: { style: { colors: labelColor } },
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
        {
          seriesName: 'TAN Fixa',
          show: false,
        },
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
        y: {
          formatter: function (val, { seriesIndex }) {
            if (seriesIndex < 2) {
              return `${val.toFixed(3)}%`;
            }
            return `€${val.toFixed(2)}`;
          },
        },
      },
      legend: {
        position: isMobile ? 'bottom' : 'top',
        horizontalAlign: 'center',
        labels: { colors: labelColor },
      },
      grid: { borderColor: gridColor, strokeDashArray: 3 },
      colors: ['#3b82f6', '#ef4444', '#10b981'],
    };
  }, [theme, isMobile]);

  if (!series.length) {
    return <div className="flex h-96 items-center justify-center text-center p-8">A carregar dados do gráfico...</div>;
  }

  return <ReactApexChart options={chartOptions} series={series} type="line" height={450} />;
}