import { useEffect, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

type Point = [string, number];
interface Series { name: string; data: Point[] }

const FILES = [
  { code: 'taeg', label: 'TAEG' },
  { code: 'tan',  label: 'TAN'  }
];

export default function RatesCompareChart() {
  const [series, setSeries] = useState<Series[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [isMobile, setIsMobile] = useState(false);

  // Só acede a window/document no cliente
  useEffect(() => {
    const isDarkMode = () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    setTheme(isDarkMode() ? 'dark' : 'light');

    const obs = typeof MutationObserver !== 'undefined'
      ? new MutationObserver(() => setTheme(isDarkMode() ? 'dark' : 'light'))
      : null;
    obs?.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    const handleResize = () => {
      if (typeof window !== 'undefined') {
        setIsMobile(window.innerWidth <= 768);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      obs?.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Fetch CSV data
  useEffect(() => {
    Promise.all(
      FILES.map(({ code, label }) =>
        fetch(`/data/interest_rate_${code}.csv`)
          .then(r => r.text())
          .then(txt => {
            const rows = txt.trim().split('\n').slice(1);
            const data: Point[] = rows
              .map(line => line.split(','))
              .filter(([, v]) => v !== '' && !isNaN(+v))
              .map(([d, v]) => [d, parseFloat(v)]);
            return { name: label, data };
          })
      )
    ).then(setSeries);
  }, []);

  if (series.length === 0) {
    return <p className="text-center py-10">A carregar séries...</p>;
  }

  const labelColor = theme === 'dark' ? '#fff' : '#222';
  const gridColor  = theme === 'dark' ? '#555' : '#eee';

  const options: ApexOptions = {
    chart: {
      id: 'rates-compare',
      zoom: { enabled: true },
      toolbar: { show: true, offsetY: isMobile ? 20 : 0 },
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
      style: { fontSize: '12px' }, // removido padding
      x: { format: 'yyyy-MM' },
    },
    legend: {
      position: (isMobile ? 'bottom' : 'top') as 'bottom' | 'top',
      horizontalAlign: 'center',
      offsetY: isMobile ? 10 : 20,
      fontSize: isMobile ? '13px' : '15px',
      labels: { colors: labelColor },
      itemMargin: { horizontal: 12, vertical: 6 },
    },
    grid: { borderColor: gridColor },
    responsive: [
      {
        breakpoint: 768,
        options: {
          chart: { toolbar: { offsetY: 20 } },
          legend: {
            position: 'bottom',
            offsetY: 10,
            fontSize: '13px',
            itemMargin: { horizontal: 12, vertical: 6 },
          },
        },
      },
    ],
  };

  return (
    <ReactApexChart
      type="line"
      height={isMobile ? 350 : 450}
      series={series}
      options={options}
    />
  );
}
