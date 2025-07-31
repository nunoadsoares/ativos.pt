#!/usr/bin/env python3
"""
Extrai a percentagem de novos créditos à habitação indexados à Euribor 6M
e grava em packages/webapp/public/data/euribor_6m_share.csv
"""
from pathlib import Path
import pandas as pd
import requests
from pyjstat import pyjstat

DOMAIN_ID  = 186
DATASET_ID = "85c2d956038233432ce61f230f7dddab"
BPSTAT_API = "https://bpstat.bportugal.pt/data/v1"
OUTFILE    = (
    Path(__file__)
    .parents[3] / "webapp" / "public" / "data" / "euribor_6m_share.csv"
)

def resolve_dataset_href(dataset_id: str) -> str:
    url = f"{BPSTAT_API}/domains/{DOMAIN_ID}/datasets?lang=PT"
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    for ds in resp.json().get("link", {}).get("item", []):
        if ds["extension"]["id"] == dataset_id:
            return ds["href"]
    raise ValueError(f"Dataset {dataset_id} não encontrado no domínio {DOMAIN_ID}.")

def fetch_dataset() -> pd.DataFrame:
    href = resolve_dataset_href(DATASET_ID)
    return pyjstat.Dataset.read(href).write("dataframe")

def main() -> None:
    df = fetch_dataset()

    sel = (
        (df["Taxa de juro de referência"] == "EURIBOR (Euro Interbank Offered Rate)")
        & (df["Tipo de informação"]       == "Novas operações")
        & (df["Prazo de fixação inicial da taxa"] == "6 meses")
    )

    out = (
        df.loc[sel & df["value"].notna(), ["Data", "value"]]
          .rename(columns={"Data": "date", "value": "share"})
          .sort_values("date")
    )

    OUTFILE.parent.mkdir(parents=True, exist_ok=True)
    out.to_csv(OUTFILE, index=False)
    print(f"✅ Gravado {len(out)} linhas em {OUTFILE}")

if __name__ == "__main__":
    main()
