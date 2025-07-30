// src/database.ts
import Database from 'better-sqlite3';

const db = new Database('datahub.db');

// Tabela mais robusta para guardar vários tipos de indicadores
const createTableStmt = db.prepare(`
  CREATE TABLE IF NOT EXISTS key_indicators (
    indicator_key   TEXT PRIMARY KEY, -- ex: "inflacao_ipc", "euribor_12m"
    label           TEXT NOT NULL,
    value           REAL NOT NULL,
    unit            TEXT,
    reference_date  TEXT NOT NULL,    -- Data a que o valor se refere
    updated_at      TEXT NOT NULL     -- Quando o nosso worker correu
  )
`);
createTableStmt.run();

console.log("Base de dados 'datahub.db' e tabela 'key_indicators' prontas.");