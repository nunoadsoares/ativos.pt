#!/usr/bin/env python3
"""
Extrai a percentagem mais recente de devedores com empréstimos vencidos
para HABITAÇÃO, por região, e grava o ficheiro JSON para o mapa.
"""
from pathlib import Path
import pandas as pd
from pyjstat import pyjstat
import json
import math

# --- Configuração ---
DOMAIN_ID  = 188
DATASET_ID = "961306c1ed49daf795a53dc5fea4a04b"
BPSTAT_API_URL = "https://bpstat.bportugal.pt/data/v1"
PROJECT_ROOT = Path(__file__).resolve().parents[3]
OUT_FILE = PROJECT_ROOT / "webapp" / "public" / "data" / "map_default_risk.json"

# Nomes das colunas
COL_FINALIDADE = 'Finalidade'
COL_SECTOR = 'Setor institucional de contraparte'
COL_REGIAO = 'Território de contraparte'
COL_METRICA = 'Métrica'

# Mapeamento NUTS III para NUTS II para a lógica de fallback
NUTS3_TO_NUTS2_PARENT = {
    "Grande Lisboa (NUTS III)": "Grande Lisboa (NUTS II)",
}

def fetch_full_dataset() -> pd.DataFrame:
    """Busca o dataset completo da API."""
    url = f"{BPSTAT_API_URL}/domains/{DOMAIN_ID}/datasets/{DATASET_ID}/?lang=PT"
    print(f"-> A buscar dataset de Risco Regional da API...")
    dataset = pyjstat.Dataset.read(url, timeout=90)
    df = dataset.write('dataframe')
    print("   ✅ Dataset da API carregado.")
    return df

def main():
    try:
        df = fetch_full_dataset()
        if df.empty: raise ValueError("DataFrame vazio.")
        
        # 1. Filtra APENAS para dados de Habitação e Famílias
        hab_df = df[
            (df[COL_FINALIDADE].str.contains("Habitação", na=False, regex=False)) &
            (df[COL_SECTOR].str.contains("Famílias", na=False, regex=False)) &
            (df[COL_METRICA].str.contains("% de devedores", na=False, regex=False))
        ].copy()

        if hab_df.empty:
            raise ValueError("Nenhum dado de Habitação encontrado após os filtros.")
            
        print(f"   ✅ Encontrados {len(hab_df)} registos de Habitação.")

        # 2. Para cada região, encontra o valor mais recente
        latest_df = hab_df.loc[hab_df.groupby(COL_REGIAO)['Data'].idxmax()]
        risk_data = pd.Series(latest_df.value.values, index=latest_df[COL_REGIAO]).to_dict()
        
        # 3. Limpa os dados, convertendo NaN para None
        risk_data_clean = {
            key: round(val, 2) if pd.notna(val) and math.isfinite(val) else None
            for key, val in risk_data.items()
        }

        # 4. Aplica a lógica de fallback NUTS III -> NUTS II
        print("-> A aplicar lógica de fallback (apenas para Habitação)...")
        final_data = risk_data_clean.copy()
        for nuts3_region, nuts2_parent in NUTS3_TO_NUTS2_PARENT.items():
            if nuts3_region in final_data and final_data[nuts3_region] is None:
                if nuts2_parent in final_data and final_data[nuts2_parent] is not None:
                    print(f"   -> Fallback aplicado: {nuts3_region} usará o valor de {nuts2_parent}")
                    final_data[nuts3_region] = final_data[nuts2_parent]

        # 5. Adiciona o 'type' para o frontend
        final_data_with_type = {
            key: {"value": val, "type": "Habitação" if val is not None else "Sem dados"}
            for key, val in final_data.items()
        }

        # 6. Grava o ficheiro JSON final
        OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(OUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(final_data_with_type, f, ensure_ascii=False, indent=2)

        print(f"\n✅ Mapa de Risco final (apenas Habitação) gravado com {len(final_data_with_type)} regiões em {OUT_FILE.name}")

    except Exception as e:
        print(f"❌ Erro fatal no script do mapa de risco: {e}")

if __name__ == "__main__":
    main()