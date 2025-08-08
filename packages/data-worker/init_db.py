# packages/data-worker/init_db.py
import sqlite3
import os

def main():
    here = os.path.abspath(os.path.dirname(__file__))              # …/packages/data-worker
    public_dir = os.path.abspath(os.path.join(here, '..', 'webapp', 'public'))
    db_path = os.path.join(public_dir, 'datahub.db')

    print(f"A garantir que a base de dados existe e tem as tabelas em: {db_path}")
    os.makedirs(public_dir, exist_ok=True)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS key_indicators (
        indicator_key TEXT PRIMARY KEY,
        label TEXT,
        value REAL,
        reference_date TEXT,
        updated_at TEXT
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS historical_series (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        series_key TEXT,
        date TEXT,
        value REAL,
        UNIQUE(series_key, date)
    )
    ''')

    conn.commit()
    conn.close()
    print("Base de dados e tabelas verificadas com sucesso.")

if __name__ == '__main__':
    main()
