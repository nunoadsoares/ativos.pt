// C:\Users\nunos\Desktop\ativos.pt\packages\webapp\src\lib\db.ts

import Database from 'better-sqlite3';
import path from 'path';

// *** CORREÇÃO AQUI ***
// O caminho agora aponta para 'datahub.db', como no resto do teu projeto.
const dbPath = path.join(process.cwd(), 'public', 'datahub.db');

// O resto do ficheiro permanece igual.
const db = new Database(dbPath, { readonly: true, fileMustExist: true });

console.log(`[DB] Conectado em modo 'readonly' a: ${dbPath}`);

// Tipos para os nossos dados, para garantir consistência
interface HistoricalData {
  date: string;
  value: number;
}

interface KeyIndicatorData {
    indicator_key: string;
    label: string;
    value: number;
    unit: string;
    reference_date: string;
    updated_at: string;
}

interface QueryOptions {
  since?: string;
  limit?: number;
}

/**
 * Busca uma série histórica completa.
 * @param key A 'series_key' da série a buscar.
 * @param options Opções para filtrar os dados (since, limit).
 * @returns Um array de objectos { date, value }.
 */
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

/**
 * Busca um único indicador chave.
 * @param key A 'indicator_key' do indicador a buscar.
 * @returns O objecto completo do indicador.
 */
export function getIndicator(key: string): KeyIndicatorData | null {
  const query = 'SELECT * FROM key_indicators WHERE indicator_key = ?';
  return db.prepare(query).get(key) as KeyIndicatorData | null;
}