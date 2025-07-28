import json
from pathlib import Path
import datetime
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
import re
import time

# --- Configuração ---
OUTPUT_PATH = Path(__file__).resolve().parent.parent / 'src' / 'data' / 'brokers_data.json'
# VOLTAMOS À PÁGINA PRINCIPAL, QUE SABEMOS QUE FUNCIONA
TR_URL = "https://traderepublic.com/pt-pt/"
DEBUG_SCREENSHOT_PATH = Path(__file__).resolve().parent / 'debug_screenshot.png'

def scrape_trade_republic():
    """
    Função final para extrair dados da Trade Republic, combinando o URL correto
    com a lógica de aceitar os cookies e um seletor robusto.
    """
    print(f"-> A iniciar a tentativa final de scraping da Trade Republic...")
    
    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            
            print(f"   A aceder a: {TR_URL}")
            page.goto(TR_URL, wait_until='load', timeout=30000)

            # --- PASSO 1: LIDAR COM O BANNER DE COOKIES ---
            try:
                print("   A procurar pelo banner de cookies...")
                accept_button = page.locator('//button[contains(text(), "Aceitar todos")]')
                accept_button.wait_for(timeout=7000)
                print("   Banner de cookies encontrado. A clicar...")
                accept_button.click()
                time.sleep(2) 
            except PlaywrightTimeoutError:
                print("   -> Banner de cookies não encontrado ou já aceite.")
            
            # --- PASSO 2: PROCURAR PELO VALOR NA PÁGINA PRINCIPAL ---
            # Seletor genérico que procura por um parágrafo que contenha '% de juros'
            interest_rate_locator = page.locator('p:has-text("% de juros")').first
            
            print("   A aguardar pelo elemento da taxa de juro na página principal...")
            interest_rate_locator.wait_for(timeout=10000)

            full_text = interest_rate_locator.inner_text()
            print(f"   Texto encontrado na página: '{full_text}'")
            
            match = re.search(r'(\d+(?:,\d+)?\s*%)', full_text)
            if not match:
                raise ValueError(f"Não foi possível extrair a percentagem do texto: '{full_text}'")

            interest_rate = match.group(1)
            print(f"   ✅ Taxa de juro extraída: {interest_rate}")
            
            browser.close()
            
            return { "juros_cash": interest_rate }
            
        except Exception as e:
            print(f"   ❌ Ocorreu um erro inesperado no scraping.")
            print(f"   -> Mensagem: {e}")
            print(f"   -> A guardar um screenshot de diagnóstico em: {DEBUG_SCREENSHOT_PATH}")
            if 'page' in locals():
                page.screenshot(path=DEBUG_SCREENSHOT_PATH, full_page=True)
            if 'browser' in locals():
                browser.close()
            return None

def update_data_file(broker_key, new_data):
    """
    Esta função atualiza o ficheiro JSON de forma segura.
    """
    if not OUTPUT_PATH.exists():
        OUTPUT_PATH.touch()
    try:
        with open(OUTPUT_PATH, 'r', encoding='utf-8') as f:
            full_data = json.load(f)
    except json.JSONDecodeError:
        full_data = {}
    if broker_key not in full_data:
        full_data[broker_key] = {}
    full_data[broker_key].update(new_data)
    full_data[broker_key]['data_scrape'] = datetime.datetime.now().isoformat()
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(full_data, f, ensure_ascii=False, indent=4)
    print(f"💾 Ficheiro '{OUTPUT_PATH.name}' atualizado com os dados de '{broker_key}'.")


def main():
    """
    Função principal que orquestra os scrapers de todas as corretoras.
    """
    print("🚀 A iniciar o scraper de dados de corretoras...")
    
    tr_data = scrape_trade_republic()
    if tr_data:
        update_data_file('traderepublic', tr_data)

    print("\n✅ Scraping de corretoras concluído.")

if __name__ == "__main__":
    main()
