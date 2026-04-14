from __future__ import annotations

import os
from functools import lru_cache

from supabase import Client, create_client
from supabase._async.client import AsyncClient, create_client as create_async_client

class SupabaseConfigError(RuntimeError):
  pass


@lru_cache(maxsize=1)
def get_supabase_admin() -> Client:
  url = os.getenv("SUPABASE_URL", "").strip()
  key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
  if not url or not key:
    raise SupabaseConfigError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
  return create_client(url, key)


_async_client: AsyncClient | None = None

async def get_supabase_async_admin() -> AsyncClient:
  global _async_client
  if _async_client is not None:
    return _async_client
  url = os.getenv("SUPABASE_URL", "").strip()
  key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
  if not url or not key:
    raise SupabaseConfigError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
  _async_client = await create_async_client(url, key)
  return _async_client


def bucket_uploads() -> str:
  return os.getenv("SUPABASE_STORAGE_BUCKET_UPLOADS", "uploads")


def bucket_offers() -> str:
  return os.getenv("SUPABASE_STORAGE_BUCKET_OFFERS", "offers")


def ensure_bucket_exists(bucket_name: str):
  """Checks if a storage bucket exists, and creates it as PUBLIC if missing."""
  client = get_supabase_admin()
  try:
      # Check existence
      client.storage.get_bucket(bucket_name)
  except Exception as e:
      # Use basic string check or status check if sdk allows
      # Supabase python SDK often returns a response or raises Exception
      # We attempt to create if it fails
      try:
          print(f"[Supabase] Bucket '{bucket_name}' not found or inaccessible. Creating...")
          client.storage.create_bucket(bucket_name, options={"public": True})
      except Exception as create_error:
          print(f"[Supabase] Error creating bucket '{bucket_name}': {create_error}")

