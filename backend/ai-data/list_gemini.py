import os, dotenv, httpx, json
dotenv.load_dotenv()
key = os.getenv('GEMINI_API_KEY')
try:
    r = httpx.get(f'https://generativelanguage.googleapis.com/v1beta/models?key={key}', timeout=10)
    data = r.json()
    models = data.get('models', [])
    for m in models:
        name = m.get('name', '')
        if 'embed' in name.lower() or 'text-embedding' in name.lower():
             print(f"Model: {name} - Methods: {m.get('supportedGenerationMethods', [])}")
            
except Exception as e:
    print(f"Error: {e}")
