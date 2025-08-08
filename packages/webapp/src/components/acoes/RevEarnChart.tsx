// C:\Users\nunos\Desktop\ativos.pt\packages\webapp\src\components\acoes\RevEarnChart.tsx

import React from 'react';
import Highcharts from 'highcharts';
import HighchartsReactOfficial from 'highcharts-react-official';
import type { RevenueEarningsPoint } from '~/lib/stock-data-fetcher';
import { IconChartAreaLine } from '@tabler/icons-react';

const HighchartsReact = (HighchartsReactOfficial as any).default ?? HighchartsReactOfficial;

const RevEarnChart: React.FC<{ data?: RevenueEarningsPoint[] }> = ({ data: series = [] }) => {
    if (!series || series.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                <IconChartAreaLine size={40} className="text-gray-400 dark:text-gray-500 mb-4" />
                <h4 className="font-semibold text-gray-700 dark:text-gray-300">Gráfico de Receita e Lucro</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Dados indisponíveis para este ativo.</p>
            </div>
        );
    }
    
    const quarters = series.map(p => p.quarter);
    const revenue  = series.map(p => p.revenue);
    const earnings = series.map(p => p.earnings);

    const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');
    const fmt = (n: number) => {
        if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
        if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
        return n.toFixed(0);
    };

    const options: Highcharts.Options = {
        chart: { backgroundColor: 'transparent', style: { fontFamily: 'inherit' }, spacingBottom: 0, spacingTop: 20 },
        title: { text: undefined },
        credits: { enabled: false },
        xAxis: {
            categories: quarters,
            crosshair: { width: 1, color: isDark ? '#555' : '#ccc' },
            labels: { style: { color: isDark ? '#9ca3af' : '#6b7280' } },
            lineColor: isDark ? '#4b5563' : '#d1d5db',
        },
        yAxis: {
            title: { text: undefined },
            labels: {
                formatter() { return fmt(this.value as number); },
                style: { color: isDark ? '#9ca3af' : '#6b7280' }
            },
            gridLineColor: isDark ? '#374151' : '#e5e7eb'
        },
        legend: {
            enabled: true,
            itemStyle: { color: isDark ? '#d1d5db' : '#374151' },
            itemHoverStyle: { color: isDark ? '#ffffff' : '#000000' },
        },
        tooltip: {
            shared: true,
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.95)',
            borderColor: isDark ? '#4b5563' : '#e5e7eb',
            style: { color: isDark ? '#f9fafb' : '#1f2937' },
        },
        plotOptions: {
            column: { borderWidth: 0, borderRadius: 4, groupPadding: 0.15 },
            series: { animation: { duration: 500 } }
        },
        series: [{
            type: 'column',
            name: 'Receita',
            data: revenue,
            color: isDark ? '#38bdf8' : '#0ea5e9', // Sky
            opacity: 0.7
        }, {
            type: 'spline',
            name: 'Lucro',
            data: earnings,
            color: isDark ? '#a78bfa' : '#8b5cf6', // Violet
            marker: { enabled: false, symbol: 'circle' }
        }] as Highcharts.SeriesOptionsType[],
    };

    return <HighchartsReact highcharts={Highcharts} options={options} />;
};

export default RevEarnChart;