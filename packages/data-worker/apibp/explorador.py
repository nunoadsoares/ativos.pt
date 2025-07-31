#!/usr/bin/env python3
"""
Mostra os valores únicos para os filtros chave do dataset 85c2d956038233432ce61f230f7dddab
no domínio 186 (Crédito à Habitação), para que saibas exatamente que strings usar.
"""
import requests
from pyjstat import pyjstat

BPSTAT_API = "https://bpstat.bportugal.pt/data/v1"
DOMAIN_ID  = 186
DATASET_ID = "85c2d956038233432ce61f230f7dddab"

def resolve_dataset_href(dataset_id):
    url = f"{BPSTAT_API}/domains/{DOMAIN_ID}/datasets?lang=PT"
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    for ds in resp.json().get("link", {}).get("item", []):
        if ds["extension"]["id"] == dataset_id:
            return ds["href"]
    raise RuntimeError("Dataset não encontrado")

href = resolve_dataset_href(DATASET_ID)
ds   = pyjstat.Dataset.read(href)
df   = ds.write('dataframe')

print("■ Valores únicos de 'Prazo de fixação inicial da taxa':")
print(df["Prazo de fixação inicial da taxa"].dropna().unique().tolist())
print("\n■ Valores únicos de 'Taxa de juro de referência':")
print(df["Taxa de juro de referência"].dropna().unique().tolist())
