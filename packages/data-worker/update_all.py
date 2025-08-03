# packages/data-worker/update_all.py

# --- Core Scrapers ---
# Nota: Otimizámos os 3 scripts de quotas para um único script mais eficiente.
from scripts.euribor.get_euribor_quotas import main as update_euribor_quotas
from scripts.euribor.get_euribor_rates import main as update_euribor_rates
from scripts.update_interest_rates_series import main as update_taeg_tan
from scripts.preco_casas.update_housing_price_index_series import main as update_housing_series
from scripts.preco_casas.update_housing_price_yoy_kpi import main as update_housing_kpi
from scripts.credito_habitacao.get_condicoes_credito import main as update_condicoes_credito
from scripts.cambios.get_exchange_rates import main as update_exchange_rates
from scripts.risco_incumprimento.update_default_risk_map_data import main as update_risk_map
from scripts.inflacao.get_inflation_data import main as fetch_inflation_data


# --- Legacy (manter se ainda for usado para outros dados) ---
from apibp.apibp import main as update_macro

def main():
    """
    Orquestrador principal para atualizar todos os dados do site Ativos.pt.
    """
    print("--- INÍCIO DO PROCESSO DE ATUALIZAÇÃO DE DADOS ---")

    print("\n--- A atualizar dados de Crédito e Taxas de Juro ---")
    update_euribor_quotas()
    update_euribor_rates()
    update_taeg_tan()
    update_condicoes_credito()
    
    print("\n--- A atualizar dados do Mercado Imobiliário ---")
    update_housing_series()
    update_housing_kpi()
    update_risk_map()
    
    print("\n--- A atualizar dados de Mercados Internacionais ---")
    update_exchange_rates()

    # Se o apibp.py ainda for necessário para outros dados, mantemo-lo.
    # Caso contrário, pode ser comentado ou removido.
    #print("\n--- A iniciar atualização de indicadores macro (legacy apibp.py) ---")
    #update_macro()
    
    print("\n--- A ATUALIZAR DADOS DA INFLAÇÃO ---")
    fetch_inflation_data()
    
    print("\n✅ Orquestrador 'update_all' concluído com sucesso.")

if __name__ == "__main__":
    main()