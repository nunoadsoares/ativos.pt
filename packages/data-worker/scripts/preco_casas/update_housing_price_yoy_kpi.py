# packages/data-worker/apibp/update_housing_price_yoy_kpi.py
#!/usr/bin/env python3
"""
Extrai o último valor da Variação Homóloga do Preço da Habitação
e grava na base de dados datahub.db.
"""
from pathlib import Path
import pandas as pd
from pyjstat import pyjstat
import sqlite3
import datetime

# --- Configuração ---
DOMAIN_ID  = 39
DATASET_ID = "b8cc662879c9f7b0f3faf89c7871fc38" # Dataset com a VARIAÇÃO HOMÓLOGA
BPSTAT_API_URL = "https://bpstat.bportugal.pt/data/v1"
DB_PATH = Path(__file__).parents[3] / "webapp" / "public" / "datahub.db"

TARGET_INFO = {
    "key": "precos_habitacao_var",
    "label": "Preços Habitação (Var. Homóloga)", 
    "filters": {"Indicadores": "Preços de habitação", "Métrica": "Taxa de variação homóloga"}
}

def main():
    """Função principal para extrair e gravar o KPI."""
    label = TARGET_INFO['label']
    print(f"-> A processar (KPI): {label}")
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
        
        # Guardar na Base de Dados
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("REPLACE INTO key_indicators (indicator_key, label, value, unit, reference_date, updated_at) VALUES (?, ?, ?, ?, ?, ?)", 
                       (TARGET_INFO["key"], TARGET_INFO["label"], round(valor, 2), '%', data_referencia, datetime.datetime.now().isoformat()))
        conn.commit()
        conn.close()
        print(f"   [SQLite] ✅ KPI '{TARGET_INFO['key']}' guardado.")

    except Exception as e:
        print(f"   ❌ Erro ao processar o KPI '{label}': {e}")

if __name__ == "__main__":
    main()