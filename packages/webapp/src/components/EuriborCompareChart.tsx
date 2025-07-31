import { useEffect, useState } from 'react';
import ApexChart from 'react-apexcharts';

type Point = [string, number];
interface Series { name: string; data: Point[] }
interface Props { periods: string[] }

export default function EuriborCompareChart({ periods }: Props) {
  const [series, setSeries] = useState<Series[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [isMobile, setIsMobile] = useState(false);

  // Detect theme & mobile
  useEffect(() => {
    const isDark = () => document.documentElement.classList.contains('dark');
    setTheme(isDark() ? 'dark' : 'light');
    const obs = new MutationObserver(() => setTheme(isDark() ? 'dark' : 'light'));
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => {
      obs.disconnect();
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Fetch CSV data
  useEffect(() => {
    Promise.all(
      periods.map(code =>
        fetch(`/data/euribor_${code}_share.csv`)
          .then(r => r.text())
          .then(txt => {
            const rows = txt.trim().split('\n').slice(1);
            const data: Point[] = rows
              .map(l => l.split(','))
              .filter(([, v]) => v && !isNaN(+v))
              .map(([d, v]) => [d, parseFloat(v)]);
            return {
              name: `Euribor ${code === '1y' ? '1Y' : code.toUpperCase()}`,
              data,
            };
          })
      )
    ).then(setSeries);
  }, [periods]);

  if (!series.length) {
    return <p className="text-center">A carregar séries...</p>;
  }

  // Core colors
  const labelColor = theme === 'dark' ? '#fff' : '#222';
  const gridColor = theme === 'dark' ? '#555' : '#eee';

  const options = {
    chart: {
      id: 'euribor-compare',
      zoom: { enabled: true },
      toolbar: {
        show: true,
        offsetY: isMobile ? 20 : 0,
      },
    },
    stroke: { width: 2, curve: 'smooth' },
    xaxis: {
      type: 'datetime',
      labels: { style: { colors: labelColor, fontWeight: 500 } },
      axisBorder: { color: gridColor },
      axisTicks: { color: gridColor },
    },
    yaxis: {
      min: 0, max: 100,
      labels: {
        formatter: (v: number) => v.toFixed(1) + '%',
        style: { colors: labelColor, fontWeight: 500 },
      },
    },
    tooltip: {
      theme,
      style: { fontSize: '12px', padding: '8px' },
      x: { format: 'yyyy-MM' },
    },
    legend: {
      position: isMobile ? 'bottom' : 'top',
      horizontalAlign: 'center',
      floating: false,
      offsetY: isMobile ? 10 : 20,
      fontSize: isMobile ? '13px' : '15px',
      itemMargin: { horizontal: 12, vertical: 6 },
      labels: { colors: labelColor },
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
            floating: false,
            itemMargin: { horizontal: 12, vertical: 6 },
          },
        },
      },
    ],
  };

  return (
    <ApexChart
      type="line"
      height={isMobile ? 350 : 450}
      series={series}
      options={options}
    />
  );
}
