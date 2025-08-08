// FinancialRatiosGrid.tsx
import React from 'react';
import type { FinancialData } from '~/lib/stock-data-fetcher';

interface Props { stats: FinancialData }

const FinancialRatiosGrid: React.FC<Props> = ({ stats }) => {
  const items: [string, string][] = [
    ['ROE', stats.returnOnEquity ? (stats.returnOnEquity * 100).toFixed(2) + '%' : '—'],
    ['ROA', stats.returnOnAssets ? (stats.returnOnAssets * 100).toFixed(2) + '%' : '—'],
    ['Margem Oper.', stats.operatingMargins ? (stats.operatingMargins * 100).toFixed(2) + '%' : '—'],
    ['Margem Líq.', stats.profitMargins ? (stats.profitMargins * 100).toFixed(2) + '%' : '—'],
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {items.map(([label, value]) => (
        <div key={label} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <h4 className="text-xs text-gray-500 uppercase">{label}</h4>
          <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
      ))}
    </div>
  );
};

export default FinancialRatiosGrid;
