// packages/webapp/src/components/RatesCompareChart.tsx
import { useEffect, useState, useMemo } from 'react';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

// Tipos de dados da nossa API
interface ApiPoint { date: string, value: number };
type ApiData = {
  taeg: ApiPoint[];
  tan_variavel: ApiPoint[];
};

interface Series { 
  name: string; 
  data: [number, number][] 
}

export default function RatesCompareChart() {
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
    fetch('/api/data/ratesCompareChart')
      .then(r => r.json())
      .then((data: ApiData) => {
        const formatData = (d: ApiPoint[]) => d.map(p => [new Date(p.date).getTime(), p.value]);
        
        const taegSeries = { name: 'TAEG', data: formatData(data.taeg || []) };
        const tanSeries = { name: 'TAN (Variável)', data: formatData(data.tan_variavel || []) };
        
        setSeries([taegSeries, tanSeries].filter(s => s.data.length > 0));
      });
  }, []);

  const options: ApexOptions = useMemo(() => {
    const labelColor = theme === 'dark' ? '#fff' : '#222';
    const gridColor  = theme === 'dark' ? '#555' : '#eee';

    return {
      chart: {
        id: 'rates-compare',
        zoom: { enabled: true },
        toolbar: { show: true },
        background: 'transparent'
      },
      stroke: { width: 2, curve: 'smooth' },
      xaxis: {
        type: 'datetime',
        labels: { style: { colors: labelColor, fontWeight: 500 } },
        axisBorder: { color: gridColor },
        axisTicks:  { color: gridColor },
      },
      yaxis: {
        labels: {
          formatter: (v: number) => v.toFixed(2) + '%',
          style: { colors: labelColor, fontWeight: 500 },
        },
      },
      tooltip: {
        theme,
        style: { fontSize: '12px' },
        x: { format: 'MMM yyyy' },
      },
      legend: {
        position: (isMobile ? 'bottom' : 'top') as 'bottom' | 'top',
        horizontalAlign: 'center',
        offsetY: isMobile ? 5 : 0,
        fontSize: isMobile ? '13px' : '15px',
        labels: { colors: labelColor },
        itemMargin: { horizontal: 12, vertical: 6 },
      },
      grid: { borderColor: gridColor },
      colors: ['#e11d48', '#2563eb'] // Rosa para TAEG, Azul para TAN
    };
  }, [theme, isMobile]);

  if (series.length === 0) {
    return <p className="text-center py-10">A carregar dados do gráfico...</p>;
  }

  return (
    <ReactApexChart
      type="line"
      height={isMobile ? 350 : 450}
      series={series}
      options={options}
    />
  );
}