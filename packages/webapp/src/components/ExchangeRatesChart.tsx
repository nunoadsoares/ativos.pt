// packages/webapp/src/components/ExchangeRatesChart.tsx
import { useEffect, useState, useMemo } from 'react';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

// Tipos de dados do nosso JSON
interface ExchangeRateData {
  date: string;
  usd?: number; gbp?: number; chf?: number; cad?: number; aud?: number; cny?: number; brl?: number;
}
interface Series { name: string; data: [number, number][] }

// Mapeamento de códigos para nomes e cores
const currencyMap = {
  usd: { name: 'Dólar (USD)', color: '#16a34a' },
  gbp: { name: 'Libra (GBP)', color: '#2563eb' },
  chf: { name: 'Franco Suíço (CHF)', color: '#dc2626' },
  cad: { name: 'Dólar Canadiano (CAD)', color: '#f97316' },
  aud: { name: 'Dólar Australiano (AUD)', color: '#9333ea' },
  cny: { name: 'Yuan Chinês (CNY)', color: '#f59e0b' },
  brl: { name: 'Real Brasileiro (BRL)', color: '#14b8a6' },
};

interface Props {
  periods?: string[];
}

export default function ExchangeRatesChart({ periods }: Props) {
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
    fetch('/data/exchange_rates_monthly.json')
      .then(r => r.json())
      .then((data: ExchangeRateData[]) => {
        // --- FILTRO DE 10 ANOS REMOVIDO ---
        // Agora usa todos os dados recebidos do JSON.

        const currenciesToShow = periods || Object.keys(currencyMap);

        const newSeries = currenciesToShow
          .map(code => {
            const currency = currencyMap[code as keyof typeof currencyMap];
            if (!currency) return null;
            return {
              name: currency.name,
              data: data // Usar a variável 'data' original
                .map(row => {
                  const value = row[code as keyof ExchangeRateData];
                  if (value !== null && typeof value === 'number') {
                    return [new Date(row.date).getTime(), value];
                  }
                  return null;
                })
                .filter((point): point is [number, number] => point !== null),
            };
          })
          .filter((s): s is Series => s !== null);
        setSeries(newSeries);
      });
  }, [periods]);

  const chartOptions: ApexOptions = useMemo(() => {
    const labelColor = theme === 'dark' ? '#e5e7eb' : '#374151';
    const gridColor = theme === 'dark' ? '#4b5563' : '#e5e7eb';
    const colors = (periods || Object.keys(currencyMap)).map(code => currencyMap[code as keyof typeof currencyMap].color);

    return {
      chart: {
        height: 500,
        type: 'line',
        zoom: { enabled: true, type: 'x' },
        toolbar: { show: true, tools: { download: false } },
        background: 'transparent',
      },
      stroke: { width: 2, curve: 'smooth' },
      xaxis: {
        type: 'datetime',
        labels: { style: { colors: labelColor } },
      },
      yaxis: {
        labels: {
          formatter: (val) => val.toFixed(2),
          style: { colors: labelColor },
        },
        title: {
          text: '1 Euro equivale a...',
          style: { color: labelColor },
        }
      },
      tooltip: {
        theme,
        x: { format: 'dd MMM yyyy' },
        y: { formatter: (val) => val.toFixed(4) },
      },
      legend: {
        position: 'top',
        horizontalAlign: 'left',
        fontSize: '14px',
        labels: { colors: labelColor },
        itemMargin: { horizontal: 10, vertical: 5 },
        markers: {
            radius: 6,
        },
        onItemClick: {
            toggleDataSeries: true
        },
      },
      grid: {
        borderColor: gridColor,
        strokeDashArray: 3,
      },
      colors: colors,
    };
  }, [theme, isMobile, periods]);

  if (!series.length) {
    return <div className="text-center p-8">A carregar dados do gráfico...</div>;
  }

  return <ReactApexChart options={chartOptions} series={series} type="line" height={500} />;
}