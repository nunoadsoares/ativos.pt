# packages/data-worker/scripts/inflacao/get_inflation_data.py
import requests
import os
import sqlite3
import datetime as dt
import pandas as pd
from pyjstat import pyjstat
import logging

# Configuração
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
DB_PATH = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'webapp', 'public', 'datahub.db')
API_BASE_URL = "https://bpstat.bportugal.pt/data/v1"
HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}

SERIES_IDS_TO_FETCH = {
    'headline_yoy': '5721524', 'headline_12m_avg': '5721550', 'core_yoy': '5721583',
    'category_yoy_food_drinks': '5721525', 'category_yoy_alcoholic_tobacco': '5721526',
    'category_yoy_clothing_footwear': '5721527', 'category_yoy_housing_utilities': '5721528',
    'category_yoy_furnishings': '5721529', 'category_yoy_health': '5721530',
    'category_yoy_transport': '5721531', 'category_yoy_communications': '5721532',
    'category_yoy_recreation_culture': '5721533', 'category_yoy_education': '5721534',
    'category_yoy_restaurants_hotels': '5721535', 'category_yoy_misc_goods_services': '5721536',
}

def fetch_series_to_dataframe(key: str, series_id: str) -> pd.DataFrame | None:
    """Busca uma única série e retorna-a como um DataFrame do Pandas."""
    try:
        meta_url = f"{API_BASE_URL}/series/?lang=PT&series_ids={series_id}"
        meta_response = requests.get(meta_url, headers=HEADERS, timeout=10)
        meta_response.raise_for_status()
        series_info = meta_response.json()

        if not series_info:
            logging.error(f"Metadados não encontrados para a série {key} (ID: {series_id}).")
            return None

        metadata = series_info[0]
        domain_id, dataset_id = metadata["domain_ids"][0], metadata["dataset_id"]
        data_url = f"{API_BASE_URL}/domains/{domain_id}/datasets/{dataset_id}/?lang=PT&series_ids={series_id}"
        dataset = pyjstat.Dataset.read(data_url, timeout=30)
        df = dataset.write(output='dataframe')
        
        if df.empty:
            logging.warning(f"DataFrame vazio para a série {key} (ID: {series_id}).")
            return None

        df.rename(columns={'Data': 'date', 'value': 'value'}, inplace=True)
        df['date'] = pd.to_datetime(df['date']).dt.strftime('%Y-%m-%d')
        df.sort_values(by='date', inplace=True)
        return df

    except Exception as e:
        logging.error(f"Falha ao buscar a série {key} (ID: {series_id}). Erro: {e}")
        return None

def save_to_database(conn, series_key: str, label: str, unit: str, df: pd.DataFrame):
    """Guarda uma série histórica e o seu indicador mais recente na base de dados."""
    cur = conn.cursor()
    
    # --- Guardar Série Histórica ---
    rows_to_insert = [
        (series_key, row['date'], row['value'])
        for _, row in df.iterrows() if pd.notna(row['value'])
    ]
    cur.executemany("INSERT OR REPLACE INTO historical_series (series_key, date, value) VALUES (?, ?, ?)", rows_to_insert)
    logging.info(f"  [DB-Hist] Inseridas/Atualizadas {len(rows_to_insert)} linhas para '{series_key}'.")

    # --- Guardar Indicador Chave ---
    latest_row = df.iloc[-1]
    indicator_key = f"latest_{series_key}"
    
    cur.execute("INSERT OR REPLACE INTO key_indicators (indicator_key, label, value, unit, reference_date, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                (indicator_key, label, latest_row['value'], unit, latest_row['date'], dt.datetime.utcnow().isoformat()))
    logging.info(f"  [DB-KPI] Indicador '{indicator_key}' atualizado para {latest_row['value']}.")

def main():
    logging.info("🚀 A iniciar o scraper de dados da Inflação...")
    
    try:
        conn = sqlite3.connect(DB_PATH, isolation_level=None)
        cur = conn.cursor()
        cur.execute("PRAGMA journal_mode = WAL;")

        for key, series_id in SERIES_IDS_TO_FETCH.items():
            logging.info(f"A processar série: {key} ({series_id})")
            df = fetch_series_to_dataframe(key, series_id)
            
            if df is not None:
                # Constrói a chave da série e a etiqueta para a base de dados
                series_key = f"inflation_bportugal_{key}_monthly"
                label = key.replace('_', ' ').title()
                unit = '%'
                
                save_to_database(conn, series_key, label, unit, df)

    except sqlite3.Error as e:
        logging.error(f"❌ Erro na base de dados: {e}")
    finally:
        if 'conn' in locals() and conn:
            conn.close()
        logging.info("🎉 Processo de inflação concluído.")

if __name__ == "__main__":
    main()