import requests
from pyjstat import pyjstat
import pandas as pd

# --- Alvo a Explorar ---
# Agora, vamos explorar o domínio "Dívida pública".
DOMAIN_ID = 28

BPSTAT_API_URL = "https://bpstat.bportugal.pt/data/v1"

def explore_domain_datasets():
    """
    Esta função vai a um domínio, encontra todos os seus datasets,
    e para cada um, mostra as colunas e valores únicos para sabermos como filtrar.
    """
    print(f"🚀 A explorar TODOS os datasets do domínio '{DOMAIN_ID}'...")
    
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        
        # 1. Obter a lista de todos os datasets no domínio
        datasets_list_url = f"{BPSTAT_API_URL}/domains/{DOMAIN_ID}/datasets/?lang=PT"
        datasets_response = requests.get(datasets_list_url, headers=headers, timeout=15)
        datasets_response.raise_for_status()
        datasets_collection = datasets_response.json()
        
        all_datasets_info = datasets_collection.get('link', {}).get('item', [])
        if not all_datasets_info:
            raise ValueError("O domínio não contém nenhum dataset.")

        print(f"\nEncontrados {len(all_datasets_info)} datasets. A analisar cada um...\n")

        # 2. Iterar sobre cada dataset e explorar a sua estrutura
        for i, ds_info in enumerate(all_datasets_info):
            dataset_id = ds_info['extension']['id']
            dataset_label = ds_info.get('label', 'N/A')
            print(f"======================================================================")
            print(f"  Analisando Dataset {i+1}/{len(all_datasets_info)}: '{dataset_id}'")
            print(f"  Label: {dataset_label[:80]}...")
            print(f"======================================================================\n")
            
            try:
                dataset_url = ds_info['href']
                dataset = pyjstat.Dataset.read(dataset_url, timeout=45)
                df = dataset.write('dataframe')

                if df.empty:
                    print("   -> Dataset vazio.\n")
                    continue

                for column in df.columns:
                    if column in ['value', 'Data']:
                        continue
                    
                    print(f"--- Coluna: '{column}' ---")
                    unique_values = df[column].unique().tolist()
                    for value in unique_values[:15]:
                        print(f"  - '{value}'")
                    if len(unique_values) > 15:
                        print(f"  - ... e mais {len(unique_values) - 15} outros valores.")
                    print("\n")

            except Exception as e:
                print(f"   -> Não foi possível analisar este dataset. Erro: {e}\n")

    except Exception as e:
        print(f"\n❌ Ocorreu um erro crítico durante a exploração: {e}")

if __name__ == "__main__":
    explore_domain_datasets()
