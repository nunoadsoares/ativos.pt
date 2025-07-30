# packages/data-worker/apibp/apibp.py

import requests
import json
from pathlib import Path
import datetime
import sqlite3
import pandas as pd
from pyjstat import pyjstat

# --- Configuração ---
BPSTAT_API_URL = "https://bpstat.bportugal.pt/data/v1"

# Caminhos dinâmicos relativos à raiz do projeto, para funcionar em qualquer máquina
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
DB_PATH = PROJECT_ROOT / 'packages' / 'webapp' / 'public' / 'datahub.db'
DATALAKE_PATH = PROJECT_ROOT / 'packages' / 'webapp' / 'src' / 'data' / 'datalake'

# O teu dicionário TARGETS permanece igual
TARGETS = {
    "inflacao_ipc": {"label": "Inflação (IPC)", "domain_id": 12, "dataset_id": "b8cc662879c9f7b0f3faf89c7871fc38", "filters": {"Indicadores": "Índice de preços no consumidor", "Métrica": "Taxa de variação homóloga"}},
    "euribor_12m": {"label": "Taxa Euribor a 12 meses", "domain_id": 22, "dataset_id": "471186a839daf97d9280419fc06c8579", "filters": {"Taxa de juro de referência": "TBA calculada a partir das Euribor", "Periodicidade": "Mensal"}},
    "precos_habitacao": {"label": "Preços Habitação (Var. Homóloga)", "domain_id": 39, "dataset_id": "b8cc662879c9f7b0f3faf89c7871fc38", "filters": {"Indicadores": "Preços de habitação", "Métrica": "Taxa de variação homóloga"}},
    "divida_publica": {"label": "Dívida Pública", "domain_id": 28, "dataset_id": "83489eb2e300881d87b13ff5187e5654", "filters": {"Ótica": "Ótica de contas nacionais", "Métrica": "% do PIB", "Território de referência": "Portugal"}},
    "pib": {"label": "PIB (Produto Interno Bruto)", "domain_id": 54, "dataset_id": "ce3e4e50cda325537eff729ef64037cd", "filters": {"Agregados de despesa": "Produto interno bruto a preços de mercado", "Métrica": "Taxa de variação homóloga"}},
    "desemprego": {"label": "Taxa de Desemprego", "domain_id": 13, "dataset_id": "22394483d575a2ff580e98f45939476b", "filters": {"Indicadores": "Taxa de desemprego", "Escalão de idade": "De 16 a 74 anos"}},
    "confianca_consumidores": {"label": "Confiança dos Consumidores", "domain_id": 47, "dataset_id": "a7a13b051cd84461b9fefe50fb66ce3b", "filters": {"Indicadores": "Indicador de confiança dos consumidores"}}
}

# A tua função fetch_indicator permanece igual
def fetch_indicator(target_info):
    label = target_info['label']
    print(f"-> A processar: {label}")
    try:
        data_url = f"{BPSTAT_API_URL}/domains/{target_info['domain_id']}/datasets/{target_info['dataset_id']}/?lang=PT"
        dataset = pyjstat.Dataset.read(data_url, timeout=45)
        df = dataset.write('dataframe')
        if df.empty: raise ValueError("Dataset vazio.")
        
        filtered_df = df.copy()
        for column, value in target_info['filters'].items():
            # Corrigido para lidar com possíveis erros de key
            if column in filtered_df.columns:
                filtered_df = filtered_df[filtered_df[column].str.contains(value, case=False, na=False)]
        
        if filtered_df.empty: raise ValueError("Filtros não encontraram dados.")
        
        latest_data = filtered_df.sort_values(by='Data').dropna(subset=['value']).iloc[-1]
        valor = latest_data['value']
        data_referencia = pd.to_datetime(latest_data['Data']).strftime('%Y-%m-%d')
        
        print(f"   ✅ Valor encontrado: {valor} (Data: {data_referencia})")
        return {"label": label, "valor": round(valor, 2), "unidade": latest_data.get('Unidade de medida', '%'), "data_referencia": data_referencia}
    except Exception as e:
        print(f"   ❌ Erro ao processar '{label}': {e}")
        return None

def main():
    print("🚀 A iniciar o Data Worker...")
    
    all_indicators_data = {}
    for key, target_info in TARGETS.items():
        indicator_data = fetch_indicator(target_info)
        if indicator_data:
            all_indicators_data[key] = indicator_data

    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    DATALAKE_PATH.mkdir(parents=True, exist_ok=True)

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS key_indicators (
                indicator_key TEXT PRIMARY KEY, label TEXT NOT NULL, value REAL NOT NULL, 
                unit TEXT, reference_date TEXT NOT NULL, updated_at TEXT NOT NULL
            )""")
        for key, data in all_indicators_data.items():
            cursor.execute("REPLACE INTO key_indicators VALUES (?, ?, ?, ?, ?, ?)", 
                           (key, data["label"], data["valor"], data["unidade"], data["data_referencia"], datetime.datetime.now().isoformat()))
        conn.commit()
        conn.close()
        print(f"\n[SQLite] ✅ Sucesso! {len(all_indicators_data)} indicadores guardados em: {DB_PATH}")
    except Exception as e:
        print(f"\n[SQLite] ❌ Erro ao escrever na base de dados: {e}")

    try:
        today_str = datetime.datetime.now().strftime('%Y-%m-%d')
        snapshot_file_path = DATALAKE_PATH / f"{today_str}.json"
        snapshot_data = {"data_snapshot": datetime.datetime.now().isoformat(), "fonte": "BPstat (Banco de Portugal)", "indicadores": all_indicators_data}
        with open(snapshot_file_path, 'w', encoding='utf-8') as f:
            json.dump(snapshot_data, f, ensure_ascii=False, indent=4)
        print(f"[DataLake] ✅ Sucesso! Snapshot guardado em: {snapshot_file_path}")
    except Exception as e:
        print(f"[DataLake] ❌ Erro ao criar snapshot JSON: {e}")

if __name__ == "__main__":
    main()