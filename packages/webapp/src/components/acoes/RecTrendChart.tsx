// C:\Users\nunos\Desktop\ativos.pt\packages\webapp\src\components\acoes\RecTrendChart.tsx

import React, { useState, useEffect } from 'react';
import Highcharts from 'highcharts';
import HighchartsReactOfficial from 'highcharts-react-official';
import type { RecommendationTrend } from '~/lib/stock-data-fetcher';
import { IconUsersGroup } from '@tabler/icons-react';

// Carregar módulos dinamicamente
let highchartsModulesLoaded = false;
function loadHighchartsModules(): Promise<void> {
    if (highchartsModulesLoaded || typeof window === 'undefined') {
        return Promise.resolve();
    }
    return Promise.all([
        import('highcharts/highcharts-more'),
        import('highcharts/modules/solid-gauge'),
        import('highcharts/modules/exporting')
    ]).then(([highchartsMore, solidGauge, exporting]) => {
        highchartsMore.default(Highcharts);
        solidGauge.default(Highcharts);
        exporting.default(Highcharts);
        highchartsModulesLoaded = true;
    }).catch(err => {
        console.error("Erro ao carregar módulos do Highcharts:", err);
    });
}

const HighchartsReact = (HighchartsReactOfficial as any).default ?? HighchartsReactOfficial;

const RecTrendChart: React.FC<{ trends: RecommendationTrend[] }> = ({ trends = [] }) => {
    const [isChartReady, setIsChartReady] = useState(false);
    const [activePeriod, setActivePeriod] = useState(trends[0]?.period || '0m');

    useEffect(() => {
        loadHighchartsModules().then(() => {
            setIsChartReady(true);
        });
    }, []);

    if (!trends.length) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[280px] text-center">
                <IconUsersGroup size={40} className="text-gray-400 dark:text-gray-500 mb-4" />
                <h4 className="font-semibold text-gray-700 dark:text-gray-300">Sentimento dos Analistas</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Dados de recomendações não disponíveis.</p>
            </div>
        );
    }

    if (!isChartReady) {
        return (
            <div className="flex justify-center items-center h-[280px]">
                <svg className="animate-spin w-6 h-6 text-blue-500" viewBox="0 0 24 24">
                    <circle className="opacity-25" r="10" cx="12" cy="12" strokeWidth="4" stroke="currentColor" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            </div>
        );
    }

    const activeTrend = trends.find(t => t.period === activePeriod) || trends[0];
    const { strongBuy, buy, hold, underperform, sell } = activeTrend;
    const total = strongBuy + buy + hold + underperform + sell;

    const score = total > 0 
        ? (strongBuy * 5 + buy * 4 + hold * 3 + underperform * 2 + sell * 1) / total
        : 0;
    
    const getSentiment = (s: number) => {
        if (s >= 4.5) return { text: 'Compra Muito Forte', color: '#10b981' };
        if (s >= 3.5) return { text: 'Comprar', color: '#22c55e' };
        if (s >= 2.5) return { text: 'Manter', color: '#facc15' };
        if (s >= 1.5) return { text: 'Vender', color: '#f97316' };
        return { text: 'Venda Forte', color: '#ef4444' };
    };

    const sentiment = getSentiment(score);
    const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');
    
    const options: Highcharts.Options = {
        chart: { type: 'solidgauge', backgroundColor: 'transparent', height: 200, margin: [0,0,0,0] },
        title: { text: undefined },
        credits: { enabled: false },
        exporting: { enabled: false },
        pane: {
            center: ['50%', '70%'],
            size: '120%',
            startAngle: -90,
            endAngle: 90,
            background: [{
                backgroundColor: isDark ? '#374151' : '#e5e7eb',
                innerRadius: '60%',
                outerRadius: '100%',
                shape: 'arc',
                borderWidth: 0,
            }]
        },
        yAxis: {
            min: 1, max: 5,
            stops: [ [0.1, '#ef4444'], [0.3, '#f97316'], [0.5, '#facc15'], [0.7, '#22c55e'], [0.9, '#10b981'] ],
            lineWidth: 0, tickAmount: 2, labels: { enabled: false },
        },
        plotOptions: {
            solidgauge: { dataLabels: { enabled: false }, linecap: 'round', stickyTracking: false, rounded: true }
        },
        tooltip: {
            enabled: true,
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            borderColor: isDark ? '#4b5563' : '#e2e8f0',
            borderRadius: 8,
            borderWidth: 1,
            shadow: true,
            useHTML: true,
            positioner: function (labelWidth, labelHeight, point) {
                return {
                    x: point.plotX! + (this.chart.plotLeft || 0) - labelWidth / 2,
                    y: point.plotY! + (this.chart.plotTop || 0) - labelHeight - 10
                };
            },
            formatter: function() {
                const scoreValue = this.y as number;
                const textColor = isDark ? 'text-gray-200' : 'text-gray-800';
                const scoreColor = getSentiment(scoreValue).color;
                
                return `
                    <div class="p-2 ${textColor} text-center">
                        <div class="font-semibold mb-1">Sentimento</div>
                        <div class="flex items-center justify-center gap-2">
                            <span class="font-bold text-lg" style="color: ${scoreColor};">${scoreValue.toFixed(2)}</span>
                            <span class="text-sm">/ 5</span>
                        </div>
                    </div>
                `;
            }
        },
        series: [{
            type: 'solidgauge',
            name: 'Sentimento',
            data: [score],
        }]
    };

    return (
        <div className="flex flex-col items-center">
            <div className="flex items-center p-1 bg-gray-100 dark:bg-gray-800 rounded-lg mb-4">
                {trends.map(trend => (
                    <button
                        key={trend.period}
                        onClick={() => setActivePeriod(trend.period)}
                        className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${
                            activePeriod === trend.period
                                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                    >
                        {trend.period.replace('m', ' Mês')}
                    </button>
                ))}
            </div>
            <div className="relative w-full">
                <HighchartsReact highcharts={Highcharts} options={options} />
                <div className="absolute bottom-[20%] left-0 right-0 text-center pointer-events-none">
                    <div className="font-bold text-4xl text-gray-900 dark:text-gray-100">{score.toFixed(2)}</div>
                    <div className="font-semibold text-lg" style={{ color: sentiment.color }}>{sentiment.text}</div>
                </div>
            </div>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400 mt-2">
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span><span>Compra Forte ({strongBuy})</span></div>
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]"></span><span>Comprar ({buy})</span></div>
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#facc15]"></span><span>Manter ({hold})</span></div>
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#f97316]"></span><span>Vender ({underperform})</span></div>
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></span><span>Venda Forte ({sell})</span></div>
            </div>
        </div>
    );
};

export default RecTrendChart;