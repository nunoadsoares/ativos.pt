#!/usr/bin/env python3
"""
Explorador e Inspetor para a API BPstat do Banco de Portugal (Versão 5).

Lógica de inspeção corrigida.

Exemplos de uso:
  # 1. Listar todos os domínios
  python explorador.py --list-domains

  # 2. Listar datasets no domínio 39
  python explorador.py --domain 39

  # 3. Inspecionar as dimensões de um dataset específico
  python explorador.py --domain 39 --inspect b8cc662879c9f7b0f3faf89c7871fc38
"""
import requests
import argparse
from textwrap import dedent
from pyjstat import pyjstat

# --- Configuração ---
BPSTAT_API_URL = "https://bpstat.bportugal.pt/data/v1"
TIMEOUT = 45
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

# --- Funções da API (list_all_domains e explore_domain mantêm-se iguais) ---

def list_all_domains():
    url = f"{BPSTAT_API_URL}/domains?lang=PT"
    print(f"🔍 A tentar aceder ao URL de domínios: {url}")
    try:
        resp = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
        print(f"↳ Status da Resposta: {resp.status_code}")
        resp.raise_for_status()
        domains_list = resp.json() 
        print("\n--- DOMÍNIOS DISPONÍVEIS NA API BPSTAT ---")
        if not isinstance(domains_list, list) or not domains_list:
            print("❌ Nenhum domínio encontrado ou a resposta não é uma lista.")
            return
        for domain in domains_list:
            domain_id = domain.get("id")
            description = domain.get("description", "Sem descrição")
            if domain_id is not None and domain.get("has_series"):
                print(f"  > ID: {domain_id:<5} | Descrição: {description}")
    except Exception as e:
        print(f"❌ Erro em list_all_domains: {e}")

def explore_domain(domain_id):
    url = f"{BPSTAT_API_URL}/domains/{domain_id}/datasets?lang=PT"
    print(f"🔍 A tentar aceder ao URL do domínio {domain_id}: {url}")
    try:
        resp = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
        print(f"↳ Status da Resposta: {resp.status_code}")
        resp.raise_for_status()
        datasets_obj = resp.json()
        items = datasets_obj.get("link", {}).get("item", [])
        print(f"\n--- DATASETS NO DOMÍNIO {domain_id} ---")
        if not items:
            print(f"❌ Nenhum dataset encontrado para o domínio {domain_id}.")
            return
        for ds in items:
            dataset_id = ds.get("extension", {}).get("id", "ID não encontrado")
            description = ds.get("extension", {}).get("description", "Sem descrição")
            print(dedent(f"""
            --------------------------------------------------
            Descrição: {description}
            Dataset ID: {dataset_id}"""))
    except Exception as e:
        print(f"❌ Erro em explore_domain: {e}")


def inspect_dataset(domain_id, dataset_id):
    """Busca e imprime as dimensões e categorias de um dataset específico."""
    url = f"{BPSTAT_API_URL}/domains/{domain_id}/datasets/{dataset_id}/?lang=PT"
    print(f"🕵️  A inspecionar o dataset: {url}")
    try:
        dataset = pyjstat.Dataset.read(url, timeout=TIMEOUT)
        
        print(f"\n--- DIMENSÕES DO DATASET: {dataset_id} ---")

        # CORREÇÃO: Aceder às dimensões como uma chave de dicionário
        dims = dataset.get('dimension', {})
        
        if not dims:
            print("❌ Não foi possível encontrar dimensões para este dataset.")
            return

        for dim_name, dim_data in dims.items():
            print(f"\n■ Dimensão: '{dim_name}'")
            # Acessa as categorias dentro de cada dimensão
            categories = dim_data.get('category', {}).get('label', {})
            if categories:
                for cat_code, cat_label in categories.items():
                    print(f"  - {cat_label} (código: {cat_code})")
            else:
                print("  - Não foram encontradas categorias para esta dimensão.")

    except Exception as e:
        print(f"❌ Erro ao inspecionar o dataset '{dataset_id}': {e}")


# --- Lógica Principal ---

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Explorador e Inspetor da API BPstat do Banco de Portugal.",
        formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument('--list-domains', action='store_true', help="Lista todos os domínios de topo.")
    parser.add_argument('--domain', type=int, metavar='ID', help="Explora ou inspeciona um domínio específico.")
    parser.add_argument('--inspect', type=str, metavar='ID_DATASET', help="Inspeciona as dimensões de um dataset. Requer --domain.")

    args = parser.parse_args()

    if args.list_domains:
        list_all_domains()
    elif args.domain:
        if args.inspect:
            inspect_dataset(args.domain, args.inspect)
        else:
            explore_domain(args.domain)
    else:
        parser.print_help()