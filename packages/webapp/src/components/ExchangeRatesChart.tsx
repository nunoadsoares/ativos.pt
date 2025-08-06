// packages/webapp/src/components/ExchangeRatesChart.tsx
import { useEffect, useState, useMemo } from 'react';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

// Tipos de dados da nossa API
// A API retorna um objeto onde cada chave é um código de moeda
interface ApiData {
  [currencyCode: string]: { date: string; value: number }[];
}
interface Series { name: string; data: [number, number][] }

// Mapeamento de códigos para nomes e cores (Isto não muda)
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

  // Este hook para detetar o tema e o tamanho do ecrã não precisa de mudar.
  useEffect(() => {
    const isDarkMode = () => document.documentElement.classList.contains('dark');
    setTheme(isDarkMode() ? 'dark' : 'light');

    const observer = new MutationObserver(() => {
      setTheme(isDarkMode() ? 'dark' : 'light');
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Este hook busca os dados.
  useEffect(() => {
    // ESTA É A ÚNICA LINHA QUE MUDA PARA SE ADAPTAR À NOSSA ARQUITETURA FINAL
    fetch('/api/data/exchangeRatesChart')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data: ApiData) => {
        const currenciesToShow = periods || Object.keys(currencyMap);

        const newSeries = currenciesToShow
          .map(code => {
            const currencyInfo = currencyMap[code as keyof typeof currencyMap];
            const currencyData = data[code as keyof ApiData];
            
            if (!currencyInfo || !currencyData) {
                console.warn(`Dados ou mapeamento não encontrados para a moeda: ${code}`);
                return null;
            }

            return {
              name: currencyInfo.name,
              data: currencyData.map(row => {
                return [new Date(row.date).getTime(), row.value];
              }),
            };
          })
          .filter((s): s is Series => s !== null);
          
        setSeries(newSeries);
      })
      .catch(error => console.error("Falha ao carregar dados do gráfico de câmbios:", error));
  }, [periods]);

  // As opções do gráfico também não precisam de mudar.
  const chartOptions: ApexOptions = useMemo(() => {
    const labelColor = theme === 'dark' ? '#e5e7eb' : '#374151';
    const gridColor = theme === 'dark' ? '#4b5563' : '#e5e7eb';
    const colors = (periods || Object.keys(currencyMap))
      .map(code => currencyMap[code as keyof typeof currencyMap]?.color)
      .filter(Boolean) as string[];

    return {
      chart: {
        height: 500,
        type: 'line',
        zoom: { enabled: true, type: 'x' },
        toolbar: { show: true, tools: { download: false, pan: true, reset: true, zoom: true, zoomin: true, zoomout: true } },
        background: 'transparent',
      },
      stroke: {
        width: 2,
        curve: 'smooth'
      },
      xaxis: {
        type: 'datetime',
        labels: { style: { colors: labelColor, }, },
      },
      yaxis: {
        labels: { formatter: (val) => val.toFixed(2), style: { colors: labelColor, }, },
        title: { text: '1 Euro equivale a...', style: { color: labelColor, fontWeight: 'normal',}, }
      },
      tooltip: {
        theme,
        x: { format: 'dd MMM yyyy', },
        y: { formatter: (val) => val.toFixed(4), },
      },
      legend: {
        position: 'top',
        horizontalAlign: 'left',
        fontSize: '14px',
        labels: { colors: labelColor, },
        itemMargin: { horizontal: 10, vertical: 5 },
        markers: { radius: 6, },
        onItemClick: { toggleDataSeries: true },
      },
      grid: {
        borderColor: gridColor,
        strokeDashArray: 3,
      },
      colors: colors,
    };
  }, [theme, isMobile, periods]);

  // A renderização final também não muda.
  if (!series.length) {
    return <div className="flex h-96 items-center justify-center text-center p-8">A carregar dados do gráfico...</div>;
  }

  return <ReactApexChart options={chartOptions} series={series} type="line" height={500} />;
}