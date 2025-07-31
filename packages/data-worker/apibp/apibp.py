import requests
import json
from pathlib import Path
import datetime
import sqlite3
import pandas as pd
from pyjstat import pyjstat
import time

# --- Configuração ---
BPSTAT_API_URL = "https://bpstat.bportugal.pt/data/v1"
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
DB_PATH = PROJECT_ROOT / 'packages' / 'webapp' / 'public' / 'datahub.db'
DATALAKE_PATH = PROJECT_ROOT / 'packages' / 'webapp' / 'src' / 'data' / 'datalake'

# --- ALVOS PARA O DASHBOARD (ÚLTIMO VALOR) ---
LATEST_VALUE_TARGETS = {
    "inflacao_ipc": {"label": "Inflação (IPC)", "domain_id": 12, "dataset_id": "b8cc662879c9f7b0f3faf89c7871fc38", "filters": {"Indicadores": "Índice de preços no consumidor", "Métrica": "Taxa de variação homóloga"}},
    "euribor_12m": {"label": "Taxa Euribor a 12 meses", "domain_id": 22, "dataset_id": "471186a839daf97d9280419fc06c8579", "filters": {"Taxa de juro de referência": "TBA calculada a partir das Euribor", "Periodicidade": "Mensal"}},
    "precos_habitacao": {"label": "Preços Habitação (Var. Homóloga)", "domain_id": 39, "dataset_id": "b8cc662879c9f7b0f3faf89c7871fc38", "filters": {"Indicadores": "Preços de habitação", "Métrica": "Taxa de variação homóloga"}},
    "divida_publica": {"label": "Dívida Pública", "domain_id": 28, "dataset_id": "83489eb2e300881d87b13ff5187e5654", "filters": {"Ótica": "Ótica de contas nacionais", "Métrica": "% do PIB", "Território de referência": "Portugal"}},
    "pib": {"label": "PIB (Produto Interno Bruto)", "domain_id": 54, "dataset_id": "ce3e4e50cda325537eff729ef64037cd", "filters": {"Agregados de despesa": "Produto interno bruto a preços de mercado", "Métrica": "Taxa de variação homóloga"}},
    "desemprego": {"label": "Taxa de Desemprego", "domain_id": 13, "dataset_id": "22394483d575a2ff580e98f45939476b", "filters": {"Indicadores": "Taxa de desemprego", "Escalão de idade": "De 16 a 74 anos"}},
    "confianca_consumidores": {"label": "Confiança dos Consumidores", "domain_id": 47, "dataset_id": "a7a13b051cd84461b9fefe50fb66ce3b", "filters": {"Indicadores": "Indicador de confiança dos consumidores"}}
}

# --- ALVOS PARA GRÁFICOS (SÉRIE HISTÓRICA COMPLETA) ---
# Adiciona aqui os novos alvos que descobrires com o explorador.
HISTORICAL_SERIES_TARGETS = {
    "inflacao_ipc_hist": {"label": "Histórico Inflação (IPC)", "domain_id": 12, "dataset_id": "b8cc662879c9f7b0f3faf89c7871fc38", "filters": {"Indicadores": "Índice de preços no consumidor", "Métrica": "Taxa de variação homóloga"}},
    # Exemplo: "euribor_12m_hist": { ... }
}

# --- Funções de Extração ---

def fetch_latest_value(target_info):
    label = target_info['label']
    print(f"-> A processar (ÚLTIMO VALOR): {label}")
    try:
        data_url = f"{BPSTAT_API_URL}/domains/{target_info['domain_id']}/datasets/{target_info['dataset_id']}/?lang=PT"
        dataset = pyjstat.Dataset.read(data_url, timeout=45)
        df = dataset.write('dataframe')
        if df.empty: raise ValueError("Dataset vazio.")
        
        filtered_df = df.copy()
        for column, value in target_info['filters'].items():
            if column in filtered_df.columns:
                filtered_df = filtered_df[filtered_df[column].str.contains(value, case=False, na=False)]
        
        if filtered_df.empty: raise ValueError(f"Filtros não encontraram dados: {target_info['filters']}")
        
        latest_data = filtered_df.sort_values(by='Data').dropna(subset=['value']).iloc[-1]
        valor = latest_data['value']
        data_referencia = pd.to_datetime(latest_data['Data']).strftime('%Y-%m-%d')
        
        print(f"   ✅ Valor encontrado: {valor} (Data: {data_referencia})")
        return {"label": label, "valor": round(valor, 2), "unidade": latest_data.get('Unidade de medida', '%'), "data_referencia": data_referencia}
    except Exception as e:
        print(f"   ❌ Erro ao processar '{label}': {e}")
        return None

