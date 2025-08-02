// packages/webapp/src/components/RatesCompareChart.tsx
import { useEffect, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

// Tipos de dados
type Point = [string, number];
interface Series { name: string; data: Point[] }
interface CondicoesCredito {
  date: string;
  tan_variavel?: number;
  tan_fixa?: number;
  tan_mista?: number;
  montante_mediano?: number;
}

export default function RatesCompareChart() {
  const [series, setSeries] = useState<Series[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [isMobile, setIsMobile] = useState(false);

  // Efeitos para tema e ecrã (mantêm-se iguais)
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

  // --- LÓGICA DE FETCH ATUALIZADA ---
  useEffect(() => {
    // Promessa para buscar os dados da TAEG (do CSV antigo)
    const fetchTaeg = fetch('/data/interest_rate_taeg.csv')
      .then(r => r.text())
      .then(txt => {
        const rows = txt.trim().split('\n').slice(1);
        const data: Point[] = rows
          .map(line => line.split(','))
          .filter(([, v]) => v && !isNaN(+v))
          .map(([d, v]) => [d, parseFloat(v)]);
        return { name: 'TAEG', data };
      });

    // Promessa para buscar os dados da TAN (do nosso NOVO JSON)
    const fetchTan = fetch('/data/credito_habitacao_condicoes.json')
      .then(r => r.json())
      .then((jsonData: CondicoesCredito[]) => {
        const data: Point[] = jsonData
          .filter(row => row.tan_variavel !== null && typeof row.tan_variavel === 'number')
          .map(row => [row.date, row.tan_variavel as number]);
        // Usamos a TAN Variável como referência principal
        return { name: 'TAN (Variável)', data };
      });

    // Executa ambas as promessas e junta os resultados
    Promise.all([fetchTaeg, fetchTan]).then(results => {
      setSeries(results.filter(s => s.data.length > 0)); // Filtra séries que possam vir vazias
    });
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
      style: { fontSize: '12px' },
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