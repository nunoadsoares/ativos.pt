// packages/webapp/scripts/export-housing-kpi.js

const sqlite = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Caminho para a base de dados SQLite (ajustado para o contexto do Docker e local)
const dbPath = path.resolve(__dirname, '../public/datahub.db');

// Abre a BD e vai buscar o KPI
const db = sqlite(dbPath);
const kpiRow = db.prepare("SELECT * FROM key_indicators WHERE indicator_key = 'precos_habitacao_var'").get() || {};

// Caminho para guardar o ficheiro JSON de output
const outputPath = path.resolve(__dirname, '../public/data-housing-kpi.json');

// Escreve o JSON
fs.writeFileSync(outputPath, JSON.stringify(kpiRow, null, 2), 'utf8');
console.log('✔ Exported KPI row to', outputPath);
