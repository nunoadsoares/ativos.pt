# carrega automaticamente no arranque do Python (se este diretório estiver no sys.path)
import sys, os, types

HERE = os.path.abspath(os.path.dirname(__file__))

def in_container() -> bool:
    # heurística simples: no build estamos em /app/data-worker
    return HERE.startswith("/app/")

# LOCAL: repo raiz é dois níveis acima de packages/data-worker
LOCAL_PROJECT_ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
LOCAL_PUBLIC = os.path.join(LOCAL_PROJECT_ROOT, 'packages', 'webapp', 'public')

# DOCKER: a public fica em /app/public (porque copiaste packages/webapp para /app)
DOCKER_PUBLIC = "/app/public"

if in_container():
    PUBLIC_DIR = DOCKER_PUBLIC
else:
    PUBLIC_DIR = LOCAL_PUBLIC

DB_PATH = os.path.join(PUBLIC_DIR, 'datahub.db')
DATA_PATH = PUBLIC_DIR

# Garante que a pasta existe (primeiro build)
os.makedirs(PUBLIC_DIR, exist_ok=True)

# Injeta módulo virtual 'config' que os teus scripts importam
config = types.ModuleType("config")
config.DB_PATH = DB_PATH
config.DATA_PATH = DATA_PATH
sys.modules["config"] = config
