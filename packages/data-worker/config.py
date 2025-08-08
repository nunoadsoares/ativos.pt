# packages/data-worker/config.py
import os

# O caminho para a raiz do projeto, subindo dois níveis a partir daqui (data-worker -> packages -> raiz)
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

# O caminho definitivo para a base de dados
DB_PATH = os.path.join(PROJECT_ROOT, 'packages', 'webapp', 'public', 'datahub.db')

# O caminho para a pasta de dados (para os CSVs)
DATA_PATH = os.path.join(PROJECT_ROOT, 'packages', 'webapp', 'public', 'data')