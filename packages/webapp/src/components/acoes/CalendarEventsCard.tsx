// C:\Users\nunos\Desktop\ativos.pt\packages\webapp\src\components\acoes\CalendarEventsCard.tsx
import React from 'react';
import type { CalendarEvent } from '~/lib/stock-data-fetcher';
import { IconCalendarEvent, IconCalendarOff } from '@tabler/icons-react';

const CalendarEventsCard: React.FC<{ events: CalendarEvent }> = ({ events }) => {
  const earningsDate = events?.earningsDate;

  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800">
      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Próximos Eventos</h3>
      {earningsDate ? (
        <div className="flex items-center gap-4">
          <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded-lg">
            <IconCalendarEvent size={24} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-800 dark:text-gray-200">Apresentação de Resultados</p>
            <p className="text-gray-600 dark:text-gray-400 font-mono">
              {new Intl.DateTimeFormat('pt-PT', { dateStyle: 'long' }).format(earningsDate)}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400">
            <IconCalendarOff size={24} />
            <p className="text-sm">Nenhum evento agendado encontrado.</p>
        </div>
      )}
    </div>
  );
};

export default CalendarEventsCard;