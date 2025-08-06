# packages/data-worker/scripts/euribor/get_euribor_quotas.py
import pandas as pd
import requests
from pyjstat import pyjstat
import os
import sqlite3
import datetime as dt
from concurrent.futures import ThreadPoolExecutor

# --- Configuração da Base de Dados ---
DB_PATH = os.path.join(
    os.path.dirname(__file__), '..', '..', '..', 'webapp', 'public', 'datahub.db'
)

# --- Configuração da API BPstat ---
API_BASE_URL = "https://bpstat.bportugal.pt/data/v1"
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

# IDs para as quotas (percentagem de novos créditos)
SERIES_IDS = {
    '3m': '12710773', # Quota Euribor 3M
    '6m': '12710774', # Quota Euribor 6M
    '12m': '12710776' # Quota Euribor 12M (renomeado de 1y para consistência)
}

SERIES_LABELS = {
    '3m': 'Quota de Contratos com Euribor a 3M',
    '6m': 'Quota de Contratos com Euribor a 6M',
    '12m': 'Quota de Contratos com Euribor a 12M'
}

def fetch_single_series(name: str, series_id: str) -> pd.DataFrame | None:
    """Busca os dados de uma única série."""
    try:
        meta_url = f"{API_BASE_URL}/series/?lang=PT&series_ids={series_id}"
        print(f"  [Quotas] Obtendo metadados para {name.upper()}...")
        meta_response = requests.get(meta_url, headers=HEADERS, timeout=60)
        meta_response.raise_for_status()
        series_info = meta_response.json()

        if not series_info:
            print(f"❌ Metadados não encontrados para a quota {name} (ID: {series_id}).")
            return None

        metadata = series_info[0]
        domain_id = metadata["domain_ids"][0]
        dataset_id = metadata["dataset_id"]

        data_url = f"{API_BASE_URL}/domains/{domain_id}/datasets/{dataset_id}/?lang=PT&series_ids={series_id}"
        print(f"  [Quotas] Buscando dados para {name.upper()}...")
        dataset = pyjstat.Dataset.read(data_url, timeout=90)
        df = dataset.write(output='dataframe')
        
        df.rename(columns={'value': name}, inplace=True)
        df.set_index('Data', inplace=True)
        return df[[name]]

    except Exception as e:
        print(f"❌ Falha ao buscar a série de quotas {name} (ID: {series_id}). Erro: {e}")
        return None

def save_to_database(conn, df_final):
    """Guarda os dados processados nas tabelas da base de dados."""
    print("\n💾 A guardar dados das quotas na base de dados...")
    cur = conn.cursor()
    
    # --- Guardar Séries Históricas ---
    df_melted = df_final.melt(id_vars=['date'], var_name='period', value_name='value')
    total_rows_inserted = 0
    
    for period in df_final.columns.drop('date'):
        series_key = f"euribor_quota_bportugal_{period}_monthly"
        df_series = df_melted[df_melted['period'] == period]
        
        rows_to_insert = [
            (series_key, row['date'], row['value'])
            for _, row in df_series.iterrows() if pd.notna(row['value'])
        ]
        
        cur.executemany("INSERT OR REPLACE INTO historical_series (series_key, date, value) VALUES (?, ?, ?)", rows_to_insert)
        print(f"  [DEBUG] Inseridas/Atualizadas {len(rows_to_insert)} linhas para a série '{series_key}'.")
        total_rows_inserted += len(rows_to_insert)
    
    print(f"✅ {total_rows_inserted} registos históricos de quotas guardados com sucesso.")

    # --- Guardar Indicadores Chave (últimos valores) ---
    print("\n🔑 A atualizar os indicadores chave de quotas...")
    latest_data = df_final.iloc[-1]
    reference_date = latest_data['date']
    updated_at = dt.datetime.utcnow().isoformat()
    rows_updated = 0
    
    for period, value in latest_data.drop('date').items():
        if pd.isna(value):
            continue
        
        key = f"latest_euribor_quota_{period}"
        label = SERIES_LABELS.get(period, period)
        unit = '%'
        
        cur.execute("INSERT OR REPLACE INTO key_indicators (indicator_key, label, value, unit, reference_date, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                    (key, label, value, unit, reference_date, updated_at))
        print(f"  [DEBUG] Indicador '{key}' atualizado para o valor {value}.")
        rows_updated += 1
        
    print(f"✅ {rows_updated} indicadores chave de quotas atualizados com sucesso.")

def main():
    """Busca os dados das quotas da Euribor e guarda na base de dados."""
    print("\n🚀 A iniciar a recolha de dados das Quotas Euribor...")
    
    all_series_dfs = []
    with ThreadPoolExecutor(max_workers=len(SERIES_IDS)) as executor:
        results = executor.map(fetch_single_series, SERIES_IDS.keys(), SERIES_IDS.values())
        for df_result in results:
            if df_result is not None:
                all_series_dfs.append(df_result)

    if not all_series_dfs:
        print("❌ Nenhuma série de quotas foi obtida com sucesso. A abortar.")
        return False
        
    df_combined = pd.concat(all_series_dfs, axis=1)
    df_combined.sort_index(inplace=True)
    df_combined.ffill(inplace=True)
    df_combined = df_combined.round(2)
    
    df_combined.reset_index(inplace=True)
    df_combined.rename(columns={'Data': 'date'}, inplace=True)
    df_combined['date'] = pd.to_datetime(df_combined['date']).dt.strftime('%Y-%m-%d')
    
    print("\n✅ Todas as séries de quotas foram combinadas e processadas.")

    try:
        conn = sqlite3.connect(DB_PATH, isolation_level=None)
        cur = conn.cursor()
        cur.execute("PRAGMA journal_mode = WAL;")
        save_to_database(conn, df_combined)
    except sqlite3.Error as e:
        print(f"❌ Erro na base de dados: {e}")
        return False
    finally:
        if 'conn' in locals() and conn:
            conn.close()
    
    print("\n🎉 Processo de quotas concluído com sucesso!")
    return True

if __name__ == "__main__":
    main()