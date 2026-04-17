import os
import psycopg
from dotenv import load_dotenv

load_dotenv('../../.env')
db_url = os.getenv('DATABASE_URL')

if db_url and db_url.startswith('postgresql+psycopg://'):
    db_url = db_url.replace('postgresql+psycopg://', 'postgresql://', 1)
if '?' in db_url:
    db_url = db_url.split('?')[0]

try:
    print(f"Connecting to DB...")
    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            print("--- TABLE: scrape_runs ---")
            cur.execute("SELECT id, status, current_category, items_processed, categories_discovered FROM scrape_runs ORDER BY created_at DESC LIMIT 5;")
            for r in cur.fetchall():
                print(r)
                
            print("\\n--- TABLE: scrape_items (Total Count) ---")
            cur.execute("SELECT count(*) FROM scrape_items;")
            print(f"Total items: {cur.fetchone()[0]}")
            
            print("\\n--- ACTIVE POLICIES ---")
            cur.execute("""
                SELECT p.polname, c.relname as tablename
                FROM pg_policy p
                JOIN pg_class c ON p.polrelid = c.oid
                WHERE c.relname IN ('scrape_runs', 'scrape_items');
            """)
            for p in cur.fetchall():
                print(p)
                
            print("\\n--- RECENT ERRORS IN scrape_runs ---")
            cur.execute("SELECT error_message FROM scrape_runs WHERE status = 'failed' ORDER BY created_at DESC LIMIT 3;")
            for e in cur.fetchall():
                print(e[0])
except Exception as e:
    print(f"Error: {e}")
