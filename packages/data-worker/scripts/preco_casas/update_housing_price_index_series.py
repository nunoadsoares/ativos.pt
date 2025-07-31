# packages/data-worker/apibp/update_housing_price_index_series.py
#!/usr/bin/env python3
"""
Extrai as séries históricas do Índice de Preços da Habitação (Total, Novos, Existentes)
e grava em ficheiros CSV separados.
"""
from pathlib import Path
import pandas as pd
from pyjstat import pyjstat

# --- Configuração ---
DOMAIN_ID  = 39
DATASET_ID = "da133c091337a417b8b242c65e477ca0" # Dataset com os ÍNDICES
BPSTAT_API_URL = "https://bpstat.bportugal.pt/data/v1"
OUT_DIR = Path(__file__).parents[3] / "webapp" / "public" / "data"

SERIES_TO_FETCH = {
    "house_price_index_total":    {"filter": "Preços de habitação"},
    "house_price_index_new":      {"filter": "Preços de habitação - alojamento novo"},
    "house_price_index_existing": {"filter": "Preços de habitação - alojamento existente"},
}

def fetch_full_dataset() -> pd.DataFrame:
    """Busca o dataset completo dos índices de preços."""
    url = f"{BPSTAT_API_URL}/domains/{DOMAIN_ID}/datasets/{DATASET_ID}/?lang=PT"
    print(f"-> A buscar dataset de Índices de Preços de Habitação...")
    dataset = pyjstat.Dataset.read(url, timeout=90)
    df = dataset.write('dataframe')
    print("   ✅ Dataset carregado.")
    return df

def main():
    """Função principal para extrair e gravar os dados."""
    try:
        df = fetch_full_dataset()
        if df.empty:
            raise ValueError("O DataFrame retornado pela API está vazio.")

        for series_key, details in SERIES_TO_FETCH.items():
            print(f"   -> A processar série: {series_key}")
            
            # Filtra o dataframe para a série específica
            filtered_df = df[df['Indicadores'].str.contains(details['filter'], na=False)]
            
            if filtered_df.empty:
                print(f"      ❌ Nenhum dado encontrado para o filtro: {details['filter']}")
                continue

            # Prepara os dados para o CSV
            output_df = (
                filtered_df[['Data', 'value']].dropna(subset=['value'])
                .rename(columns={"Data": "date", "value": "value"})
                .sort_values("date")
            )
            output_df['date'] = pd.to_datetime(output_df['date']).dt.strftime('%Y-%m-%d')
            
            # Grava o ficheiro CSV
            OUT_DIR.mkdir(parents=True, exist_ok=True)
            outfile_path = OUT_DIR / f"{series_key}.csv"
            output_df.to_csv(outfile_path, index=False)
            print(f"      ✅ Gravado {len(output_df)} linhas em {outfile_path.name}")

    except Exception as e:
        print(f"❌ Erro fatal no script de séries de habitação: {e}")

if __name__ == "__main__":
    main()