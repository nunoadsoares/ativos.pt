// C:\Users\nunos\Desktop\ativos.pt\packages\webapp\src\components\Sparkline.tsx
import React, { useState, useEffect, type FC } from 'react';
import type { ApexOptions } from 'apexcharts';

// Função utilitária para converter HEX para RGBA
function hexToRgba(hex: string, alpha: number) {
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(x => x + x).join('');
  }
  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

interface Props {
  seriesData: number[];
  color: string;
  width?: number | string;
  height?: number;
}

const Sparkline: FC<Props> = ({
  seriesData,
  color,
  width = 120,
  height = 40
}) => {
  // Estado para guardar o componente do gráfico, que só será carregado no browser.
  const [Chart, setChart] = useState<any>(null);

  // Efeito que só corre no browser. Esta é a forma correta.
  useEffect(() => {
    // Importamos dinamicamente a biblioteca de gráficos aqui.
    import('react-apexcharts').then(mod => {
      // Quando a importação termina, guardamos o componente no nosso estado.
      setChart(() => mod.default);
    });
  }, []); // O array vazio garante que isto só corre uma vez.

  // Enquanto o componente do gráfico não estiver carregado, mostramos um placeholder.
  if (!Chart) {
    return (
        <div
            style={{
                width: typeof width === 'number' ? `${width}px` : width,
                height: `${height}px`,
                background: 'transparent',
            }}
        />
    );
  }

  const mainColor = color.startsWith('#') ? color : '#8b5cf6';
  const fillColor = color.startsWith('#') ? hexToRgba(color, 0.32) : 'rgba(139,92,246,0.32)';

  const options: ApexOptions = {
    chart: {
      type: 'line',
      sparkline: { enabled: true },
      animations: { enabled: false },
    },
    stroke: {
      curve: 'smooth',
      width: 2.5,
      colors: [mainColor],
    },
    fill: {
      type: 'solid',
      opacity: 1,
      colors: [fillColor],
    },
    tooltip: { enabled: false },
    markers: { size: 0 },
    grid: { show: false },
    xaxis: { labels: { show: false }, axisTicks: { show: false }, axisBorder: { show: false } },
    yaxis: { show: false, min: undefined, max: undefined },
  };

  const series = [{ name: 'Tendência', data: seriesData }];

  return (
    <div style={{ width: typeof width === 'number' ? `${width}px` : width, height: `${height}px` }}>
      <Chart
        type="line"
        height={height}
        width={width}
        series={series}
        options={options}
      />
    </div>
  );
};

export default Sparkline;