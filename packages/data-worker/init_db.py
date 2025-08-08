# packages/data-worker/init_db.py
import sqlite3
import os

# usa o mesmo DB_PATH que o sitecustomize injeta
try:
    from config import DB_PATH  # carregado via sitecustomize
except Exception as e:
    # fallback robusto: layout local
    HERE = os.path.abspath(os.path.dirname(__file__))
    PROJECT_ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
    DB_PATH = os.path.join(PROJECT_ROOT, 'packages', 'webapp', 'public', 'datahub.db')

def column_exists(conn: sqlite3.Connection, table: str, col: str) -> bool:
    cur = conn.cursor()
    cur.execute(f"PRAGMA table_info({table})")
    return any(row[1] == col for row in cur.fetchall())

def ensure_tables(conn: sqlite3.Connection) -> None:
    cur = conn.cursor()

    # Tabela key_indicators (já com 'unit')
    cur.execute("""
    CREATE TABLE IF NOT EXISTS key_indicators (
        indicator_key  TEXT PRIMARY KEY,
        label          TEXT,
        value          REAL,
        unit           TEXT,
        reference_date TEXT,
        updated_at     TEXT
    )
    """)

    # Se a tabela existia sem 'unit', migrar
    if not column_exists(conn, 'key_indicators', 'unit'):
        cur.execute("ALTER TABLE key_indicators ADD COLUMN unit TEXT")

    # Tabela historical_series
    cur.execute("""
    CREATE TABLE IF NOT EXISTS historical_series (
        series_key TEXT NOT NULL,
        date       TEXT NOT NULL,
        value      REAL,
        PRIMARY KEY (series_key, date)
    )
    """)

    # Índices úteis
    cur.execute("CREATE INDEX IF NOT EXISTS idx_hist_series_key_date ON historical_series(series_key, date)")
    conn.commit()

def main():
    db_dir = os.path.dirname(DB_PATH)
    os.makedirs(db_dir, exist_ok=True)

    print(f"A garantir que a base de dados existe e tem as tabelas em: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    try:
        ensure_tables(conn)
    finally:
        conn.close()
    print("Base de dados e tabelas verificadas com sucesso.")

if __name__ == '__main__':
    main()
