# packages/data-worker/scripts/preco_casas/update_housing_price_index_series.py
import pandas as pd
from pyjstat import pyjstat
import os
import sqlite3
import datetime as dt
from concurrent.futures import ThreadPoolExecutor
import requests # <-- LINHA CORRIGIDA ADICIONADA AQUI

# --- Configuração ---
DB_PATH = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'webapp', 'public', 'datahub.db')
BPSTAT_API_URL = "https://bpstat.bportugal.pt/data/v1"
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

# IDs de série específicos para cada indicador
SERIES_IDS = {
    "total":    '12559645', # Índice de Preços da Habitação, Total
    "new":      '12559646', # Índice de Preços da Habitação, Alojamentos Novos
    "existing": '12559647', # Índice de Preços da Habitação, Alojamentos Existentes
}

SERIES_LABELS = {
    "total": "Índice de Preços da Habitação (Total)",
    "new": "Índice de Preços (Aloj. Novos)",
    "existing": "Índice de Preços (Aloj. Existentes)",
}

def fetch_single_series(name: str, series_id: str) -> pd.DataFrame | None:
    """Busca os dados de uma única série pelo seu ID."""
    try:
        meta_url = f"{BPSTAT_API_URL}/series/?lang=PT&series_ids={series_id}"
        print(f"  -> Obtendo metadados para {name.upper()}...")
        meta_response = requests.get(meta_url, headers=HEADERS, timeout=60)
        meta_response.raise_for_status()
        series_info = meta_response.json()

        if not series_info:
            print(f"     ❌ Metadados não encontrados para a série {name} (ID: {series_id}).")
            return None

        metadata = series_info[0]
        domain_id = metadata["domain_ids"][0]
        dataset_id = metadata["dataset_id"]

        data_url = f"{BPSTAT_API_URL}/domains/{domain_id}/datasets/{dataset_id}/?lang=PT&series_ids={series_id}"
        print(f"  -> Buscando dados para {name.upper()}...")
        dataset = pyjstat.Dataset.read(data_url, timeout=90)
        df = dataset.write('dataframe')
        
        df.rename(columns={'value': name}, inplace=True)
        df.set_index('Data', inplace=True)
        return df[[name]]

    except Exception as e:
        print(f"     ❌ Falha ao buscar a série {name} (ID: {series_id}). Erro: {e}")
        return None

def save_to_database(conn, series_key: str, label: str, df: pd.DataFrame):
    """Guarda uma série histórica e o seu indicador mais recente na base de dados."""
    cur = conn.cursor()
    
    rows_to_insert = [
        (series_key, row['date'], row['value'])
        for _, row in df.iterrows() if pd.notna(row['value'])
    ]
    cur.executemany("INSERT OR REPLACE INTO historical_series (series_key, date, value) VALUES (?, ?, ?)", rows_to_insert)
    print(f"     [DB-Hist] Inseridas/Atualizadas {len(rows_to_insert)} linhas para '{series_key}'.")

    latest_row = df.iloc[-1]
    indicator_key = f"latest_{series_key}"
    unit = "Índice (Base 100)"
    
    cur.execute("INSERT OR REPLACE INTO key_indicators (indicator_key, label, value, unit, reference_date, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                (indicator_key, label, latest_row['value'], unit, latest_row['date'], dt.datetime.utcnow().isoformat()))
    print(f"     [DB-KPI] Indicador '{indicator_key}' atualizado para {latest_row['value']}.")

def main():
    """Função principal para extrair e guardar os dados na base de dados."""
    print("-> A iniciar a recolha dos Índices de Preços de Habitação...")
    
    all_series_dfs = []
    with ThreadPoolExecutor(max_workers=len(SERIES_IDS)) as executor:
        results = executor.map(fetch_single_series, SERIES_IDS.keys(), SERIES_IDS.values())
        for df_result in results:
            if df_result is not None:
                all_series_dfs.append(df_result)

    if not all_series_dfs:
        print("❌ Nenhuma série de preços de habitação foi obtida com sucesso. A abortar.")
        return

    df_combined = pd.concat(all_series_dfs, axis=1)
    df_combined.sort_index(inplace=True)
    df_combined.ffill(inplace=True)
    
    df_combined.reset_index(inplace=True)
    df_combined.rename(columns={'Data': 'date'}, inplace=True)
    df_combined['date'] = pd.to_datetime(df_combined['date']).dt.strftime('%Y-%m-%d')
    
    try:
        conn = sqlite3.connect(DB_PATH, isolation_level=None)
        cur = conn.cursor()
        cur.execute("PRAGMA journal_mode = WAL;")

        for series_code, label in SERIES_LABELS.items():
            if series_code in df_combined.columns:
                series_df = df_combined[['date', series_code]].rename(columns={series_code: 'value'}).dropna()
                series_key = f"house_price_index_bportugal_{series_code}_quarterly"
                print(f"   -> A guardar dados para: {series_code}")
                save_to_database(conn, series_key, label, series_df)
        
        print("\n🎉 Processo do índice de preços de habitação concluído com sucesso!")
        
    except Exception as e:
        print(f"❌ Erro fatal no script de séries de habitação: {e}")
    finally:
        if 'conn' in locals() and conn:
            conn.close()

if __name__ == "__main__":
    main()
