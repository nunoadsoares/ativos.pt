// packages/webapp/src/data/db.ts

import Database from 'better-sqlite3';
import path from 'node:path';

// Define o tipo de dados que esperamos da nossa tabela
export interface Indicator {
  indicator_key: string;
  label: string;
  value: number;
  unit: string;
  reference_date: string;
  updated_at: string;
}

// Constrói o caminho para a base de dados que está na pasta `public`
// Usamos `process.cwd()` para obter a raiz do projeto atual.
const dbPath = path.join(process.cwd(), 'public', 'datahub.db');

const db = new Database(dbPath, { readonly: true });

/**
 * Vai à base de dados buscar a lista mais recente de todos os indicadores.
 */
export function getLatestIndicators(): Indicator[] {
  const stmt = db.prepare('SELECT * FROM key_indicators');
  const data = stmt.all() as Indicator[];
  return data;
}