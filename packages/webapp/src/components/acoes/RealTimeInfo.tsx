// C:\Users\nunos\Desktop\ativos.pt\packages\webapp\src\components\acoes\RealTimeInfo.tsx

// CORREÇÃO: Adicionar 'useState' e 'useEffect' ao import do React.
import React, { useState, useEffect } from 'react';
import type { QuoteData } from '~/lib/stock-data-fetcher';
import { IconArrowDownRight, IconArrowUpRight } from '@tabler/icons-react';

interface Props {
  ticker: string;
  initialQuote: QuoteData;
}

const RealTimeInfo: React.FC<Props> = ({ ticker, initialQuote }) => {
  const [quote, setQuote] = useState(initialQuote);

  // Efeito para buscar a cotação atualizada a cada 30 segundos
  useEffect(() => {
    // A função de fetch é definida dentro do useEffect
    const fetchLatestQuote = async () => {
      try {
        const response = await fetch(`/api/quote/${ticker}`);
        if (!response.ok) return;
        const newQuoteData: QuoteData = await response.json();
        setQuote(newQuoteData);
      } catch (error) {
        console.error("Falha ao atualizar a cotação em tempo real:", error);
      }
    };

    // Define um intervalo para chamar a função de fetch
    const intervalId = setInterval(fetchLatestQuote, 30000); // 30 segundos

    // Função de limpeza: remove o intervalo quando o componente é desmontado
    return () => clearInterval(intervalId);
  }, [ticker]); // O efeito é re-executado se o ticker mudar

  const isUp = quote.change >= 0;
  
  const priceFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: quote.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(quote.latestValue);

  const changeFormatted = (isUp ? '+' : '') + quote.change.toFixed(2);
  const changePercentFormatted = `(${(isUp ? '+' : '') + quote.changePercent.toFixed(2)}%)`;

  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <p className="text-5xl font-bold font-mono text-gray-900 dark:text-gray-100 leading-none">
        {priceFormatted}
      </p>

      <div className="flex items-baseline gap-x-2">
        <p className={`text-2xl font-semibold font-mono ${isUp ? 'text-emerald-500' : 'text-red-500'}`}>
          {changeFormatted}
        </p>
        <span 
          className={`flex items-center gap-1 text-base font-semibold px-2 py-0.5 rounded-full ${isUp ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'}`}
        >
          {isUp ? <IconArrowUpRight size={16} /> : <IconArrowDownRight size={16} />}
          <span>{quote.changePercent.toFixed(2)}%</span>
        </span>
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 w-full sm:w-auto">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span>Última atualização: {new Date(quote.latestDate).toLocaleTimeString('pt-PT')}</span>
      </div>
    </div>
  );
};

export default RealTimeInfo;