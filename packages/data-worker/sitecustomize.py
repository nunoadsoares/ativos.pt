# carrega automaticamente no arranque do Python (se este diretório estiver no sys.path)
import sys, os, types

HERE = os.path.abspath(os.path.dirname(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))

# Candidatos: layout local vs layout no container (/app/public)
PUBLIC_DIR_CANDIDATES = [
    os.path.join(PROJECT_ROOT, 'packages', 'webapp', 'public'),  # layout local
    os.path.join(PROJECT_ROOT, 'public'),                        # layout container
]

def _first_existing_or_default(candidates, default):
    for p in candidates:
        # aceitamos se a pasta existir OU se o parent existir (primeiro build)
        if os.path.isdir(p) or os.path.isdir(os.path.dirname(p)):
            return p
    return default

PUBLIC_DIR = _first_existing_or_default(PUBLIC_DIR_CANDIDATES, os.path.join(PROJECT_ROOT, 'public'))
DB_PATH = os.path.join(PUBLIC_DIR, 'datahub.db')
DATA_PATH = PUBLIC_DIR

# Garante que a pasta pública existe (para a DB/CSVs)
os.makedirs(PUBLIC_DIR, exist_ok=True)

# Injeta um módulo 'config' virtual (para não mexer nos 15 scripts)
config = types.ModuleType("config")
config.DB_PATH = DB_PATH
config.DATA_PATH = DATA_PATH
sys.modules["config"] = config
