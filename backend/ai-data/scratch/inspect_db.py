import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv("../../../.env")

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase = create_client(url, key)

try:
    res = supabase.table("projects").select("*").limit(1).execute()
    if res.data:
        print("Columns in projects table:", res.data[0].keys())
    else:
        print("Projects table is empty.")
except Exception as e:
    print("Error:", e)
