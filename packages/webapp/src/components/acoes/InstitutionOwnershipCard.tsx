// C:\Users\nunos\Desktop\ativos.pt\packages\webapp\src\components\acoes\InstitutionOwnershipCard.tsx
import React from 'react';
import type { InstitutionalOwner } from '~/lib/stock-data-fetcher';
import { IconBuildingBank } from '@tabler/icons-react';

const InstitutionOwnershipCard: React.FC<{ owners: InstitutionalOwner[] }> = ({ owners }) => {
  if (!owners || owners.length === 0) {
    return null; // Não renderiza nada se não houver dados
  }

  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800">
      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Maiores Acionistas Institucionais</h3>
      <ul className="space-y-3">
        {owners.map((owner) => (
          <li key={owner.organization} className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <IconBuildingBank size={20} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
              <p className="text-sm text-gray-700 dark:text-gray-300 truncate" title={owner.organization}>
                {owner.organization}
              </p>
            </div>
            <p className="text-sm font-semibold font-mono text-gray-900 dark:text-gray-100">
              {/* CORREÇÃO: Adicionar verificação para evitar NaN% */}
              {owner.pctHeld != null ? `${(owner.pctHeld * 100).toFixed(2)}%` : '—'}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default InstitutionOwnershipCard;