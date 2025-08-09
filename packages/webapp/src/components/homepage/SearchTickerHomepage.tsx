// C:\Users\nunos\Desktop\ativos.pt\packages\webapp\src\components\homepage\SearchTickerHomepage.tsx
import React, { useState } from 'react';
import { IconSearch } from '@tabler/icons-react';

const SearchTickerHomepage: React.FC = () => {
    const [ticker, setTicker] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (ticker.trim()) {
            window.location.href = `/acoes/${ticker.trim().toUpperCase()}`;
        }
    };

    return (
        <form onSubmit={handleSubmit} className="relative w-full max-w-2xl mx-auto group">
            <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                placeholder="Pesquisar Ação, ETF ou Fundo (ex: AAPL, EDP.LS...)"
                className="w-full pl-6 pr-14 py-4 text-base md:text-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800/80 border-2 border-gray-300 dark:border-gray-700 rounded-full shadow-lg outline-none transition-all duration-300 focus:border-primary dark:focus:border-primary focus:ring-4 focus:ring-primary/20"
            />
            <button
                type="submit"
                className="absolute top-1/2 right-3 -translate-y-1/2 p-2 text-gray-400 group-hover:text-primary dark:group-hover:text-primary transition-colors"
                aria-label="Pesquisar"
            >
                <IconSearch size={28} />
            </button>
        </form>
    );
};

export default SearchTickerHomepage;