// C:\Users\nunos\Desktop\ativos.pt\packages\webapp\src\components\acoes\EpsCard.tsx

import React from 'react';
import type { EpsQuarter } from '~/lib/stock-data-fetcher';
import { IconTrendingUp, IconTrendingDown, IconMinus, IconChartDots } from '@tabler/icons-react';

const ReactLogo = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="-11.5 -10.23174 23 20.46348" className="w-12 h-12 text-gray-400 dark:text-gray-600">
        <circle cx="0" cy="0" r="2.05" fill="#61dafb"></circle>
        <g stroke="#61dafb" strokeWidth="1" fill="none">
            <ellipse rx="11" ry="4.2"></ellipse>
            <ellipse rx="11" ry="4.2" transform="rotate(60)"></ellipse>
            <ellipse rx="11" ry="4.2" transform="rotate(120)"></ellipse>
        </g>
    </svg>
);

const formatQuarter = (q: EpsQuarter): string => {
    // Prioridade 1: Tenta construir a partir do endDate, que é mais fiável
    if (q.endDate) {
        try {
            const dateObj = new Date(q.endDate);
            if (!isNaN(dateObj.getTime())) {
                const year = String(dateObj.getFullYear()).slice(-2);
                const quarterNum = Math.floor(dateObj.getMonth() / 3) + 1;
                return `Q${quarterNum} ${year}`;
            }
        } catch (e) {}
    }

    // Prioridade 2: Tenta interpretar a string 'quarter' se for uma data longa
    if (q.quarter) {
        try {
            const dateObj = new Date(q.quarter);
            if (!isNaN(dateObj.getTime())) {
                const year = String(dateObj.getFullYear()).slice(-2);
                const quarterNum = Math.floor(dateObj.getMonth() / 3) + 1;
                return `Q${quarterNum} ${year}`;
            }
        } catch (e) {}
    }
    
    // Fallback: Se o 'quarter' já estiver num bom formato, usa-o.
    if (q.quarter?.match(/^Q\d{1}\s\d{2}$/) || q.quarter?.match(/^\d{1}Q\d{4}$/)) {
        return q.quarter;
    }

    // Último recurso
    return "—";
};

const QuarterCard: React.FC<{ q: EpsQuarter }> = ({ q }) => {
    const displayQuarter = formatQuarter(q);

    if (q.actual == null || q.estimate == null) {
        return (
            <div className="bg-gray-100 dark:bg-gray-800/30 p-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center h-full min-h-[140px]">
                <IconChartDots size={24} className="text-gray-400 dark:text-gray-600 mb-2"/>
                <span className="font-bold text-sm text-gray-800 dark:text-gray-200">{displayQuarter}</span>
                <span className="text-xs text-gray-500 dark:text-gray-500 mt-1">Dados em falta</span>
            </div>
        );
    }
    
    const beat = q.actual >= q.estimate;
    const surprisePct = q.surprisePct ?? 0;
    let statusColor = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    let StatusIcon = IconMinus;

    if (surprisePct > 0.01) {
        statusColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
        StatusIcon = IconTrendingUp;
    } else if (surprisePct < -0.01) {
        statusColor = 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
        StatusIcon = IconTrendingDown;
    }

    return (
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl flex flex-col justify-between h-full transition-transform hover:scale-105 hover:shadow-lg">
            <div>
                <div className="flex justify-between items-center mb-4">
                    <p className="font-bold text-gray-800 dark:text-gray-200">{displayQuarter}</p>
                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${statusColor}`}>
                        <StatusIcon size={14} />
                        <span>{surprisePct.toFixed(2)}%</span>
                    </div>
                </div>
                <div className="relative h-6 w-full">
                    <div className="absolute top-1/2 -translate-y-1/2 h-0.5 w-full bg-gray-300 dark:bg-gray-600"></div>
                    <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: '33.33%' }}>
                        <div className="w-3 h-3 bg-gray-400 dark:bg-gray-500 rounded-full border-2 border-white dark:border-gray-900"></div>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 text-center">
                            <span className="text-xs text-gray-500 dark:text-gray-400 block">Est.</span>
                            <span className="text-sm font-bold font-mono text-gray-600 dark:text-gray-300">{q.estimate.toFixed(2)}</span>
                        </div>
                    </div>
                    <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: '66.67%' }}>
                        <div className={`w-4 h-4 rounded-full border-2 border-white dark:border-gray-900 ${beat ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 text-center">
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 block">Real</span>
                            <span className="text-sm font-bold font-mono text-gray-800 dark:text-gray-100">{q.actual.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const EpsCard: React.FC<{ data?: EpsQuarter[] }> = ({ data = [] }) => {
    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[150px] text-center bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                <div className="animate-spin-slow"><ReactLogo /></div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">Dados de Surpresas de EPS indisponíveis.</p>
            </div>
        );
    }
    
    const displayData = data.slice(-4).reverse();

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {displayData.map((q, i) => <QuarterCard key={`${q.quarter}-${i}`} q={q} />)}
        </div>
    );
};

export default EpsCard;