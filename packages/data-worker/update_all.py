# packages/data-worker/update_all.py
from apibp.apibp import main as update_macro
from scripts.euribor.fetch_bpstat_euribor_3m_share import main as eur3m
from scripts.euribor.fetch_bpstat_euribor_6m_share import main as eur6m
from scripts.euribor.fetch_bpstat_euribor_1y_share import main as eur1y
from scripts.preco_casas.update_housing_price_index_series import main as update_housing_series
from scripts.preco_casas.update_housing_price_yoy_kpi import main as update_housing_kpi
# --- IMPORT CORRIGIDO ---
from scripts.risco_incumprimento.update_default_risk_map_data import main as update_risk_map

def main():
    print("--- A iniciar atualização de indicadores macro (apibp.py) ---")
    update_macro()
    
    print("\n--- A iniciar atualização das quotas Euribor ---")
    eur3m()
    eur6m()
    eur1y()
    
    print("\n--- A iniciar atualização dos dados de Habitação ---")
    update_housing_series()
    update_housing_kpi()
    
    print("\n--- A iniciar atualização dos dados do Mapa de Risco ---")
    update_risk_map()
    
    print("\n✅ Orquestrador 'update_all' concluído.")

if __name__ == "__main__":
    main()