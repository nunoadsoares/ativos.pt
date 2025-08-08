import pandas as pd
import requests
from pyjstat import pyjstat
import os
import sqlite3
import datetime as dt
from concurrent.futures import ThreadPoolExecutor

# ==================================================================
# ALTERAÇÃO: Importa o caminho da DB a partir do ficheiro central de configuração.
# Isto garante que o script encontra sempre a base de dados, independentemente
# de onde é executado (localmente, no Docker, etc.).
# ==================================================================
from config import DB_PATH

# --- Configuração da API BPstat ---
API_BASE_URL = "https://bpstat.bportugal.pt/data/v1"
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

SERIES_IDS = {
    'usd': '12531971', 'gbp': '12531970', 'chf': '12531968', 'cad': '12532011',
    'aud': '12531935', 'cny': '12531938', 'brl': '12532019'
}

CURRENCY_LABELS = {
    'usd': 'Dólar Americano', 'gbp': 'Libra Esterlina', 'chf': 'Franco Suíço',
    'cad': 'Dólar Canadiano', 'aud': 'Dólar Australiano', 'cny': 'Yuan Chinês', 'brl': 'Real Brasileiro'
}

def fetch_single_series(name: str, series_id: str) -> pd.DataFrame | None:
    """Busca os dados de uma única série cambial."""
    try:
        meta_url = f"{API_BASE_URL}/series/?lang=PT&series_ids={series_id}"
        print(f"  [Passo 1: Metadados {name.upper()}] URL: {meta_url}")
        meta_response = requests.get(meta_url, headers=HEADERS, timeout=60)
        meta_response.raise_for_status()
        series_info = meta_response.json()

        if not series_info:
            print(f"❌ Metadados não encontrados para a série {name} (ID: {series_id}).")
            return None

        metadata = series_info[0]
        domain_id = metadata["domain_ids"][0]
        dataset_id = metadata["dataset_id"]

        data_url = f"{API_BASE_URL}/domains/{domain_id}/datasets/{dataset_id}/?lang=PT&series_ids={series_id}"
        print(f"  [Passo 2: Dados {name.upper()}] URL: {data_url}")
        
        dataset = pyjstat.Dataset.read(data_url, timeout=90)
        df = dataset.write(output='dataframe')
        
        df.rename(columns={'value': name}, inplace=True)
        df.set_index('Data', inplace=True)
        return df[[name]]

    except Exception as e:
        print(f"❌ Falha ao buscar a série {name} (ID: {series_id}). Erro: {e}")
        return None

def save_historical_series(conn, df_final):
    """Guarda todas as séries históricas na tabela historical_series."""
    print("\n💾 A guardar séries históricas na base de dados...")
    cur = conn.cursor()
    
    df_melted = df_final.melt(id_vars=['date'], var_name='currency_code', value_name='value')
    
    total_rows_inserted = 0
    for currency_code in df_final.columns.drop('date'):
        series_key = f"exchange_rate_eur_{currency_code}"
        df_currency = df_melted[df_melted['currency_code'] == currency_code]
        
        rows_to_insert = [
            (series_key, row['date'], row['value'])
            for _, row in df_currency.iterrows() if pd.notna(row['value'])
        ]
        
        cur.executemany("INSERT OR REPLACE INTO historical_series (series_key, date, value) VALUES (?, ?, ?)", rows_to_insert)
        
        print(f"  [DEBUG] Inseridas/Atualizadas {len(rows_to_insert)} linhas para a série '{series_key}'.")
        total_rows_inserted += len(rows_to_insert)
    
    print(f"✅ {total_rows_inserted} registos históricos guardados com sucesso.")

def update_key_indicators(conn, df_final):
    """Atualiza a tabela key_indicators com o valor mais recente de cada moeda."""
    print("\n🔑 A atualizar os indicadores chave (últimos valores)...")
    cur = conn.cursor()
    
    latest_data = df_final.iloc[-1]
    reference_date = latest_data['date']
    updated_at = dt.datetime.utcnow().isoformat()
    
    rows_updated = 0
    for currency_code, value in latest_data.drop('date').items():
        if pd.isna(value):
            continue
        
        key = f"latest_exchange_rate_eur_{currency_code}"
        label = f"EUR / {currency_code.upper()} ({CURRENCY_LABELS.get(currency_code, currency_code.upper())})"
        
        # A coluna 'unit' pode não existir na tua tabela, ajusta se necessário
        cur.execute("INSERT OR REPLACE INTO key_indicators (indicator_key, label, value, reference_date, updated_at) VALUES (?, ?, ?, ?, ?)",
                      (key, label, value, reference_date, updated_at))
        
        print(f"  [DEBUG] Indicador '{key}' atualizado para o valor {value}.")
        rows_updated += 1
    
    print(f"✅ {rows_updated} indicadores chave atualizados com sucesso.")

def main():
    """Busca e armazena os dados das taxas de câmbio na base de dados SQLite."""
    print("🚀 A iniciar a recolha de dados das Taxas de Câmbio (EUR)...")
    
    all_series_dfs = []
    with ThreadPoolExecutor(max_workers=len(SERIES_IDS)) as executor:
        results = executor.map(fetch_single_series, SERIES_IDS.keys(), SERIES_IDS.values())
        for df_result in results:
            if df_result is not None:
                all_series_dfs.append(df_result)

    if not all_series_dfs:
        print("❌ Nenhuma série foi obtida com sucesso. A abortar.")
        return False
        
    df_combined = pd.concat(all_series_dfs, axis=1)
    df_combined.sort_index(inplace=True)
    df_combined.ffill(inplace=True)
    
    print("\n💡 A otimizar dados: selecionando o primeiro registo de cada mês...")
    df_combined.reset_index(inplace=True)
    df_combined['Data'] = pd.to_datetime(df_combined['Data'])
    
    df_combined['year_month'] = df_combined['Data'].dt.to_period('M')
    df_monthly = df_combined.drop_duplicates(subset='year_month', keep='first').copy()
    df_monthly.drop(columns=['year_month'], inplace=True)
    
    print(f"  ✅ Dados reduzidos de {len(df_combined)} para {len(df_monthly)} registos.")

    df_final = df_monthly.round(4)
    df_final.rename(columns={'Data': 'date'}, inplace=True)
    df_final['date'] = df_final['date'].dt.strftime('%Y-%m-%d')
    
    print("\n✅ Todas as séries de câmbio foram combinadas e processadas.")

    conn = None # Garante que a variável existe
    try:
        # A variável DB_PATH agora vem do config.py e está sempre correta
        conn = sqlite3.connect(DB_PATH, isolation_level=None)
        cur = conn.cursor()
        cur.execute("PRAGMA journal_mode = WAL;")
        save_historical_series(conn, df_final)
        update_key_indicators(conn, df_final)
    except sqlite3.Error as e:
        print(f"❌ Erro na base de dados: {e}")
        return False
    finally:
        if conn:
            conn.close()
    
    print("\n🎉 Processo concluído com sucesso!")
    return True

if __name__ == "__main__":
    main()