# packages/data-worker/scripts/credito_habitacao/get_condicoes_credito.py

import pandas as pd
import requests
from pyjstat import pyjstat
import os
from concurrent.futures import ThreadPoolExecutor

# --- Configuração Baseada na Tua Descoberta ---
API_BASE_URL = "https://bpstat.bportugal.pt/data/v1"
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

# IDs exatos encontrados no código fonte do site BPstat
SERIES_IDS = {
    'tan_variavel': '12710779',
    'tan_fixa': '12710780',
    'tan_mista': '12904069',
    'prestacao_mediana': '12710744'
}

def fetch_single_series(name: str, series_id: str) -> pd.DataFrame | None:
    """
    Busca os dados de uma única série seguindo o fluxo de 2 passos da documentação oficial.
    """
    try:
        # --- PASSO 1: Obter metadados da série ---
        meta_url = f"{API_BASE_URL}/series/?lang=PT&series_ids={series_id}"
        print(f"  [Passo 1: Metadados {name}] URL: {meta_url}")
        meta_response = requests.get(meta_url, headers=HEADERS, timeout=60)
        meta_response.raise_for_status()
        series_info = meta_response.json()

        if not series_info:
            print(f"❌ Metadados não encontrados para a série {name} (ID: {series_id}).")
            return None

        metadata = series_info[0]
        domain_id = metadata["domain_ids"][0]
        dataset_id = metadata["dataset_id"]
        print(f"  [Info {name}] Domain: {domain_id}, Dataset: {dataset_id}")

        # --- PASSO 2: Obter os dados da série ---
        data_url = f"{API_BASE_URL}/domains/{domain_id}/datasets/{dataset_id}/?lang=PT&series_ids={series_id}"
        print(f"  [Passo 2: Dados {name}] URL: {data_url}")
        
        dataset = pyjstat.Dataset.read(data_url, timeout=90)
        df = dataset.write(output='dataframe')
        
        df.rename(columns={'value': name}, inplace=True)
        df.set_index('Data', inplace=True)
        return df[[name]]

    except Exception as e:
        print(f"❌ Falha ao buscar a série {name} (ID: {series_id}). Erro: {e}")
        return None

def main():
    """
    Busca os dados das condições de crédito (TANs e Prestação) usando os
    series_ids corretos, combina-os e guarda num único ficheiro JSON.
    """
    print("🚀 A iniciar a recolha de dados das Condições de Crédito (Método Definitivo)...")
    
    all_series_dfs = []

    with ThreadPoolExecutor(max_workers=4) as executor:
        future_to_series = {executor.submit(fetch_single_series, name, s_id): name for name, s_id in SERIES_IDS.items()}
        for future in future_to_series:
            df_series = future.result()
            if df_series is not None:
                all_series_dfs.append(df_series)

    if len(all_series_dfs) != len(SERIES_IDS):
        print("❌ Nem todas as séries foram obtidas com sucesso. A abortar.")
        return False
        
    df_combined = pd.concat(all_series_dfs, axis=1)
    
    # Processamento final
    df_combined.sort_index(inplace=True)
    df_combined.ffill(inplace=True)
    
    # Arredondar taxas para 3 casas decimais e prestação para 2
    for col in df_combined.columns:
        if 'tan' in col:
            df_combined[col] = df_combined[col].round(3)
        else:
            df_combined[col] = df_combined[col].round(2)
    
    df_combined.reset_index(inplace=True)
    df_combined.rename(columns={'Data': 'date'}, inplace=True)
    df_combined['date'] = pd.to_datetime(df_combined['date']).dt.strftime('%Y-%m-%d')
    
    print("\n✅ Todas as séries foram combinadas e processadas com sucesso.")

    # Guardar os dados no local correto
    output_dir = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'webapp', 'public', 'data')
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, 'credito_habitacao_condicoes.json')
    
    df_combined.to_json(output_path, orient='records', indent=2, force_ascii=False)

    print(f"✅ Dados das condições de crédito guardados com sucesso em: {output_path}")
    return True

if __name__ == "__main__":
    main()