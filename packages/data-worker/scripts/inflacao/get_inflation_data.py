import requests
import os
import json
import logging
from datetime import datetime
import pandas as pd
from pyjstat import pyjstat

# Configuração básica de logging para vermos o que se passa
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- CONFIGURAÇÃO ---
API_BASE_URL = "https://bpstat.bportugal.pt/data/v1"
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}
OUTPUT_PATH = os.path.join(
    os.path.dirname(__file__), 
    '..', '..', '..', 'webapp', 'public', 'data'
)
OUTPUT_FILENAME = "inflation_summary.json"

SERIES_IDS_TO_FETCH = {
    'headline_yoy': '5721524',
    'headline_12m_avg': '5721550',
    'core_yoy': '5721583',
    'category_yoy_food_drinks': '5721525',
    'category_yoy_alcoholic_tobacco': '5721526',
    'category_yoy_clothing_footwear': '5721527',
    'category_yoy_housing_utilities': '5721528',
    'category_yoy_furnishings': '5721529',
    'category_yoy_health': '5721530',
    'category_yoy_transport': '5721531',
    'category_yoy_communications': '5721532',
    'category_yoy_recreation_culture': '5721533',
    'category_yoy_education': '5721534',
    'category_yoy_restaurants_hotels': '5721535',
    'category_yoy_misc_goods_services': '5721536',
}

def fetch_and_process_series(key: str, series_id: str):
    """
    Busca e processa uma única série de inflação, retornando uma lista de observações
    e o valor mais recente. Usa a biblioteca pyjstat para robustez.
    """
    try:
        # PASSO 1: Obter metadados
        meta_url = f"{API_BASE_URL}/series/?lang=PT&series_ids={series_id}"
        meta_response = requests.get(meta_url, headers=HEADERS, timeout=10)
        meta_response.raise_for_status()
        series_info = meta_response.json()

        if not series_info:
            logging.error(f"Metadados não encontrados para a série {key} (ID: {series_id}).")
            return None, None

        metadata = series_info[0]
        domain_id = metadata["domain_ids"][0]
        dataset_id = metadata["dataset_id"]

        # PASSO 2: Obter os dados
        data_url = f"{API_BASE_URL}/domains/{domain_id}/datasets/{dataset_id}/?lang=PT&series_ids={series_id}"
        dataset = pyjstat.Dataset.read(data_url, timeout=30)
        df = dataset.write(output='dataframe')
        
        if df.empty:
            logging.warning(f"DataFrame vazio para a série {key} (ID: {series_id}).")
            return None, None

        # Processamento com Pandas
        df.rename(columns={'Data': 'date', 'value': 'value'}, inplace=True)
        df['date'] = pd.to_datetime(df['date'])
        df.sort_values(by='date', inplace=True)

        processed_series = []
        for _, row in df.iterrows():
            timestamp = int(row['date'].timestamp()) * 1000
            processed_series.append([timestamp, row['value']])

        latest_value = df['value'].iloc[-1]
        
        return processed_series, latest_value

    except Exception as e:
        logging.error(f"Falha ao buscar a série {key} (ID: {series_id}). Erro: {e}")
        return None, None

def main():
    logging.info("🚀 A iniciar o scraper do Observatório da Inflação (versão definitiva)...")

    all_inflation_data = {
        'metadata': { 'last_updated_utc': datetime.utcnow().isoformat() },
        'headline': {},
        'historical': { 'yoy': [], 'avg12m': [], 'core_yoy': [] },
        'breakdown_yoy': {},
        'historical_by_category': {} # A chave que precisamos
    }

    for key, series_id in SERIES_IDS_TO_FETCH.items():
        logging.info(f"A processar série: {key} ({series_id})")
        
        processed_series, latest_value = fetch_and_process_series(key, series_id)

        if processed_series is None:
            continue
        
        if key.startswith('headline_'):
            metric = key.replace('headline_', '')
            latest_date_ms = processed_series[-1][0]
            all_inflation_data['headline'][metric] = {
                'value': float(latest_value),
                'date': datetime.fromtimestamp(latest_date_ms / 1000).strftime('%Y-%m')
            }
            if metric == 'yoy':
                all_inflation_data['historical']['yoy'] = processed_series
            elif metric == '12m_avg':
                all_inflation_data['historical']['avg12m'] = processed_series
        
        elif key.startswith('category_yoy_'):
            category_name = key.replace('category_yoy_', '')
            all_inflation_data['breakdown_yoy'][category_name] = float(latest_value)
            
            # ESTA É A LINHA CRUCIAL QUE GUARDA O HISTÓRICO PARA CADA SETOR
            all_inflation_data['historical_by_category'][category_name] = processed_series
        
        elif key == 'core_yoy':
            all_inflation_data['historical']['core_yoy'] = processed_series

    os.makedirs(OUTPUT_PATH, exist_ok=True)
    output_filepath = os.path.join(OUTPUT_PATH, OUTPUT_FILENAME)

    try:
        with open(output_filepath, 'w', encoding='utf-8') as f:
            json.dump(all_inflation_data, f, ensure_ascii=False, indent=4)
        logging.info(f"✅ Sucesso! Dados da inflação guardados em: {output_filepath}")
    except IOError as e:
        logging.error(f"❌ Falha ao escrever o ficheiro de dados: {e}")

if __name__ == "__main__":
    main()