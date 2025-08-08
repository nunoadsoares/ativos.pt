// C:\Users\nunos\Desktop\ativos.pt\packages\webapp\src\components\acoes\SearchTicker.tsx
import React, { useState } from 'react';
import { IconSearch } from '@tabler/icons-react';

const SearchTicker: React.FC = () => {
    const [ticker, setTicker] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (ticker.trim()) {
            window.location.href = `/acoes/${ticker.trim().toUpperCase()}`;
        }
    };

    return (
        <form onSubmit={handleSubmit} className="relative w-full max-w-lg mx-auto">
            <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                placeholder="Introduza um ticker (ex: AAPL, MSFT, NVDA...)"
                className="w-full px-5 py-4 pr-12 text-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 dark:focus:border-blue-500 rounded-full shadow-lg outline-none transition-all"
            />
            <button
                type="submit"
                className="absolute top-1/2 right-3 -translate-y-1/2 p-2 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                aria-label="Pesquisar"
            >
                <IconSearch size={24} />
            </button>
        </form>
    );
};

export default SearchTicker;