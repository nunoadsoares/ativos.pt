# packages/data-worker/scripts/risco_incumprimento/update_default_risk_map_data.py
import pandas as pd
from pyjstat import pyjstat
import os
import sqlite3
import datetime as dt
import math

# --- Configuração ---
DB_PATH = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'webapp', 'public', 'datahub.db')
DOMAIN_ID = 188
DATASET_ID = "961306c1ed49daf795a53dc5fea4a04b"
BPSTAT_API_URL = "https://bpstat.bportugal.pt/data/v1"

# Colunas e Filtros
COL_FINALIDADE = 'Finalidade'
COL_SECTOR = 'Setor institucional de contraparte'
COL_REGIAO = 'Território de contraparte'
COL_METRICA = 'Métrica'

def fetch_full_dataset() -> pd.DataFrame:
    """Busca o dataset completo da API."""
    url = f"{BPSTAT_API_URL}/domains/{DOMAIN_ID}/datasets/{DATASET_ID}/?lang=PT"
    print(f"-> A buscar dataset de Risco Regional da API...")
    dataset = pyjstat.Dataset.read(url, timeout=90)
    df = dataset.write('dataframe')
    print("   ✅ Dataset da API carregado.")
    return df

def main():
    """Extrai os dados de risco por região e guarda como indicadores individuais na base de dados."""
    try:
        df = fetch_full_dataset()
        if df.empty: raise ValueError("DataFrame vazio.")
        
        hab_df = df[
            (df[COL_FINALIDADE].str.contains("Habitação", na=False, regex=False)) &
            (df[COL_SECTOR].str.contains("Famílias", na=False, regex=False)) &
            (df[COL_METRICA].str.contains("% de devedores", na=False, regex=False))
        ].copy()

        if hab_df.empty:
            raise ValueError("Nenhum dado de Habitação encontrado após os filtros.")
            
        print(f"   ✅ Encontrados {len(hab_df)} registos de Habitação.")

        latest_df = hab_df.loc[hab_df.groupby(COL_REGIAO)['Data'].idxmax()]
        
        conn = sqlite3.connect(DB_PATH, isolation_level=None)
        cursor = conn.cursor()
        cursor.execute("PRAGMA journal_mode = WAL;")

        indicators_saved = 0
        for _, row in latest_df.iterrows():
            region_name = row[COL_REGIAO]
            value = row['value']
            
            if pd.isna(value) or not math.isfinite(value):
                continue

            # Gera uma chave limpa para a base de dados (ex: 'norte_nuts_ii')
            clean_region_key = region_name.lower().replace(' ', '_').replace('(', '').replace(')', '')
            
            indicator_key = f"risk_incumprimento_bportugal_{clean_region_key}"
            label = f"Risco Incumprimento: {region_name}"
            unit = '%'
            reference_date = pd.to_datetime(row['Data']).strftime('%Y-%m-%d')
            updated_at = dt.datetime.utcnow().isoformat()

            cursor.execute("INSERT OR REPLACE INTO key_indicators (indicator_key, label, value, unit, reference_date, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                           (indicator_key, label, round(value, 2), unit, reference_date, updated_at))
            print(f"   [SQLite] ✅ Indicador '{indicator_key}' guardado.")
            indicators_saved += 1
        
        if conn:
            conn.close()

        print(f"\n✅ Mapa de Risco final gravado com {indicators_saved} indicadores na base de dados.")

    except Exception as e:
        print(f"❌ Erro fatal no script do mapa de risco: {e}")

if __name__ == "__main__":
    main()