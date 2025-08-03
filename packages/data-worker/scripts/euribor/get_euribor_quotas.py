# packages/data-worker/scripts/euribor/get_euribor_quotas.py
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

# IDs para as quotas (percentagem de novos créditos)
SERIES_IDS = {
    '3m': '12710773', # Quota Euribor 3M
    '6m': '12710774', # Quota Euribor 6M
    '1y': '12710776'  # Quota Euribor 12M (1 ano)
}

def fetch_and_save_quota(name: str, series_id: str) -> bool:
    """Busca os dados de uma única série de quotas e guarda no seu respetivo ficheiro CSV."""
    try:
        # Passo 1: Obter metadados
        meta_url = f"{API_BASE_URL}/series/?lang=PT&series_ids={series_id}"
        print(f"  [Quotas] Obtendo metadados para {name.upper()}...")
        meta_response = requests.get(meta_url, headers=HEADERS, timeout=60)
        meta_response.raise_for_status()
        series_info = meta_response.json()

        if not series_info:
            print(f"❌ Metadados não encontrados para a quota {name} (ID: {series_id}).")
            return False

        metadata = series_info[0]
        domain_id = metadata["domain_ids"][0]
        dataset_id = metadata["dataset_id"]

        # Passo 2: Obter os dados
        data_url = f"{API_BASE_URL}/domains/{domain_id}/datasets/{dataset_id}/?lang=PT&series_ids={series_id}"
        print(f"  [Quotas] Buscando dados para {name.upper()}...")
        dataset = pyjstat.Dataset.read(data_url, timeout=90)
        df = dataset.write(output='dataframe')
        
        # Preparar e guardar o ficheiro CSV individualmente
        output_dir = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'webapp', 'public', 'data')
        os.makedirs(output_dir, exist_ok=True)
        output_path = os.path.join(output_dir, f'euribor_{name}_share.csv')
        
        output_df = df[['Data', 'value']].rename(columns={'Data': 'date', 'value': 'share'})
        output_df['date'] = pd.to_datetime(output_df['date']).dt.strftime('%Y-%m-%d')
        output_df.sort_values('date', inplace=True)
        output_df.to_csv(output_path, index=False)
        
        print(f"  ✅ Ficheiro de quotas {name.upper()} guardado com {len(output_df)} linhas.")
        return True

    except Exception as e:
        print(f"❌ Falha ao buscar a série de quotas {name} (ID: {series_id}). Erro: {e}")
        return False

def main():
    """Busca os dados das quotas da Euribor e guarda em ficheiros CSV separados."""
    print("\n🚀 A iniciar a recolha de dados das Quotas Euribor (Método Otimizado)...")
    
    with ThreadPoolExecutor(max_workers=3) as executor:
        # Executa as tarefas em paralelo
        results = list(executor.map(lambda args: fetch_and_save_quota(*args), SERIES_IDS.items()))
    
    if all(results):
        print("✅ Processo de recolha de quotas concluído com sucesso.")
    else:
        print("⚠️ Algumas séries de quotas falharam.")
    
    return True

if __name__ == "__main__":
    main()
