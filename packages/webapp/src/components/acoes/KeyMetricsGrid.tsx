// C:\Users\nunos\Desktop\ativos.pt\packages\webapp\src\components\acoes\KeyMetricsGrid.tsx

import React from 'react';
import type { FinancialData } from '~/lib/stock-data-fetcher';
import InfoTooltip from './InfoTooltip'; // NOVO: Importar o nosso componente de tooltip

// Helpers de formatação
const fmt = (val: number | null | undefined, decimals = 2) => {
  if (val == null) return '—';
  return val.toFixed(decimals);
};

const compactFmt = (val: number | null | undefined) => {
    if (val == null) return '—';
    return new Intl.NumberFormat('pt-PT', {
        notation: 'compact',
        compactDisplay: 'short',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(val);
}

const fmtPct = (val: number | null | undefined, decimals = 2) => {
    if (val == null) return '—';
    return `${(val * 100).toFixed(decimals)}%`;
}

const Metric: React.FC<{ label: string; value: string; tooltip?: string }> = ({ label, value, tooltip }) => (
    <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 py-3 last:border-b-0">
        <div className="flex items-center gap-1.5">
            <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
            {/* CORREÇÃO: Usar o novo componente de tooltip profissional */}
            {tooltip && <InfoTooltip content={tooltip} />}
        </div>
        <span className="text-sm font-semibold font-mono text-gray-900 dark:text-gray-100">{value}</span>
    </div>
);


const KeyMetricsGrid: React.FC<{ stats?: FinancialData | null }> = ({ stats }) => {
    if (!stats) {
        return <div className="text-center text-sm text-gray-500">Dados de métricas indisponíveis.</div>;
    }

    const metrics = {
        valuation: [
            { label: 'Market Cap', value: compactFmt(stats.marketCap), tooltip: 'Capitalização de Mercado: Valor total de mercado das ações da empresa (Preço da Ação × N.º de Ações).' },
            { label: 'P/E', value: fmt(stats.trailingPE), tooltip: 'Price-to-Earnings: Rácio que compara o preço da ação com o lucro por ação.' },
            { label: 'P/S', value: fmt(stats.priceToSales), tooltip: 'Price-to-Sales: Rácio que compara o preço da ação com a receita por ação.' },
            { label: 'P/B', value: fmt(stats.priceToBook), tooltip: 'Price-to-Book: Rácio que compara o preço da ação com o valor contabilístico por ação.' },
            { label: 'EV/EBITDA', value: fmt(stats.enterpriseToEbitda), tooltip: 'Enterprise Value / Lucro Antes de Juros, Impostos, Depreciação e Amortização. Um rácio de avaliação comum.' },
        ],
        profitability: [
            { label: 'Margem de Lucro', value: fmtPct(stats.profitMargins), tooltip: 'Percentagem da receita que se transforma em lucro líquido.' },
            { label: 'Margem Operacional', value: fmtPct(stats.operatingMargins), tooltip: 'Eficiência operacional. Lucro operacional como percentagem da receita.' },
            { label: 'Retorno s/ Ativos (ROA)', value: fmtPct(stats.returnOnAssets), tooltip: 'Quão eficientemente a empresa usa os seus ativos para gerar lucro.' },
            { label: 'Retorno s/ Capital (ROE)', value: fmtPct(stats.returnOnEquity), tooltip: 'Rentabilidade da empresa em relação ao capital próprio dos acionistas.' },
            { label: 'Cresc. Receita (est.)', value: stats.revenueGrowth ? `${fmt(stats.revenueGrowth)}%` : '—', tooltip: 'Estimativa de crescimento da receita para o próximo ano, segundo os analistas.' },
        ],
        health: [
            { label: 'Dívida/Capital', value: fmt(stats.debtToEquity), tooltip: 'Rácio de alavancagem financeira. Compara a dívida total com o capital próprio.' },
            { label: 'Rácio Corrente', value: fmt(stats.currentRatio), tooltip: 'Mede a capacidade da empresa de pagar as suas obrigações de curto prazo. (Ativos Correntes / Passivos Correntes)' },
            { label: 'Dívida Total', value: compactFmt(stats.totalDebt), tooltip: 'Valor total da dívida de curto e longo prazo da empresa.' },
            { label: 'Beta', value: fmt(stats.beta), tooltip: 'Medida da volatilidade da ação em relação ao mercado. Um Beta > 1 é mais volátil que o mercado.' },
        ]
    };

    return (
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Indicadores Chave</h3>
            <div className="mt-4 space-y-6">
                <section>
                    <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Avaliação</h4>
                    {metrics.valuation.map(m => <Metric key={m.label} {...m} />)}
                </section>
                <section>
                    <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Rentabilidade</h4>
                    {metrics.profitability.map(m => <Metric key={m.label} {...m} />)}
                </section>
                <section>
                    <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Saúde Financeira</h4>
                    {metrics.health.map(m => <Metric key={m.label} {...m} />)}
                </section>
            </div>
        </div>
    );
};

export default KeyMetricsGrid;