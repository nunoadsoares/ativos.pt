#!/usr/bin/env python3
"""
Extrai as séries históricas da TAEG e da TAN para novos créditos à habitação
e grava em ficheiros CSV separados na pasta correta.
Inclui diagnóstico para detetar nomes corretos das métricas disponíveis.
"""
from pathlib import Path
import pandas as pd
from pyjstat import pyjstat

# --- Configuração ---
DOMAIN_ID  = 21
DATASET_ID = "5e42e78146bb44759188678266b04c4e"
BPSTAT_API_URL = "https://bpstat.bportugal.pt/data/v1"

# Caminho de saída para: packages/webapp/public/data
OUT_DIR = Path(__file__).resolve().parents[2] / "webapp" / "public" / "data"

# Nomes das colunas
COL_FINALIDADE = 'Finalidade'
COL_TIPO_OPERACAO = 'Tipo de informação'
COL_METRICA = 'Métrica'

SERIES_TO_FETCH = {
    "interest_rate_taeg": {"filter": "Taxa anual de encargos efetiva global"},
    "interest_rate_tan":  {"filter": "Taxa acordada anualizada"}
}

def fetch_full_dataset() -> pd.DataFrame:
    url = f"{BPSTAT_API_URL}/domains/{DOMAIN_ID}/datasets/{DATASET_ID}/?lang=PT"
    print(f"-> A buscar dataset de Taxas de Juro...")
    dataset = pyjstat.Dataset.read(url, timeout=90)
    df = dataset.write('dataframe')
    print("   ✅ Dataset carregado.")
    return df

def diagnosticar_metricas(df: pd.DataFrame):
    print("\n📊 Composições únicas de Finalidade / Tipo / Métrica no dataset filtrado:")
    unique_rows = df[[COL_FINALIDADE, COL_TIPO_OPERACAO, COL_METRICA]].drop_duplicates()
    for _, row in unique_rows.iterrows():
        print(f" - Finalidade: {row[COL_FINALIDADE]} | Tipo: {row[COL_TIPO_OPERACAO]} | Métrica: {row[COL_METRICA]}")

def main():
    try:
        df = fetch_full_dataset()
        if df.empty:
            raise ValueError("DataFrame vazio.")

        base_filtered_df = df[
            (df[COL_FINALIDADE] == "Habitação") &
            (df[COL_TIPO_OPERACAO] == "Novas operações")
        ].copy()
        
        print(f"   ✅ Encontrados {len(base_filtered_df)} registos de Novas Operações de Habitação.")

        diagnosticar_metricas(base_filtered_df)
        OUT_DIR.mkdir(parents=True, exist_ok=True)

        for series_key, details in SERIES_TO_FETCH.items():
            print(f"\n   -> A processar série: {series_key}")
            
            filter_string = details['filter'].strip()
            series_df = base_filtered_df[base_filtered_df[COL_METRICA].str.strip() == filter_string]

            print(f"      🔍 Registos totais antes do dropna: {len(series_df)}")
            if series_df.empty:
                print(f"      ❌ Nenhum dado encontrado para: '{filter_string}'")
                continue

            print("      🔍 Amostra dos dados da série TAN:")
            print(series_df.head(10).to_string())
            print(series_df.columns)

            output_df = (
                series_df[['Data', 'value']]
                .dropna(subset=['value'])
                .rename(columns={"Data": "date", "value": "value"})
                .sort_values("date")
            )

            print(f"      📉 Registos com valor após dropna: {len(output_df)}")
            if output_df.empty:
                print(f"      ⚠️ Todos os valores são nulos ou não numéricos. Ficheiro não será gravado.")
                continue

            output_df['date'] = pd.to_datetime(output_df['date']).dt.strftime('%Y-%m-%d')
            outfile_path = OUT_DIR / f"{series_key}.csv"
            output_df.to_csv(outfile_path, index=False)
            print(f"      ✅ Gravado {len(output_df)} linhas em {outfile_path.name}")

        print(f"\n🏁 Ficheiros gravados em: {OUT_DIR.resolve()}")

    except Exception as e:
        print(f"\n❌ Erro fatal no script de taxas de juro: {e}")

if __name__ == "__main__":
    main()
