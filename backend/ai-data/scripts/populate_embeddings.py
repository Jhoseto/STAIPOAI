import os
import asyncio
import logging
from pathlib import Path
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load env from root (h:\Apps\STAIPO\STAIPOAI\.env)
root_dir = Path(__file__).resolve().parents[3] # scripts -> ai-data -> backend -> root
dotenv_path = root_dir / ".env"
load_dotenv(dotenv_path, override=True)
print(f"LOADING ENV FROM: {dotenv_path}")

from app.supabase_client import get_supabase_admin
from app.services.embeddings import get_embedding

async def populate_embeddings():
    admin = get_supabase_admin()
    
    # 1. Fetch items missing embeddings
    logger.info("Fetching items missing embeddings from 'catalog' table...")
    res = admin.table('catalog').select('id, name, code, brand').is_('embedding', 'null').execute()
    
    items = res.data or []
    total = len(items)
    if total == 0:
        logger.info("No items missing embeddings. Everything is up to date!")
        return

    logger.info(f"Found {total} items to process. Starting embedding generation...")
    
    batch_size = 10
    for i in range(0, total, batch_size):
        batch = items[i : i + batch_size]
        tasks = []
        for item in batch:
            query = f"{item.get('code', '')} {item.get('name', '')}".strip()
            tasks.append(get_embedding(query))
        
        # Resolve embeddings for the batch
        embeddings = await asyncio.gather(*tasks)
        
        # Update items in DB
        for j, item in enumerate(batch):
            emb = embeddings[j]
            if emb:
                try:
                    admin.table('catalog').update({'embedding': emb}).eq('id', item['id']).execute()
                    logger.info(f"[{i+j+1}/{total}] Updated embedding for: {item.get('name')}")
                except Exception as e:
                    logger.error(f"Failed to update entry {item['id']}: {e}")
            else:
                logger.warning(f"Failed to generate embedding for: {item.get('name')}")
        
        # Small delay to avoid hitting rate limits too hard
        await asyncio.sleep(0.1)

    logger.info("Processing complete!")

if __name__ == "__main__":
    asyncio.run(populate_embeddings())
