// C:\Users\nunos\Desktop\ativos.pt\packages\webapp\src/lib/db.ts

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveDbPath() {
  const projectRoot = path.resolve(__dirname, '..', '..', '..', '..');
  const dbPath = path.join(projectRoot, 'packages', 'webapp', 'public', 'datahub.db');

  if (!fs.existsSync(dbPath)) {
    const errorMsg = `[DB] ERRO CRÍTICO: Base de dados não encontrada em: ${dbPath}. Execute os scripts do data-worker para a criar.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
  
  return dbPath;
}

const dbPath = resolveDbPath();

// --- A CORREÇÃO FINAL E DEFINITIVA ---
// Verifica se estamos em ambiente de desenvolvimento.
// Se sim, permite escrita (para a cache funcionar).
// Se não (em produção), bloqueia a escrita por segurança.
const isDevelopment = process.env.NODE_ENV === 'development';

export const db = new Database(dbPath, {
  // A propriedade 'readonly' é definida dinamicamente
  readonly: !isDevelopment,
  fileMustExist: true,
});

console.log(`[DB] Ligação estabelecida com sucesso em: ${dbPath} (modo: ${isDevelopment ? 'read-write' : 'readonly'})`);


process.on('exit', () => {
    if (db && db.open) {
        db.close();
        console.log('[DB] Ligação à base de dados fechada.');
    }
});


// --- O RESTO DO FICHEIRO PERMANECE IGUAL PARA COMPATIBILIDADE ---

export interface HistoricalData {
  date: string;
  value: number;
}

export interface KeyIndicatorData {
  indicator_key: string;
  label: string | null;
  value: number;
  unit: string | null;
  reference_date: string | null;
  updated_at: string | null;
}

export interface QueryOptions {
  since?: string;
  limit?: number;
}

export function getSeries(seriesKey: string, options: QueryOptions = {}): HistoricalData[] {
  let query = `
    SELECT date, value
    FROM historical_series
    WHERE series_key = ?
  `;
  const params: (string | number)[] = [seriesKey];

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

export function getIndicator(indicatorKey: string): KeyIndicatorData | null {
  const row = db
    .prepare(
      'SELECT indicator_key, label, value, unit, reference_date, updated_at FROM key_indicators WHERE indicator_key = ?'
    )
    .get(indicatorKey) as KeyIndicatorData | undefined;
  return row ?? null;
}