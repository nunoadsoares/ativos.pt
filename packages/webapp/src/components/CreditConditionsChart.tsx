// packages/webapp/src/components/CreditConditionsChart.tsx
import { useEffect, useState, useMemo } from 'react';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

// Tipos de dados do nosso JSON
interface CondicoesCredito {
  date: string;
  tan_variavel?: number;
  tan_fixa?: number;
  tan_mista?: number;
  prestacao_mediana?: number;
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
    fetch('/data/credito_habitacao_condicoes.json')
      .then(r => r.json())
      .then((data: CondicoesCredito[]) => {
        const tanVariavel: Series = {
          name: 'TAN Variável',
          type: 'line',
          data: data.map(d => [new Date(d.date).getTime(), d.tan_variavel ?? 0])
        };
        const tanFixa: Series = {
          name: 'TAN Fixa',
          type: 'line',
          data: data.map(d => [new Date(d.date).getTime(), d.tan_fixa ?? 0])
        };
        const prestacao: Series = {
            name: 'Prestação Mediana',
            type: 'column',
            data: data.map(d => [new Date(d.date).getTime(), d.prestacao_mediana ?? 0])
        }
        setSeries([tanVariavel, tanFixa, prestacao]);
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
        toolbar: { show: true },
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
          show: false, // Esconde o eixo Y duplicado para TAN
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
            if (seriesIndex < 2) { // TAN
              return `${val.toFixed(3)}%`;
            }
            return `€${val.toFixed(2)}`; // Prestação
          },
        },
      },
      legend: {
        position: isMobile ? 'bottom' : 'top',
        horizontalAlign: 'center',
        labels: { colors: labelColor },
      },
      grid: { borderColor: gridColor, strokeDashArray: 3 },
      colors: ['#3b82f6', '#ef4444', '#10b981'], // Azul para Var, Vermelho para Fixa, Verde para Prestação
    };
  }, [theme, isMobile]);

  if (!series.length) {
    return <div className="text-center p-8">A carregar dados...</div>;
  }

  return <ReactApexChart options={chartOptions} series={series} type="line" height={450} />;
}