import requests
import json
from pathlib import Path
import datetime
from pyjstat import pyjstat
import pandas as pd

# --- Configuração ---
BPSTAT_API_URL = "https://bpstat.bportugal.pt/data/v1"
OUTPUT_PATH = Path(__file__).resolve().parent.parent / 'src' / 'data' / 'indicadores_chave.json'

# Dicionário final de alvos, com o "caminho" exato e os filtros para cada indicador.
TARGETS = {
    "inflacao_ipc": {
        "label": "Inflação (IPC)",
        "domain_id": 12, "dataset_id": "b8cc662879c9f7b0f3faf89c7871fc38",
        "filters": {
            "Indicadores": "Índice de preços no consumidor",
            "Métrica": "Taxa de variação homóloga"
        }
    },
    "euribor_12m": {
        "label": "Taxa Euribor a 12 meses",
        "domain_id": 22, "dataset_id": "471186a839daf97d9280419fc06c8579",
        "filters": {
            "Taxa de juro de referência": "TBA calculada a partir das Euribor",
            "Periodicidade": "Mensal"
        }
    },
    "precos_habitacao": {
        "label": "Preços Habitação (Var. Homóloga)",
        "domain_id": 39, "dataset_id": "b8cc662879c9f7b0f3faf89c7871fc38",
        "filters": {
            "Indicadores": "Preços de habitação",
            "Métrica": "Taxa de variação homóloga"
        }
    },
    "divida_publica": {
        "label": "Dívida Pública",
        "domain_id": 28, "dataset_id": "83489eb2e300881d87b13ff5187e5654",
        # CORREÇÃO: Usar o dataset de Portugal e a ótica correspondente
        "filters": {
            "Ótica": "Ótica de contas nacionais",
            "Métrica": "% do PIB",
            "Território de referência": "Portugal"
        }
    },
    "pib": {
        "label": "PIB (Produto Interno Bruto)",
        "domain_id": 54, "dataset_id": "ce3e4e50cda325537eff729ef64037cd",
        "filters": {
            "Agregados de despesa": "Produto interno bruto a preços de mercado",
            "Métrica": "Taxa de variação homóloga"
        }
    },
    "desemprego": {
        "label": "Taxa de Desemprego",
        "domain_id": 13, "dataset_id": "22394483d575a2ff580e98f45939476b",
        "filters": {
            "Indicadores": "Taxa de desemprego",
            "Escalão de idade": "De 16 a 74 anos"
        }
    },
    "confianca_consumidores": {
        "label": "Confiança dos Consumidores",
        "domain_id": 47, "dataset_id": "a7a13b051cd84461b9fefe50fb66ce3b",
        "filters": {
            "Indicadores": "Indicador de confiança dos consumidores"
        }
    }
}

def fetch_indicator(target_info):
    """
    Busca um indicador específico, carregando um dataset completo e filtrando-o.
    """
    label = target_info['label']
    domain_id = target_info['domain_id']
    dataset_id = target_info['dataset_id']
    filters = target_info['filters']
    
    print(f"-> A processar: {label}")
    try:
        data_url = f"{BPSTAT_API_URL}/domains/{domain_id}/datasets/{dataset_id}/?lang=PT"
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        
        dataset = pyjstat.Dataset.read(data_url, timeout=45)
        df = dataset.write('dataframe')

        if df.empty:
            raise ValueError("O dataset veio vazio.")

        filtered_df = df.copy()
        for column, value in filters.items():
            # Usamos .str.contains() para uma correspondência flexível
            filtered_df = filtered_df[filtered_df[column].str.contains(value, case=False, na=False, regex=False)]

        if filtered_df.empty:
            raise ValueError(f"Não foi possível encontrar a série com os filtros: {filters}")

        # Ordenar por data e obter o último valor válido (não nulo)
        filtered_df = filtered_df.sort_values(by='Data').dropna(subset=['value'])
        if filtered_df.empty:
            raise ValueError("A série filtrada não tem valores válidos (não-nulos).")
            
        latest_data = filtered_df.iloc[-1]
        valor = latest_data['value']
        data_referencia = latest_data['Data']
        
        data_formatada = pd.to_datetime(data_referencia).strftime('%Y-%m-%d')
        
        print(f"   ✅ Valor encontrado: {valor} (Data: {data_formatada})")
        
        return {
            "label": label,
            "valor": round(valor, 2), # Arredondar para 2 casas decimais
            "unidade": latest_data.get('Unidade de medida', '%'),
            "data_referencia": data_formatada,
        }

    except Exception as e:
        print(f"   ❌ Erro ao processar '{label}': {e}")
        return None

def main():
    print("🚀 A iniciar o scraper final de indicadores do BPstat...")
    final_data = {
        "data_scrape": datetime.datetime.now().isoformat(),
        "fonte": "BPstat (Banco de Portugal)",
        "indicadores": {}
    }

    for key, target_info in TARGETS.items():
        indicator_data = fetch_indicator(target_info)
        if indicator_data:
            final_data["indicadores"][key] = indicator_data

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(final_data, f, ensure_ascii=False, indent=4)

    print(f"\n✅ Sucesso! {len(final_data['indicadores'])} de {len(TARGETS)} indicadores foram guardados em: {OUTPUT_PATH}")

if __name__ == "__main__":
    main()
