// C:\Users\nunos\Desktop\ativos.pt\packages\webapp\src\components\acoes\PriceTargetCard.tsx

import React from 'react';
import type { PriceTarget } from '~/lib/stock-data-fetcher';
import { IconTargetOff } from '@tabler/icons-react';

const PriceTargetCard: React.FC<{ target?: PriceTarget | null }> = ({ target }) => {
    // Validação robusta dos dados
    if (!target || target.low == null || target.mean == null || target.high == null || target.currentPrice == null) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[150px] text-center">
                <IconTargetOff size={32} className="text-gray-400 dark:text-gray-500 mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Dados de Preço-Alvo indisponíveis.</p>
            </div>
        );
    }
    
    // CORREÇÃO: Extrair a moeda do objeto 'target', com 'USD' como fallback
    const { low, mean, high, currentPrice, currency = 'USD' } = target;

    // Garante que o range nunca é zero para evitar divisão por zero
    const range = (high - low) === 0 ? 1 : (high - low);
    
    const calculatePosition = (value: number) => {
        const pos = ((value - low) / range) * 100;
        return Math.max(0, Math.min(100, pos));
    };

    const currentPosition = calculatePosition(currentPrice);
    const meanPosition = calculatePosition(mean);

    // CORREÇÃO: A função de formatação agora usa a moeda dinâmica que vem da API
    const fmt = (v: number) => {
        // Usamos 'de-DE' para euros para que o símbolo (€) apareça à direita, que é mais comum em Portugal.
        const locale = currency === 'EUR' ? 'de-DE' : 'en-US';
        return new Intl.NumberFormat(locale, { 
            style: 'currency', 
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(v);
    }

    return (
        <div className="space-y-4">
            {/* Callout Principal: Preço Atual */}
            <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">Preço Atual</p>
                <p className="text-4xl font-bold font-mono text-gray-900 dark:text-gray-100">{fmt(currentPrice)}</p>
            </div>

            {/* Barra de Preços Visual */}
            <div className="w-full space-y-2 pt-4">
                <div className="relative h-2.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full">
                    {/* Marcador do Preço-Alvo Médio */}
                    <div
                        className="absolute top-1/2 -translate-y-1/2 w-1 h-4 bg-gray-400 dark:bg-gray-500 rounded-full"
                        style={{ left: `${meanPosition}%` }}
                        title={`Preço-Alvo Médio: ${fmt(mean)}`}
                    ></div>
                    {/* Marcador do Preço Atual */}
                    <div
                        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full border-2 border-white dark:border-gray-900 shadow-lg"
                        style={{ left: `${currentPosition}%` }}
                        title={`Preço Atual: ${fmt(currentPrice)}`}
                    ></div>
                </div>
                
                {/* Legendas (Mínimo e Máximo) */}
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 font-mono">
                    <span title={`Preço-Alvo Mínimo: ${fmt(low)}`}>{fmt(low)}</span>
                    <span title={`Preço-Alvo Máximo: ${fmt(high)}`}>{fmt(high)}</span>
                </div>
            </div>
            
            {/* Legendas Detalhadas */}
            <div className="grid grid-cols-3 gap-4 pt-4 text-center">
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Mínimo</p>
                    <p className="font-semibold font-mono text-red-500">{fmt(low)}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Médio</p>
                    <p className="font-semibold font-mono text-gray-800 dark:text-gray-200">{fmt(mean)}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Máximo</p>
                    <p className="font-semibold font-mono text-emerald-500">{fmt(high)}</p>
                </div>
            </div>
        </div>
    );
};

export default PriceTargetCard;