// C:\Users\nunos\Desktop\ativos.pt\packages\webapp\src\components\acoes\hub\ScreenerCard.tsx
import React from 'react';
import type { ScreenerResult } from '~/lib/stock-data-fetcher';
import { IconBuildingFortress } from '@tabler/icons-react';

const ScreenerCard: React.FC<{ title: string; data: ScreenerResult[] }> = ({ title, data }) => {
    return (
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3 mb-4">
                <IconBuildingFortress size={28} className="text-blue-500" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{title}</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b dark:border-gray-700">
                            <th className="py-2 text-xs font-semibold text-gray-500 uppercase">Ticker</th>
                            <th className="py-2 text-xs font-semibold text-gray-500 uppercase">Market Cap</th>
                            <th className="py-2 text-xs font-semibold text-gray-500 uppercase text-right">Preço</th>
                            <th className="py-2 text-xs font-semibold text-gray-500 uppercase text-right">Variação</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map(item => (
                            <tr key={item.ticker} className="border-b dark:border-gray-700 last:border-0">
                                <td className="py-3">
                                    <a href={`/acoes/${item.ticker}`} className="group">
                                        <p className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">{item.ticker}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[150px] truncate" title={item.name}>{item.name}</p>
                                    </a>
                                </td>
                                <td className="py-3 font-mono text-sm text-gray-500 dark:text-gray-400">{item.marketCap}</td>
                                <td className="py-3 font-semibold font-mono text-gray-900 dark:text-gray-100 text-right">{item.price?.toFixed(2) ?? '—'}</td>
                                <td className={`py-3 font-semibold font-mono text-right ${item.changePercent == null || item.changePercent >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {item.changePercent != null && item.changePercent > 0 ? '+' : ''}{item.changePercent?.toFixed(2) ?? '0.00'}%
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ScreenerCard;