# packages/data-worker/scripts/euribor/get_euribor_rates.py

import pandas as pd
import requests
from pyjstat import pyjstat
import os
from concurrent.futures import ThreadPoolExecutor

# --- Configuração Baseada na Documentação Oficial ---
API_BASE_URL = "https://bpstat.bportugal.pt/data/v1"
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

# Os IDs específicos para cada série temporal da Euribor que queremos
SERIES_IDS = {
    '3_meses': '13168436',
    '6_meses': '13168437',
    '12_meses': '13168438'
}

def fetch_single_series(tenor: str, series_id: str) -> pd.DataFrame | None:
    """
    Busca os dados de uma única série seguindo o fluxo de 2 passos da documentação oficial.
    Passo 1: Obter metadados (domain_id, dataset_id) a partir do series_id.
    Passo 2: Obter os dados (observações) usando todos os IDs.
    """
    try:
        # --- PASSO 1: Obter metadados da série ---
        meta_url = f"{API_BASE_URL}/series/?lang=PT&series_ids={series_id}"
        print(f"  [Passo 1: Metadados {tenor}] URL: {meta_url}")
        meta_response = requests.get(meta_url, headers=HEADERS, timeout=60)
        meta_response.raise_for_status()
        series_info = meta_response.json()

        if not series_info:
            print(f"❌ Metadados não encontrados para a série {tenor} (ID: {series_id}).")
            return None

        # Extrair o domain_id e dataset_id corretos da resposta
        metadata = series_info[0]
        domain_id = metadata["domain_ids"][0]
        dataset_id = metadata["dataset_id"]
        print(f"  [Info {tenor}] Domain ID: {domain_id}, Dataset ID: {dataset_id}")

        # --- PASSO 2: Obter os dados da série ---
        data_url = f"{API_BASE_URL}/domains/{domain_id}/datasets/{dataset_id}/?lang=PT&series_ids={series_id}"
        print(f"  [Passo 2: Dados {tenor}] URL: {data_url}")
        
        dataset = pyjstat.Dataset.read(data_url, timeout=90)
        df = dataset.write(output='dataframe')
        
        # O DataFrame vem com uma única coluna de valores. Vamos dar-lhe o nome certo.
        df.rename(columns={'value': tenor}, inplace=True)
        # O índice já é a data (coluna 'Data'), o que é perfeito.
        df.set_index('Data', inplace=True)
        return df[[tenor]]

    except Exception as e:
        print(f"❌ Falha ao buscar a série {tenor} (ID: {series_id}). Erro: {e}")
        return None

def main():
    """
    Busca os dados MENSAIS das taxas Euribor (3M, 6M, 12M) usando o método
    oficial da API, combina-os e guarda num único ficheiro JSON.
    """
    print("🚀 A iniciar a recolha das taxas mensais da Euribor (Método Oficial da Documentação)...")
    
    all_series_dfs = []

    # Usar ThreadPoolExecutor para fazer as chamadas em paralelo
    with ThreadPoolExecutor(max_workers=3) as executor:
        future_to_series = {executor.submit(fetch_single_series, tenor, s_id): tenor for tenor, s_id in SERIES_IDS.items()}
        for future in future_to_series:
            df_series = future.result()
            if df_series is not None:
                all_series_dfs.append(df_series)

    if len(all_series_dfs) != len(SERIES_IDS):
        print("❌ Nem todas as séries foram obtidas com sucesso. A abortar para não gerar dados incompletos.")
        return False
        
    # Combinar os DataFrames de cada série num só
    df_combined = pd.concat(all_series_dfs, axis=1)
    
    # Processamento e Formatação
    df_combined.sort_index(inplace=True)
    df_combined.dropna(how='all', inplace=True)
    df_combined = df_combined.round(3)
    df_combined.ffill(inplace=True) 
    
    df_combined.reset_index(inplace=True)
    df_combined.rename(columns={'Data': 'date'}, inplace=True)
    df_combined['date'] = pd.to_datetime(df_combined['date']).dt.strftime('%Y-%m-%d')
    
    print("\n✅ Todas as séries foram combinadas e processadas com sucesso.")

    # Guardar os dados no local correto
    output_dir = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'webapp', 'public', 'data')
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, 'euribor_rates_monthly.json')
    
    df_combined.to_json(output_path, orient='records', indent=2, force_ascii=False)

    print(f"✅ Dados das taxas Euribor guardados com sucesso em: {output_path}")
    return True

if __name__ == "__main__":
    main()