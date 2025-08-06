# packages/data-worker/scripts/preco_casas/update_housing_price_yoy_kpi.py
import pandas as pd
from pyjstat import pyjstat
import os
import sqlite3
import datetime as dt

# --- Configuração ---
DB_PATH = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'webapp', 'public', 'datahub.db')
DOMAIN_ID = 39
DATASET_ID = "b8cc662879c9f7b0f3faf89c7871fc38"
BPSTAT_API_URL = "https://bpstat.bportugal.pt/data/v1"

TARGET_INFO = {
    "key": "house_price_yoy_bportugal_total_quarterly", # Chave padronizada
    "label": "Preços Habitação (Var. Homóloga)", 
    "filters": {"Indicadores": "Preços de habitação", "Métrica": "Taxa de variação homóloga"}
}

def main():
    """Função principal para extrair e gravar o KPI."""
    label = TARGET_INFO['label']
    print(f"-> A processar (KPI): {label}")
    
    conn = None # Inicializar a conexão
    try:
        url = f"{BPSTAT_API_URL}/domains/{DOMAIN_ID}/datasets/{DATASET_ID}/?lang=PT"
        dataset = pyjstat.Dataset.read(url, timeout=45)
        df = dataset.write('dataframe')
        if df.empty: raise ValueError("Dataset vazio.")
        
        filtered_df = df.copy()
        for column, value in TARGET_INFO['filters'].items():
            if column in filtered_df.columns:
                filtered_df = filtered_df[filtered_df[column].str.contains(value, case=False, na=False)]
        
        if filtered_df.empty: raise ValueError(f"Filtros não encontraram dados.")
        
        latest_data = filtered_df.sort_values(by='Data').dropna(subset=['value']).iloc[-1]
        valor = latest_data['value']
        data_referencia = pd.to_datetime(latest_data['Data']).strftime('%Y-%m-%d')
        
        print(f"   ✅ Valor encontrado: {valor} (Data: {data_referencia})")
        
        # Guardar na Base de Dados com o nosso padrão
        conn = sqlite3.connect(DB_PATH, isolation_level=None)
        cursor = conn.cursor()
        cursor.execute("PRAGMA journal_mode = WAL;")
        cursor.execute("INSERT OR REPLACE INTO key_indicators (indicator_key, label, value, unit, reference_date, updated_at) VALUES (?, ?, ?, ?, ?, ?)", 
                       (TARGET_INFO["key"], TARGET_INFO["label"], round(valor, 2), '%', data_referencia, dt.datetime.utcnow().isoformat()))
        print(f"   [SQLite] ✅ KPI '{TARGET_INFO['key']}' guardado.")

    except Exception as e:
        print(f"   ❌ Erro ao processar o KPI '{label}': {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    main()