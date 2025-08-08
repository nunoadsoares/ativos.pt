// packages/webapp/src/lib/db.ts

import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'public', 'datahub.db');

// A "db" é exportada e tem permissões de escrita
export const db = new Database(dbPath);

console.log(`[DB] Conectado com sucesso a: ${dbPath}`);

// Manter as suas interfaces originais e detalhadas
interface HistoricalData {
  date: string;
  value: number;
}

interface KeyIndicatorData {
    indicator_key: string;
    label: string;
    value: number; // Mantendo os seus tipos originais
    unit: string;
    reference_date: string;
    updated_at: string;
}

interface QueryOptions {
  since?: string;
  limit?: number;
}

// A sua função getSeries original e intacta
export function getSeries(key: string, options: QueryOptions = {}): HistoricalData[] {
  let query = `
    SELECT date, value FROM historical_series
    WHERE series_key = ?
  `;
  const params: (string | number)[] = [key];

  if (options.since) {
    query += ' AND date >= ?';
    params.push(options.since);
  }

  query += ' ORDER BY date ASC';

  if (options.limit && options.limit > 0) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }

  return db.prepare(query).all(...params) as HistoricalData[];
}

// A sua função getIndicator original e intacta
export function getIndicator(key: string): KeyIndicatorData | null {
  const query = 'SELECT * FROM key_indicators WHERE indicator_key = ?';
  return db.prepare(query).get(key) as KeyIndicatorData | null;
}