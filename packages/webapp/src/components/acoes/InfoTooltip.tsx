// C:\Users\nunos\Desktop\ativos.pt\packages\webapp\src\components\acoes\InfoTooltip.tsx
import React from 'react';
import Tippy from '@tippyjs/react';
import { IconAlertCircle } from '@tabler/icons-react';

// Importar o CSS base do Tippy. É essencial para o posicionamento.
import 'tippy.js/dist/tippy.css';

// Linha de compatibilidade para garantir que a importação funciona sempre.
const TippyComponent = (Tippy as any).default ?? Tippy;

const InfoTooltip: React.FC<{ content: string }> = ({ content }) => {
    return (
        <TippyComponent
            // CORREÇÃO: Passamos o conteúdo como uma string simples.
            content={content}
            
            // CORREÇÃO: Aplicamos o nosso estilo diretamente ao tooltip com a prop `className`.
            // Isto substitui o estilo default do Tippy pelo nosso, eliminando a "caixa dupla".
            className="px-3 py-1.5 bg-gray-900 dark:bg-gray-50 text-white dark:text-gray-900 rounded-lg text-xs font-semibold shadow-xl"
            
            animation="shift-away"
            placement="top"
            arrow={false}
            duration={[100, 100]}
            delay={[0, 50]}
        >
            <span className="cursor-help inline-flex items-center justify-center">
                <IconAlertCircle size={16} className="text-gray-400 dark:text-gray-500" />
            </span>
        </TippyComponent>
    );
};

export default InfoTooltip;