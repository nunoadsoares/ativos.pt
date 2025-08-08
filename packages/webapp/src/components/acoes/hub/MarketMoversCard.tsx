// C:\Users\nunos\Desktop\ativos.pt\packages\webapp\src\components\acoes\hub\MarketMoversCard.tsx
import React, { useState } from 'react';
import type { MoverData } from '~/lib/stock-data-fetcher';
import { IconTrendingUp, IconActivity } from '@tabler/icons-react';

const MoverList: React.FC<{ movers: MoverData[], colorClass: string }> = ({ movers, colorClass }) => (
    <ul className="space-y-3">
        {movers.map(mover => (
           <li key={mover.ticker} className="border-b border-gray-200 dark:border-gray-700 pb-3 last:border-b-0">
                <a href={`/acoes/${mover.ticker}`} className="flex justify-between items-center gap-4 group">
                    <div>
                        <p className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">{mover.ticker}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[150px] truncate" title={mover.name}>{mover.name}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                        <p className="font-semibold font-mono text-gray-900 dark:text-gray-100">{mover.price?.toFixed(2) ?? '—'}</p>
                        <p className={`font-semibold font-mono ${colorClass}`}>
                            {mover.changePercent != null && mover.changePercent > 0 ? '+' : ''}{mover.changePercent?.toFixed(2) ?? '0.00'}%
                        </p>
                    </div>
                </a>
           </li>
        ))}
    </ul>
);

const MarketMoversCard: React.FC<{ topGainers: MoverData[], mostActives: MoverData[] }> = ({ topGainers, mostActives }) => {
    const [activeTab, setActiveTab] = useState<'gainers' | 'actives'>('gainers');

    return (
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800">
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
                <button onClick={() => setActiveTab('gainers')} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors ${activeTab === 'gainers' ? 'border-b-2 border-emerald-500 text-emerald-500' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}>
                    <IconTrendingUp size={20} /> Maiores Ganhos (EUA)
                </button>
                <button onClick={() => setActiveTab('actives')} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors ${activeTab === 'actives' ? 'border-b-2 border-violet-500 text-violet-500' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}>
                    <IconActivity size={20} /> Ações Mais Ativas (EUA)
                </button>
            </div>
            <div>
                {activeTab === 'gainers' && <MoverList movers={topGainers} colorClass="text-emerald-500" />}
                {activeTab === 'actives' && <MoverList movers={mostActives} colorClass={mostActives[0]?.changePercent >= 0 ? 'text-emerald-500' : 'text-red-500'} />}
            </div>
        </div>
    );
};

export default MarketMoversCard;