import os
import httpx
from typing import List
import logging

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
# Available models: gemini-embedding-001, gemini-embedding-2-preview
EMBEDDING_MODEL = "gemini-embedding-2-preview"
EMBEDDING_DIM = 3072  # gemini-embedding-2-preview outputs 3072 dimensions

async def get_embedding(text: str) -> List[float]:
    """Generates an embedding for the given text using Gemini."""
    if not GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY not set — skipping embedding")
        return []

    url = (
        f"https://generativelanguage.googleapis.com/v1beta"
        f"/models/{EMBEDDING_MODEL}:embedContent?key={GEMINI_API_KEY}"
    )
    payload = {
        "model": f"models/{EMBEDDING_MODEL}",
        "content": {"parts": [{"text": text[:2000]}]},  # Gemini max ~2048 tokens
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=8.0)
            response.raise_for_status()
            data = response.json()
            return data["embedding"]["values"]
    except httpx.TimeoutException:
        logger.warning(f"Embedding timeout for: {text[:50]}")
        return []
    except Exception as e:
        logger.error(f"Embedding error: {e}")
        return []


async def get_embeddings_bulk(texts: List[str]) -> List[List[float]]:
    """Generates embeddings for a list of texts."""
    results = []
    for text in texts:
        emb = await get_embedding(text)
        results.append(emb)
    return results
