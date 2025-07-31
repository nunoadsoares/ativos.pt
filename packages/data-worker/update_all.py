# packages/data-worker/update_all.py
from apibp.apibp import main as update_macro
from scripts.euribor.fetch_bpstat_euribor_3m_share import main as eur3m
from scripts.euribor.fetch_bpstat_euribor_6m_share import main as eur6m
from scripts.euribor.fetch_bpstat_euribor_1y_share import main as eur1y

def main():
    update_macro()      # já existia
    eur3m()
    eur6m()
    eur1y()

if __name__ == "__main__":
    main()
