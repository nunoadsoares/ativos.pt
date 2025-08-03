import { type FC } from 'react';
import ApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

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
  if (!seriesData || seriesData.length === 0 || seriesData.every(v => v === null || typeof v !== 'number')) {
    return (
      <div
        style={{
          width: typeof width === 'number' ? `${width}px` : width,
          height: `${height}px`,
          background: '#f3f4f6',
          borderRadius: '6px'
        }}
      />
    );
  }

  // Garante que a linha é sempre totalmente opaca
  const mainColor = color.startsWith('#') ? color : '#8b5cf6'; // fallback
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
      colors: [mainColor], // Linha: sempre opaca
    },
    fill: {
      type: 'solid',
      opacity: 1,
      colors: [fillColor], // Fill com mais opacidade
    },
    tooltip: { enabled: false },
    markers: { size: 0 },
    grid: { show: false },
    xaxis: { labels: { show: false }, axisTicks: { show: false }, axisBorder: { show: false } },
    yaxis: { show: false, min: undefined, max: undefined },
  };

  const series = [
    {
      name: 'Tendência',
      data: seriesData,
    },
  ];

  return (
    <div
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: `${height}px`,
        minWidth: 0,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <ApexChart
        type="line"
        height={height}
        width={width}
        series={series}
        options={options}
      />
    </div>
  );
};

// Função utilitária para converter HEX para RGBA
function hexToRgba(hex: string, alpha: number) {
  // Remove o # se existir
  hex = hex.replace('#', '');
  // Se for shorthand, expande
  if (hex.length === 3) {
    hex = hex.split('').map(x => x + x).join('');
  }
  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

export default Sparkline;
