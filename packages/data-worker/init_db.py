# packages/data-worker/init_db.py
import sqlite3
import os

def main():
    # O caminho para a base de dados, visto da raiz do projeto
    db_path = os.path.join(os.path.dirname(__file__), '..', 'webapp', 'public', 'datahub.db')

    print(f"A garantir que a base de dados existe e tem as tabelas em: {db_path}")

    # Garante que a pasta /public existe
    os.makedirs(os.path.dirname(db_path), exist_ok=True)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Cria a tabela key_indicators se não existir
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS key_indicators (
        indicator_key TEXT PRIMARY KEY,
        label TEXT,
        value REAL,
        reference_date TEXT,
        updated_at TEXT
    )
    ''')

    # Cria a tabela historical_series se não existir
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