def fetch_full_series(target_info):
    label = target_info['label']
    print(f"-> A processar (SÉRIE COMPLETA): {label}")
    try:
        data_url = f"{BPSTAT_API_URL}/domains/{target_info['domain_id']}/datasets/{target_info['dataset_id']}/?lang=PT"
        dataset = pyjstat.Dataset.read(data_url, timeout=90)
        df = dataset.write('dataframe')
        if df.empty: raise ValueError("Dataset vazio.")

        filtered_df = df.copy()
        for column, value in target_info['filters'].items():
            if column in filtered_df.columns:
                filtered_df = filtered_df[filtered_df[column].str.contains(value, case=False, na=False)]
        
        if filtered_df.empty: raise ValueError(f"Filtros não encontraram dados: {target_info['filters']}")

        series_df = filtered_df[['Data', 'value']].dropna(subset=['value'])
        series_df.rename(columns={'Data': 'date', 'value': 'value'}, inplace=True)
        series_df['date'] = pd.to_datetime(series_df['date']).dt.strftime('%Y-%m-%d')
        
        print(f"   ✅ Série encontrada com {len(series_df)} pontos de dados.")
        return series_df
    except Exception as e:
        print(f"   ❌ Erro ao processar a série '{label}': {e}")
        return None

# --- Função Principal ---

def main():
    print("🚀 A iniciar o Data Worker...")
    
    # --- Preparar Base de Dados ---
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS key_indicators (
            indicator_key TEXT PRIMARY KEY, label TEXT NOT NULL, value REAL NOT NULL, 
            unit TEXT, reference_date TEXT NOT NULL, updated_at TEXT NOT NULL
        )""")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS historical_series (
            series_key TEXT NOT NULL, date TEXT NOT NULL, value REAL NOT NULL,
            PRIMARY KEY (series_key, date)
        )""")
    conn.commit()

    # --- Processar Últimos Valores para o Dashboard ---
    print("\n--- A processar indicadores para o dashboard ---")
    latest_values_data = {}
    for key, target_info in LATEST_VALUE_TARGETS.items():
        indicator_data = fetch_latest_value(target_info)
        if indicator_data:
            latest_values_data[key] = indicator_data
            cursor.execute("REPLACE INTO key_indicators VALUES (?, ?, ?, ?, ?, ?)", 
                           (key, indicator_data["label"], indicator_data["valor"], indicator_data["unidade"], indicator_data["data_referencia"], datetime.datetime.now().isoformat()))
        time.sleep(1)
    conn.commit()
    print(f"\n[SQLite] ✅ {len(latest_values_data)} indicadores chave guardados.")

    # --- Processar Séries Históricas para Gráficos ---
    print("\n--- A processar séries históricas para gráficos ---")
    for key, target_info in HISTORICAL_SERIES_TARGETS.items():
        series_df = fetch_full_series(target_info)
        if series_df is not None and not series_df.empty:
            # Limpa dados antigos para esta série antes de inserir os novos
            cursor.execute("DELETE FROM historical_series WHERE series_key = ?", (key,))
            # Converte o DataFrame para uma lista de tuplos para inserção em massa
            records_to_insert = [(key, row['date'], row['value']) for index, row in series_df.iterrows()]
            cursor.executemany(
    "INSERT OR REPLACE INTO historical_series (series_key, date, value) VALUES (?, ?, ?)",
    records_to_insert
    )

            print(f"   [SQLite] ✅ {len(records_to_insert)} registos históricos guardados para '{key}'.")
        time.sleep(1)
    conn.commit()

    # --- Criar Snapshot JSON (opcional, mas bom para backup) ---
    DATALAKE_PATH.mkdir(parents=True, exist_ok=True)
    today_str = datetime.datetime.now().strftime('%Y-%m-%d')
    snapshot_file_path = DATALAKE_PATH / f"{today_str}.json"
    snapshot_data = {"data_snapshot": datetime.datetime.now().isoformat(), "fonte": "BPstat (Banco de Portugal)", "indicadores": latest_values_data}
    with open(snapshot_file_path, 'w', encoding='utf-8') as f:
        json.dump(snapshot_data, f, ensure_ascii=False, indent=4)
    print(f"\n[DataLake] ✅ Snapshot diário guardado em: {snapshot_file_path}")

    conn.close()
    print("\n✅ Data Worker concluído com sucesso.")

if __name__ == "__main__":
    main()