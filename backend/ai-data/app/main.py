from __future__ import annotations

import csv
import io
import json
import os
import re
import uuid
import asyncio
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import asyncio
import sys

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from dotenv import load_dotenv
# In Docker: __file__ = /app/app/main.py → parents[1] = /app/ (correct WORKDIR)
# Do NOT use override=True so Cloud Run injected env vars take precedence
load_dotenv(Path(__file__).resolve().parents[1] / ".env")


import httpx
from bs4 import BeautifulSoup
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, BackgroundTasks, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import logging

logger = logging.getLogger(__name__)

class ScraperStatus(BaseModel):
    is_running: bool = False
    current_category: str | None = None
    items_added: int = 0
    items_processed: int = 0
    last_item_name: str | None = None
    started_at: str | None = None
    finished_at: str | None = None

SCRAPER_STATE = ScraperStatus()

from .services.resolved_table import build_resolved_pricing_table, resolve_row_from_salex
from .supabase_client import (
  SupabaseConfigError,
  bucket_offers,
  bucket_uploads,
  get_supabase_admin,
  ensure_bucket_exists,
)
from .services.embeddings import get_embedding
from .services.scraper import run_full_scrape, run_full_scrape_with_state
from .services.pdf_generator import generate_offer_pdf

app = FastAPI(title="STAIPO AI Data Service", version="0.2.0")

# Permissive CORS for local development/network access
app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

import google.generativeai as genai
if os.getenv("GEMINI_API_KEY"):
    genai.configure(api_key=os.getenv("GEMINI_API_KEY").strip())


@app.exception_handler(Exception)
async def generic_exception_handler(request, exc):
  import traceback
  logger.error(f"UNHANDLED ERROR: {exc}\n{traceback.format_exc()}")
  from fastapi.responses import JSONResponse
  return JSONResponse(
    status_code=500,
    content={"error": "Ssh! Something went wrong on the server.", "detail": str(exc)}
  )

ROOT = Path(__file__).resolve().parent.parent
# Local file storage (DATA_DIR, UPLOADS_DIR, DB_FILE) removed in favor of Supabase.



def _now() -> str:
  return datetime.now(timezone.utc).isoformat()


def _to_float(value: str | None, default: float = 0.0) -> float:
  if not value:
    return default
  normalized = value.replace(",", ".").strip()
  try:
    return float(normalized)
  except ValueError:
    return default


def _slug() -> str:
  return uuid.uuid4().hex[:10]


def _norm(s: str | None) -> str:
  return (s or "").strip().lower()


def _find_project(project_id: str) -> dict[str, Any] | None:
  res = get_supabase_admin().table("projects").select("*").eq("id", project_id).execute()
  return res.data[0] if res.data else None

def _find_upload(upload_id: str) -> dict[str, Any] | None:
  res = get_supabase_admin().table("uploads").select("*").eq("id", upload_id).execute()
  return res.data[0] if res.data else None

def _find_offer(slug: str) -> dict[str, Any] | None:
  res = get_supabase_admin().table("offers").select("*").eq("slug", slug).execute()
  return res.data[0] if res.data else None

def _is_project_trashed(project: dict[str, Any]) -> bool:
  return bool(project.get("trashedAt"))

def _hard_delete_project(project_id: str) -> int:
  # 1. Manually cleanup Storage objects linked to this project's photos
  photos_res = get_supabase_admin().table("projectPhotos").select("originalUrl").eq("projectId", project_id).execute()
  if photos_res.data:
      bucket = bucket_uploads()
      paths = []
      for p in photos_res.data:
          path = _extract_storage_path(p.get("originalUrl", ""), bucket)
          if path:
              paths.append(path)
      
      if paths:
          try:
              get_supabase_admin().storage.from_(bucket).remove(paths)
          except Exception as e:
              logger.warning(f"Failed to cleanup project photos during hard delete: {e}")

  # 2. Supabase foreign keys (ON DELETE CASCADE) will handle deleted uploads, grouped, offers etc.
  # But we must manually delete projectPhotos first or let CASCADE handle the table records.
  # DB records will be deleted by the projects.delete() if schema is correct, 
  # but we already removed the files.
  get_supabase_admin().table("projects").delete().eq("id", project_id).execute()
  return 1


def _detect_delimiter(header_line: str) -> str:
  if header_line.count(";") >= header_line.count(","):
    return ";"
  return ","


def _log_activity(user_id: str | None, action: str, resource_type: str | None = None, resource_id: str | None = None, workspace_id: str | None = None, metadata: dict[str, Any] | None = None):
  try:
    activity = {
      "userId": user_id,
      "action": action,
      "resourceType": resource_type,
      "resourceId": resource_id,
      "workspaceId": workspace_id,
      "metadata": metadata,
    }
    get_supabase_admin().table("activities").insert(activity).execute()
  except Exception:
    # Fail silently for audit logs to avoid blocking main flow
    pass


def _extract_storage_path(url: str, bucket_name: str) -> str | None:
    """Extracts the internal storage path from a Supabase public URL."""
    # Pattern: https://[...]/storage/v1/object/public/[bucket]/[path]
    marker = f"/public/{bucket_name}/"
    if marker in url:
        return url.split(marker)[-1]
    return None



def _get_field(row: dict[str, str], *candidates: str) -> str:
  lowered = {k.strip().lower(): v for k, v in row.items()}
  for key in candidates:
    if key.lower() in lowered:
      return (lowered[key.lower()] or "").strip()
  return ""


def _extract_material_code(material: str) -> str | None:
  m = material.strip().upper()
  patterns = [
    r"\b([A-Z]\d{3,4}\s*ST\d{1,2})\b",
    r"\b(\d{4,6}[A-Z]{1,3})\b",
    r"\b([A-Z]{2,}\d{2,}(?:-[A-Z0-9]+)?)\b",
    r"\b([A-Z0-9]{4,})\b",
  ]
  for pattern in patterns:
    match = re.search(pattern, m)
    if match:
      return match.group(1).replace("  ", " ").strip()
  return None


def _normalize_material_name(raw: str) -> str:
  text = raw.strip()
  fixed = {
    "biaиy": "бял",
    "biały": "бял",
    "bia³y": "бял",
    "белый матовый": "бял мат",
  }
  low = text.lower()
  return fixed.get(low, text)


# _seed_catalog_if_empty removed. Seeding should be done via init_supabase.sql or dedicated migration scripts.



def _parse_csv_content(content: bytes) -> list[dict[str, str]]:
  text = content.decode("utf-8", errors="replace")
  lines = text.splitlines()
  if not lines:
    return []
  delimiter = _detect_delimiter(lines[0])
  first_cells = [c.strip().strip('"') for c in lines[0].split(delimiter)]
  looks_like_header = any(any(ch.isalpha() for ch in cell) and len(cell) > 2 for cell in first_cells[:4])
  if looks_like_header:
    reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
    return [dict(r) for r in reader]

  out: list[dict[str, str]] = []
  raw_reader = csv.reader(io.StringIO(text), delimiter=delimiter, quotechar='"')
  for row in raw_reader:
    if not row:
      continue
    padded = (row + [""] * 8)[:8]
    out.append(
      {
        "part_name": padded[0].strip(),
        "length": padded[1].strip(),
        "edge_l": padded[2].strip(),
        "width": padded[3].strip(),
        "edge_w": padded[4].strip(),
        "thickness": padded[5].strip(),
        "qty": padded[6].strip(),
        "material": padded[7].strip(),
      }
    )
  return out


def _normalize_rows(rows: list[dict[str, str]]) -> list[dict[str, Any]]:
  normalized: list[dict[str, Any]] = []
  for idx, r in enumerate(rows):
    material = _get_field(r, "material", "материал", "name", "име", "decor", "декор")
    if not material:
      material = r.get("material", "").strip()
    material = _normalize_material_name(material)
    code = _get_field(r, "code", "код") or (_extract_material_code(material) or "")
    length = _to_float(_get_field(r, "l", "length", "дължина") or r.get("length"))
    width = _to_float(_get_field(r, "w", "width", "ширина") or r.get("width"))
    thickness = _to_float(_get_field(r, "t", "thickness", "дебелина") or r.get("thickness"))
    qty = int(_to_float(_get_field(r, "qty", "quantity", "брой") or r.get("qty"), 1))
    edge = _get_field(r, "edge", "кант", "edging")
    edge_l = (r.get("edge_l", "") or "").strip()
    edge_w = (r.get("edge_w", "") or "").strip()
    if not edge and (edge_l or edge_w):
      edge = f"{edge_l}{edge_w}".strip()
    area_m2 = round((length * width * max(qty, 1)) / 1_000_000, 4)
    edge_factor = 0.0
    if edge_l in {"=", "—"}:
      edge_factor += 2 * width
    if edge_w in {"=", "—"}:
      edge_factor += 2 * length
    if edge_factor <= 0 and edge:
      edge_factor = 2 * (length + width)
    edge_m = round((edge_factor * max(qty, 1)) / 1000, 3) if edge_factor > 0 else 0.0
    part_name = _get_field(r, "part_name", "part", "детайл", "name", "име") or r.get("part_name", "")
    normalized.append(
      {
        "rowId": idx + 1,
        "partName": part_name,
        "materialRaw": material,
        "code": code,
        "lengthMm": length,
        "widthMm": width,
        "thicknessMm": thickness,
        "qty": max(qty, 1),
        "edgeRaw": edge,
        "areaM2": area_m2,
        "edgeM": edge_m,
      }
    )
  return normalized


def _group_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
  grouped: dict[str, dict[str, Any]] = {}
  for r in rows:
    key = f"{_norm(r['materialRaw'])}|{int(r['thicknessMm'])}|{_norm(r['edgeRaw'])}"
    if key not in grouped:
      grouped[key] = {
        "key": key,
        "material": r["materialRaw"] or "Unknown",
        "code": r["code"] or "",
        "thicknessMm": r["thicknessMm"],
        "edgeRaw": r["edgeRaw"],
        "qtyTotal": 0,
        "areaM2Total": 0.0,
        "edgeMTotal": 0.0,
        "matchStatus": "unmatched",
        "catalogItemId": None,
        "matchConfidence": 0.0,
      }
    grouped[key]["qtyTotal"] += r["qty"]
    grouped[key]["areaM2Total"] = round(grouped[key]["areaM2Total"] + r["areaM2"], 4)
    grouped[key]["edgeMTotal"] = round(grouped[key]["edgeMTotal"] + r["edgeM"], 3)
  return list(grouped.values())


def _match_group(item: dict[str, Any], catalog: list[dict[str, Any]], mappings: list[dict[str, Any]]) -> tuple[str | None, float]:
  for m in mappings:
    if _norm(m["sourceMaterial"]) == _norm(item["material"]):
      return m["catalogItemId"], 1.0
  name = _norm(item["material"])
  code = _norm(item.get("code"))
  best_id = None
  best_score = 0.0
  for c in catalog:
    score = 0.0
    c_name = _norm(c["name"])
    c_code = _norm(c["code"])
    if code and code.replace(" ", "") in c_code.replace(" ", ""):
      score += 0.65
    if name and any(token in c_name for token in name.split()[:3]):
      score += 0.35
    if score > best_score:
      best_score = score
      best_id = c["id"]
  return best_id, round(best_score, 2)


def _price_for_item(item: dict[str, Any], catalog_item: dict[str, Any] | None) -> float:
  if not catalog_item:
    return 0.0
  if catalog_item["type"] == "board":
    return round(item["areaM2Total"] * float(catalog_item.get("pricePerM2", 0)), 2)
  if catalog_item["type"] == "edgeband":
    return round(item["edgeMTotal"] * float(catalog_item.get("pricePerM", 0)), 2)
  return round(item["qtyTotal"] * float(catalog_item.get("pricePerUnit", 0)), 2)


def _gemini_enabled() -> bool:
  return bool(os.getenv("GEMINI_API_KEY", "").strip())


def _image_mode() -> str:
  mode = os.getenv("GEMINI_IMAGE_MODE", "fast").strip().lower()
  return mode if mode in {"fast", "premium"} else "fast"


def _image_model_for_mode(mode: str | None = None) -> str:
  resolved_mode = (mode or _image_mode()).strip().lower()
  if resolved_mode == "premium":
    return os.getenv("GEMINI_IMAGE_MODEL_PREMIUM", "gemini-2.5-pro")
  return os.getenv("GEMINI_IMAGE_MODEL_FAST", "gemini-2.5-flash")


async def _gemini_simple_score(material: str, candidates: list[dict[str, Any]]) -> dict[str, Any] | None:
  key = os.getenv("GEMINI_API_KEY", "").strip()
  model = os.getenv("GEMINI_MODEL_FAST", "gemini-2.5-flash")
  if not key:
    return None
  
  # Ensure model string doesn't have redundant models/ prefix if we append it to path
  safe_model = model.replace("models/", "")
  endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{safe_model}:generateContent"
  prompt = {
    "contents": [
      {
        "parts": [
          {
            "text": (
              "Choose best catalog id for material. Return JSON with keys catalogItemId and confidence (0..1). "
              f"Material: {material}. Candidates: {json.dumps(candidates, ensure_ascii=False)}"
            )
          }
        ]
      }
    ]
  }
  try:
    async with httpx.AsyncClient(timeout=8.0) as client:
      resp = await client.post(endpoint, params={"key": key}, json=prompt)
      if resp.status_code >= 300:
        return None
      text = json.dumps(resp.json(), ensure_ascii=False)
      match = re.search(r'\"catalogItemId\"\s*:\s*\"([^\"]+)\"', text)
      conf = re.search(r'\"confidence\"\s*:\s*([0-9.]+)', text)
      if not match:
        return None
      return {
        "catalogItemId": match.group(1),
        "confidence": min(max(float(conf.group(1)) if conf else 0.5, 0.0), 1.0),
      }
  except Exception:
    return None


async def _gemini_salex_pick(
  code: str,
  material_hint: str | None,
  candidates: list[dict[str, Any]],
) -> dict[str, Any] | None:
  key = os.getenv("GEMINI_API_KEY", "").strip()
  model = os.getenv("GEMINI_MODEL_FLAGSHIP", "gemini-2.5-pro").strip()
  if not key or not candidates:
    return None
  
  safe_model = model.replace("models/", "")
  endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{safe_model}:generateContent"
  compact_code = code.replace(" ", "").lower()
  prompt = (
    "You are validating e-commerce product matches for Salex.bg. "
    "sourceUrl (string), name (string), code (string), exactMatch (boolean), "
    "priceEur (number), sizes (array of strings), imageUrl (string), confidence (0..1). "
    "Rules: exactMatch=true ONLY if the exact code is clearly present in the product text/title/url. "
    "If not exact, still return the best candidate with exactMatch=false. "
    f"Target code: {code} (compact: {compact_code}). Material hint: {material_hint or ''}. "
    f"Candidates: {json.dumps(candidates, ensure_ascii=False)}"
  )
  req = {"contents": [{"parts": [{"text": prompt}]}]}
  try:
    async with httpx.AsyncClient(timeout=20.0) as client:
      resp = await client.post(endpoint, params={"key": key}, json=req)
      if resp.status_code >= 300:
        return None
      blob = json.dumps(resp.json(), ensure_ascii=False)
      match = re.search(r"\{[\s\S]*\"sourceUrl\"[\s\S]*\}", blob)
      if not match:
        return None
      data = json.loads(match.group(0))
      src = str(data.get("sourceUrl") or "").strip()
      if not src:
        return None
      return {
        "supplier": "salex",
        "sourceUrl": _abs_salex_url(src),
        "code": str(data.get("code") or code).strip(),
        "name": str(data.get("name") or code).strip(),
        "priceEur": float(data.get("priceEur") or 0.0),
        "sizes": [str(x).strip() for x in (data.get("sizes") or []) if str(x).strip()][:8],
        "imageUrl": _abs_salex_url(str(data.get("imageUrl") or "").strip()),
        "score": float(data.get("confidence") or 0.0),
        "exactMatch": bool(data.get("exactMatch")),
        "fetchedAt": _now(),
      }
  except Exception:
    return None


def _extract_price_eur(text: str) -> float | None:
  m = re.search(r"(\d+(?:[.,]\d{1,2})?)\s*(?:\u20ac|EUR|\u0435\u0432\u0440\u043e)\.?", text, re.IGNORECASE)
  if not m:
    return None
  return _to_float(m.group(1), 0.0)


def _extract_possible_sizes(text: str) -> list[str]:
  clean = re.sub(r"\s+", " ", text)
  out: list[str] = []
  patterns = [
    r"\b\d{2,4}\s*[xх*]\s*\d{2,4}(?:\s*[xх*]\s*\d{1,3})?\s*мм?\b",
    r"\b\d{2,4}\s*[xх*]\s*\d{2,4}(?:\s*[xх*]\s*\d{1,3})?\s*cm\b",
    r"\b\d{2,4}\s*[xх*]\s*\d{2,4}(?:\s*[xх*]\s*\d{1,3})?\b",
    r"\bдебелина\s*\d{1,3}\s*мм\b",
    r"\bthickness\s*\d{1,3}\s*mm\b",
  ]
  for pattern in patterns:
    for m in re.finditer(pattern, clean, re.IGNORECASE):
      token = m.group(0).strip()
      if token and token not in out:
        out.append(token)
  return out[:8]


def _parse_price_from_doc(doc: BeautifulSoup, fallback_text: str) -> float:
  selectors = [
    ".price .woocommerce-Price-amount",
    ".woocommerce-Price-amount",
    "[itemprop='price']",
    ".product .price",
  ]
  for sel in selectors:
    node = doc.select_one(sel)
    if not node:
      continue
    price = _extract_price_eur(node.get_text(" ", strip=True))
    if price and price > 0:
      return price
  return _extract_price_eur(fallback_text) or 0.0


def _abs_salex_url(src: str | None) -> str:
  value = (src or "").strip()
  if not value:
    return ""
  if value.startswith("//"):
    return f"https:{value}"
  if value.startswith("/"):
    return f"https://salex.bg{value}"
  return value


def _is_bad_product_image(url: str | None) -> bool:
  u = (url or "").strip().lower()
  if not u:
    return True
  blocked = ["logo", "icon", "favicon", "placeholder", "no-image", "spacer"]
  return any(x in u for x in blocked)


def _looks_like_product_link(url: str, code: str) -> bool:
  u = (url or "").lower()
  if not u or "salex.bg" not in u:
    return False
  bad = ["/cart", "/checkout", "/my-account", "/wishlist", "/blog", "/tag/", "/category/", "/product-category/"]
  if any(x in u for x in bad):
    return False
  compact_code = code.lower().replace(" ", "")
  if compact_code and compact_code in u.replace(" ", ""):
    return True
  return "/product/" in u or "/shop/" in u or "/?product" in u


async def _salex_lookup_by_code(code: str, material_hint: str | None = None) -> dict[str, Any] | None:
  code = (code or "").strip().upper()
  if not code:
    return None
  compact_code = code.replace(" ", "").lower()
  search_url = f"https://salex.bg/?s={code}"
  headers = {"User-Agent": "Mozilla/5.0 STAIPOAI/1.0"}
  try:
    async with httpx.AsyncClient(timeout=12.0, follow_redirects=True) as client:
      resp = await client.get(search_url, headers=headers)
      if resp.status_code >= 300:
        return None
      html = resp.text
  except Exception:
    return None

  soup = BeautifulSoup(html, "lxml")
  links: list[str] = []
  # Prefer search-result product cards first.
  for card in soup.select("li.product a[href], .products a[href], .product a[href], article a[href]"):
    href = _abs_salex_url(card.get("href"))
    if href and href not in links and "salex.bg" in href:
      links.append(href)
  for a in soup.select("a[href]"):
    href = (a.get("href") or "").strip()
    if not href:
      continue
    if href.startswith("/"):
      href = f"https://salex.bg{href}"
    if "salex.bg" not in href:
      continue
    if href not in links:
      links.append(href)

  product_links = [href for href in links if _looks_like_product_link(href, code)][:20]
  if not product_links:
    # fallback: try first reasonable links from search page
    product_links = [href for href in links if "/?s=" not in href and "/search" not in href][:8]
  if not product_links:
    return {
      "supplier": "salex",
      "sourceUrl": search_url,
      "code": code,
      "name": code,
      "priceBgn": 0.0,
      "imageUrl": "",
      "score": 0.0,
      "fetchedAt": _now(),
    }

  best: dict[str, Any] | None = None
  best_score = -1.0
  exact_found = False
  gemini_candidates: list[dict[str, Any]] = []
  async with httpx.AsyncClient(timeout=12.0, follow_redirects=True) as client:
    for url in product_links:
      try:
        page_resp = await client.get(url, headers=headers)
        if page_resp.status_code >= 300:
          continue
      except Exception:
        continue
      doc = BeautifulSoup(page_resp.text, "lxml")
      title = (doc.title.string if doc.title and doc.title.string else "").strip()
      text = doc.get_text(" ", strip=True)[:6000]
      page_blob = f"{title} {text}"
      code_found = _extract_material_code(page_blob) or code
      compact_page = page_blob.replace(" ", "").lower()
      exact_code_in_page = bool(compact_code and compact_code in compact_page)
      price_bgn = _parse_price_from_doc(doc, text)
      sizes = _extract_possible_sizes(text)
      image = ""
      image_candidates: list[str] = []
      og_img = doc.select_one("meta[property='og:image']")
      if og_img and og_img.get("content"):
        image_candidates.append(_abs_salex_url(og_img.get("content")))
      for selector in [
        "meta[property='og:image:secure_url']",
        "img.wp-post-image",
        ".woocommerce-product-gallery__image img",
        ".product img",
        "img[src]",
      ]:
        node = doc.select_one(selector)
        if not node:
          continue
        src = node.get("content") if node.name == "meta" else node.get("src")
        image_candidates.append(_abs_salex_url(src))
      for candidate_image in image_candidates:
        if candidate_image and not _is_bad_product_image(candidate_image):
          image = candidate_image
          break
      score = 0.0
      if exact_code_in_page:
        score += 1.0
      elif code.replace(" ", "") in code_found.replace(" ", ""):
        score += 0.35
      if material_hint and _norm(material_hint):
        first = _norm(material_hint).split(" ")[0]
        if first and first in _norm(text):
          score += 0.2
      candidate = {
        "supplier": "salex",
        "sourceUrl": url,
        "code": code_found,
        "name": title or code_found,
        "priceEur": price_eur,
        "sizes": sizes,
        "imageUrl": image,
        "score": round(score, 2),
        "exactMatch": exact_code_in_page,
        "fetchedAt": _now(),
      }
      gemini_candidates.append(
        {
          "sourceUrl": url,
          "title": title,
          "codeFound": code_found,
          "priceBgn": price_bgn,
          "sizes": sizes,
          "imageUrl": image,
          "excerpt": text[:1200],
          "exactMatchHint": exact_code_in_page,
        }
      )
      if score > best_score:
        best = candidate
        best_score = score
      if exact_code_in_page:
        exact_found = True
  if best and exact_found and best.get("exactMatch"):
    return best

  # Gemini-first fallback: choose best product and extract normalized fields.
  if gemini_pick:
    if not gemini_pick.get("priceEur") and best and best.get("priceEur"):
      gemini_pick["priceEur"] = best.get("priceEur")
    if not gemini_pick.get("imageUrl") and best and best.get("imageUrl"):
      gemini_pick["imageUrl"] = best.get("imageUrl")
    if not gemini_pick.get("sizes") and best and best.get("sizes"):
      gemini_pick["sizes"] = best.get("sizes")
    return gemini_pick

  return {
    "supplier": "salex",
    "sourceUrl": search_url,
    "code": code,
    "name": code,
    "priceEur": 0.0,
    "sizes": [],
    "imageUrl": "",
    "score": 0.0,
    "exactMatch": False,
    "fetchedAt": _now(),
  }


def _recompute_row_metrics(row: dict[str, Any]) -> dict[str, Any]:
  qty = max(int(row.get("qty", 1) or 1), 1)
  length = float(row.get("lengthMm", 0) or 0)
  width = float(row.get("widthMm", 0) or 0)
  edge = (row.get("edgeRaw", "") or "").strip()
  area_m2 = round((length * width * qty) / 1_000_000, 4)
  edge_m = round(((2 * (length + width)) * qty) / 1000, 3) if edge else 0.0
  row["areaM2"] = area_m2
  row["edgeM"] = edge_m
  row["qty"] = qty
  return row


async def _gemini_repair_rows(raw_rows: list[dict[str, str]], normalized_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
  key = os.getenv("GEMINI_API_KEY", "").strip()
  model = os.getenv("GEMINI_MODEL_FAST", "gemini-2.5-flash")
  if not key or not normalized_rows:
    return normalized_rows

  weak_ids: list[int] = []
  for row in normalized_rows:
    if (
      not row.get("materialRaw")
      or float(row.get("lengthMm", 0) or 0) <= 0
      or float(row.get("widthMm", 0) or 0) <= 0
      or float(row.get("thicknessMm", 0) or 0) <= 0
    ):
      weak_ids.append(int(row["rowId"]))
  if not weak_ids:
    return normalized_rows

  payload_rows = []
  for rid in weak_ids[:60]:
    src = raw_rows[rid - 1] if 0 <= rid - 1 < len(raw_rows) else {}
    payload_rows.append({"rowId": rid, "raw": src})

  prompt = (
    "You repair furniture cut-list rows from PRO100 exports. "
    "Return ONLY JSON object with key 'rows' -> array of objects: "
    "{rowId:int, partName:str, materialRaw:str, code:str, lengthMm:number, widthMm:number, thicknessMm:number, qty:int, edgeRaw:str}. "
    "Use 0 only when unknown. Keep dimensions in millimeters. "
    f"Rows: {json.dumps(payload_rows, ensure_ascii=False)}"
  )
  endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
  req = {"contents": [{"parts": [{"text": prompt}]}]}

  try:
    async with httpx.AsyncClient(timeout=15.0) as client:
      resp = await client.post(endpoint, params={"key": key}, json=req)
      if resp.status_code >= 300:
        return normalized_rows
      blob = json.dumps(resp.json(), ensure_ascii=False)
      match = re.search(r"\{[\s\S]*\"rows\"[\s\S]*\}", blob)
      if not match:
        return normalized_rows
      parsed = json.loads(match.group(0))
      repaired = parsed.get("rows", [])
  except Exception:
    return normalized_rows

  by_id = {int(r["rowId"]): r for r in normalized_rows}
  for fix in repaired:
    try:
      rid = int(fix.get("rowId"))
      if rid not in by_id:
        continue
      target = by_id[rid]
      if fix.get("materialRaw"):
        target["materialRaw"] = _normalize_material_name(str(fix["materialRaw"]))
      if fix.get("code"):
        target["code"] = str(fix["code"]).strip().upper()
      if fix.get("partName"):
        target["partName"] = str(fix["partName"]).strip()
      for key_num, field in [("lengthMm", "lengthMm"), ("widthMm", "widthMm"), ("thicknessMm", "thicknessMm")]:
        val = _to_float(str(fix.get(key_num, "")), 0.0)
        if val > 0:
          target[field] = val
      qty_val = int(_to_float(str(fix.get("qty", "")), 1))
      target["qty"] = max(qty_val, 1)
      if fix.get("edgeRaw") is not None:
        target["edgeRaw"] = str(fix.get("edgeRaw") or "").strip()
      if not target.get("code"):
        target["code"] = _extract_material_code(target.get("materialRaw", "") or "") or ""
      _recompute_row_metrics(target)
    except Exception:
      continue

  return normalized_rows


class ProjectCreate(BaseModel):
  name: str
  clientName: str | None = None
  workspaceName: str = "По подразбиране"
  userId: str | None = None
  workspaceId: str | None = None
  clientId: str | None = None
  description: str | None = None


class ProjectStageUpdate(BaseModel):
  stage: str

class ClientCreate(BaseModel):
  workspaceId: str
  name: str
  contactEmail: str | None = None
  contactPhone: str | None = None
  notes: str | None = None


class WorkspaceCreate(BaseModel):
  name: str
  ownerId: str



class MappingIn(BaseModel):
  sourceMaterial: str
  catalogItemId: str


class OfferCreateIn(BaseModel):
  uploadId: str
  marginPct: float = Field(default=0.2, ge=0.0, le=2.0)
  laborPct: float = Field(default=0.25, ge=0.0, le=2.0)
  wastePct: float = Field(default=0.15, ge=0.0, le=2.0)
  transportCost: float = Field(default=40.0, ge=0.0)
  installationCost: float = Field(default=0.0, ge=0.0)
  otherCost: float = Field(default=0.0, ge=0.0)
  otherDescription: str = ""


class PriceOverrideIn(BaseModel):
  key: str
  priceEur: float = Field(gt=0)
  sourceUrl: str | None = None
  supplier: str = "salex"


class TrashBulkIn(BaseModel):
  projectIds: list[str] = Field(default_factory=list)
  action: str = Field(default="restore")


class MasterProfileIn(BaseModel):
  userId: str
  companyName: str | None = None
  ownerName: str | None = None
  vatNumber: str | None = None
  address: str | None = None
  phone: str | None = None
  email: str | None = None
  logoUrl: str | None = None
  website: str | None = None
  bio: str | None = None
  defaultDailyRate: float = 0.0
  defaultMarkupPct: float = 0.2
  bankIban: str | None = None
  bankName: str | None = None


class QuickOfferItem(BaseModel):
  material: str
  code: str | None = None
  qty: float
  unit: str = "бр"
  priceEur: float | None = None

class QuickOfferIn(BaseModel):
  userId: str
  workspaceId: str
  items: list[QuickOfferItem]


class OfferCommentIn(BaseModel):
  author: str # 'master' or 'client'
  text: str

class OfferAlternativeSelectIn(BaseModel):
  lineKey: str
  catalogItemId: str
  priceEur: float


class ClientApproveIn(BaseModel):
  ip: str = ""
  userAgent: str = ""


@app.get("/v1/profile")
def get_profile(userId: str):
  res = get_supabase_admin().table("masterProfiles").select("*").eq("userId", userId).execute()
  if not res.data:
    return {"profile": None}
  return {"profile": res.data[0]}


@app.post("/v1/profile")
def upsert_profile(payload: MasterProfileIn):
  now = _now()
  data = payload.model_dump()
  data["updatedAt"] = now
  # Check if exists
  existing = get_supabase_admin().table("masterProfiles").select("userId").eq("userId", payload.userId).execute()
  if existing.data:
    get_supabase_admin().table("masterProfiles").update(data).eq("userId", payload.userId).execute()
  else:
    data["createdAt"] = now
    get_supabase_admin().table("masterProfiles").insert(data).execute()
  return {"ok": True, "userId": payload.userId}


@app.get("/health")
def health():
  return {"ok": True, "service": "staipo-ai-data", "time": _now(), "geminiEnabled": _gemini_enabled()}


@app.get("/v1/supabase/health")
def supabase_health():
  try:
    _ = get_supabase_admin()
  except SupabaseConfigError as e:
    return {
      "configured": False,
      "error": str(e),
      "uploadsBucket": bucket_uploads(),
      "offersBucket": bucket_offers(),
    }
  return {
    "configured": True,
    "uploadsBucket": bucket_uploads(),
    "offersBucket": bucket_offers(),
  }


@app.post("/v1/catalog/seed-salex")
def seed_salex():
  # Assuming seeding is done. To implement properly, insert catalog logic here.
  return {"inserted": 0, "total": 0}


@app.get("/v1/catalog/search")
def search_catalog(q: str = "", limit: int = 20):
  ql = _norm(q)
  query = get_supabase_admin().table("catalog").select("*")
  if ql:
    query = query.ilike("name", f"%{ql}%")
  res = query.limit(limit).execute()
  return {"items": res.data}


@app.get("/v1/salex/lookup")
async def salex_lookup(code: str, material: str | None = None, force: bool = False):
  key = code.strip().upper()
  if not key:
    raise HTTPException(status_code=400, detail="Кодът е задължителен")
  
  if not force:
    res = get_supabase_admin().table("salexCache").select("data").eq("code", key).execute()
    if res.data:
      return {"item": res.data[0]["data"], "cached": True}

  found = await _salex_lookup_by_code(key, material)
  if not found:
    return {"item": None, "cached": False}
  
  get_supabase_admin().table("salexCache").upsert({"code": key, "data": found}).execute()
  return {"item": found, "cached": False}


@app.get("/v1/projects")
def list_projects(user_id: str | None = None, workspace_id: str | None = None):
  query = get_supabase_admin().table("projects").select("*").is_("trashedAt", "null").eq("saved", True)
  if user_id:
    query = query.eq("userId", user_id)
  if workspace_id:
    query = query.eq("workspaceId", workspace_id)
  res = query.order("createdAt", desc=True).execute()
  return {"items": res.data}


@app.get("/v1/workspaces")
def list_workspaces(owner_id: str | None = None):
  query = get_supabase_admin().table("workspaces").select("*")
  if owner_id:
    query = query.eq("ownerId", owner_id)
  res = query.execute()
  return {"items": res.data}


@app.post("/v1/workspaces")
def create_workspace(payload: WorkspaceCreate):
  admin = get_supabase_admin()
  
  # Auto-heal missing profile entry that prevents workspace creation due to FK constraints
  try:
    admin.table("profiles").upsert({"id": payload.ownerId}).execute()
  except Exception:
    pass

  try:
    res = admin.table("workspaces").insert({
      "name": payload.name.strip(),
      "ownerId": payload.ownerId
    }).execute()
    if res.data:
      return res.data[0]
    return {"error": "Failed to create workspace"}
  except Exception as e:
    from fastapi import HTTPException
    raise HTTPException(status_code=400, detail=str(e))


@app.get("/v1/clients")
def list_clients(workspace_id: str | None = None):
  query = get_supabase_admin().table("clients").select("*")
  if workspace_id:
    query = query.eq("workspaceId", workspace_id)
  res = query.execute()
  return {"items": res.data}


@app.post("/v1/clients")
def create_client(payload: ClientCreate):
  client_data = {
    "workspaceId": payload.workspaceId,
    "name": payload.name.strip(),
    "contactEmail": payload.contactEmail,
    "contactPhone": payload.contactPhone,
    "notes": payload.notes
  }
  res = get_supabase_admin().table("clients").insert(client_data).execute()
  if res.data:
    return res.data[0]
  return {"error": "Failed to create client"}



@app.get("/v1/projects/trash")
def list_projects_trash(workspace_id: str | None = None):
  query = get_supabase_admin().table("projects").select("*").not_.is_("trashedAt", "null")
  if workspace_id:
    query = query.eq("workspaceId", workspace_id)
  res = query.order("trashedAt", desc=True).execute()
  return {"items": res.data}



@app.get("/v1/stats")
def get_stats():
  p_res = get_supabase_admin().table("projects").select("id, stage").is_("trashedAt", "null").eq("saved", True).execute()
  u_res = get_supabase_admin().table("uploads").select("id", count="exact").execute()
  o_res = get_supabase_admin().table("offers").select("status, totals").execute()
  nr_res = get_supabase_admin().table("grouped").select("id", count="exact").eq("matchStatus", "needs-review").execute()
  
  projects_count = len(p_res.data) if p_res.data else 0
  pipeline_distribution = {}
  if p_res.data:
    for p in p_res.data:
      stage = p.get("stage") or "lead"
      pipeline_distribution[stage] = pipeline_distribution.get(stage, 0) + 1
      
  total_revenue = 0.0
  approved_offers = 0
  if o_res.data:
    for o in o_res.data:
        if o.get("status") == "approved":
            approved_offers += 1
            totals = o.get("totals") or {}
            total_revenue += float(totals.get("total", 0))
            
  offers_count = len(o_res.data) if o_res.data else 0
  success_rate = round((approved_offers / offers_count * 100), 1) if offers_count > 0 else 0.0

  return {
    "projects": projects_count,
    "uploads": u_res.count or 0,
    "offers": offers_count,
    "needsReview": nr_res.count or 0,
    "revenue": total_revenue,
    "successRate": success_rate,
    "pipeline": pipeline_distribution
  }


@app.post("/v1/projects")
def create_project(payload: ProjectCreate):
  project = {
    "id": str(uuid.uuid4()),
    "name": payload.name.strip(),
    "clientName": payload.clientName,
    "workspaceName": payload.workspaceName.strip() or "По подразбиране",
    "saved": False,
    "userId": payload.userId,
    "workspaceId": payload.workspaceId,
    "clientId": payload.clientId,
    "description": payload.description,
  }
  res = get_supabase_admin().table("projects").insert(project).execute()
  if res.data:
    _log_activity(payload.userId, "PROJECT_CREATED", "projects", res.data[0]["id"], payload.workspaceId)
    return res.data[0]
  return project



@app.get("/v1/projects/{project_id}")
def get_project(project_id: str):
  project = _find_project(project_id)
  if not project or _is_project_trashed(project):
    raise HTTPException(status_code=404, detail="Проектът не е намерен")
  uploads = get_supabase_admin().table("uploads").select("*").eq("projectId", project_id).execute().data
  return {"project": project, "uploads": uploads}


@app.post("/v1/projects/{project_id}/save")
def save_project(project_id: str, payload: dict[str, Any] | None = None):
  project = _find_project(project_id)
  if not project or _is_project_trashed(project):
    raise HTTPException(status_code=404, detail="Проектът не е намерен")
  
  saved_at = _now()
  upd = {"saved": True, "savedAt": saved_at}
  if payload:
      # Allow updating description or aiInsights during save
      if "description" in payload: upd["description"] = payload["description"]
      if "aiInsights" in payload: upd["aiInsights"] = payload["aiInsights"]
      if "status" in payload: upd["status"] = payload["status"]

  get_supabase_admin().table("projects").update(upd).eq("id", project_id).execute()
  _log_activity(project.get("userId"), "PROJECT_SAVED", "projects", project_id, project.get("workspaceId"))
  return {"ok": True, "projectId": project_id, "saved": True, "savedAt": saved_at}


@app.post("/v1/projects/{project_id}/discard")
def discard_project(project_id: str):
  project = _find_project(project_id)
  if not project:
    return {"ok": True, "message": "Проектът вече не съществува"}
  
  # Only discard if not officially saved yet
  if not bool(project.get("saved", False)):
      _hard_delete_project(project_id)
      return {"ok": True, "discarded": True}
  
  return {"ok": True, "discarded": False, "message": "Записани проекти не могат да се 'отхвърлят' по този начин"}


@app.patch("/v1/projects/{project_id}/stage")
def update_project_stage(project_id: str, payload: ProjectStageUpdate):
  project = _find_project(project_id)
  if not project or _is_project_trashed(project):
    raise HTTPException(status_code=404, detail="Проектът не е намерен")
  
  updated_at = _now()
  # Update stage and stageUpdatedAt
  get_supabase_admin().table("projects").update({
    "stage": payload.stage, 
    "stageUpdatedAt": updated_at
  }).eq("id", project_id).execute()
  
  _log_activity(project.get("userId"), f"PROJECT_STAGE_CHANGED_TO_{payload.stage.upper()}", "projects", project_id, project.get("workspaceId"))
  return {"ok": True, "projectId": project_id, "stage": payload.stage, "stageUpdatedAt": updated_at}


@app.delete("/v1/projects/{project_id}")
def delete_project(project_id: str, permanent: bool = False):
  project = _find_project(project_id)
  if not project:
    raise HTTPException(status_code=404, detail="Проектът не е намерен")
  if permanent:
    if not _is_project_trashed(project) and bool(project.get("saved", False)):
      raise HTTPException(status_code=400, detail="Първо премести проекта в кошчето")
    _log_activity(project.get("userId"), "PROJECT_DELETED_PERMANENT", "projects", project_id, project.get("workspaceId"))
    deleted_uploads = _hard_delete_project(project_id)
    return {"ok": True, "deletedProjectId": project_id, "deletedUploads": deleted_uploads, "permanent": True}

  if _is_project_trashed(project):
    return {"ok": True, "deletedProjectId": project_id, "trashedAt": project.get("trashedAt"), "alreadyTrashed": True}

  trashed = _now()
  get_supabase_admin().table("projects").update({"trashedAt": trashed}).eq("id", project_id).execute()
  _log_activity(project.get("userId"), "PROJECT_TRASHED", "projects", project_id, project.get("workspaceId"))
  return {"ok": True, "deletedProjectId": project_id, "trashedAt": trashed, "permanent": False}



@app.post("/v1/projects/{project_id}/restore")
def restore_project(project_id: str):
  res = get_supabase_admin().table("projects").select("*").eq("id", project_id).single().execute()
  project = res.data
  if not project:
    raise HTTPException(status_code=404, detail="Проектът не е намерен")
  if not _is_project_trashed(project):
    return {"ok": True, "restoredProjectId": project_id, "alreadyActive": True}
  get_supabase_admin().table("projects").update({"trashedAt": None}).eq("id", project_id).execute()
  return {"ok": True, "restoredProjectId": project_id}


@app.post("/v1/projects/trash/bulk")
def bulk_trash_action(payload: TrashBulkIn):
  ids = [x for x in payload.projectIds if x]
  if not ids:
    raise HTTPException(status_code=400, detail="Няма избрани проекти")
  action = (payload.action or "").strip().lower()
  if action not in {"restore", "delete"}:
    raise HTTPException(status_code=400, detail="Невалидно действие")

  restored = 0
  deleted = 0
  for project_id in ids:
    res = get_supabase_admin().table("projects").select("*").eq("id", project_id).single().execute()
    project = res.data
    if not project:
      continue
    if action == "restore":
      if _is_project_trashed(project):
        get_supabase_admin().table("projects").update({"trashedAt": None}).eq("id", project_id).execute()
        restored += 1
    else:
      if _is_project_trashed(project):
        _hard_delete_project(project_id)
        deleted += 1

  return {"ok": True, "action": action, "restored": restored, "deleted": deleted}


@app.post("/v1/projects/trash/empty")
def empty_trash():
  res = get_supabase_admin().table("projects").select("id").not_.is_("trashedAt", "null").execute()
  trashed_ids = [p["id"] for p in res.data]
  deleted = 0
  for project_id in trashed_ids:
    _hard_delete_project(project_id)
    deleted += 1
  return {"ok": True, "deletedProjects": deleted}


@app.post("/v1/projects/{project_id}/photos")
async def upload_project_photo(project_id: str, file: UploadFile = File(...)):
  project = _find_project(project_id)
  if not project:
     raise HTTPException(status_code=404, detail="Проектът не е намерен")
  
  ensure_bucket_exists(bucket_uploads())
  
  photo_id = str(uuid.uuid4())
  ext = (file.filename or "").split(".")[-1] if file.filename else "jpg"
  
  # Workspace ID fallback to ensure path integrity
  ws_id = project.get("workspaceId") or project.get("workspaceName") or "default"
  path = f"{ws_id}/{project_id}/photos/{photo_id}.{ext}"
  
  content = await file.read()
  
  try:
      # Upload to Supabase Storage
      res = get_supabase_admin().storage.from_(bucket_uploads()).upload(
          path=path,
          file=content,
          file_options={"content-type": file.content_type or "image/jpeg"}
      )
      # Note: Supabase Python client raises issues sometimes or returns a response. 
      # We check for basic existence of the result.
      if not res:
          raise Exception("Празен отговор от Supabase Storage")
  except Exception as e:
      logger.error(f"Supabase Storage Upload Error: {e}")
      raise HTTPException(status_code=500, detail=f"Грешка при качване на файла: {str(e)}")
  
  url = get_supabase_admin().storage.from_(bucket_uploads()).get_public_url(path)
  
  # Insert into projectPhotos table
  photo_record = {
    "id": photo_id,
    "projectId": project_id,
    "originalUrl": url,
    "createdAt": _now()
  }
  get_supabase_admin().table("projectPhotos").insert(photo_record).execute()
  
  # For the response, map back to generic 'url'
  resp_photo = {**photo_record, "url": url}
  
  _log_activity(project.get("userId"), "PHOTO_UPLOADED", "projects", project_id, project.get("workspaceId"))
  return {"ok": True, "photo": resp_photo}


@app.delete("/v1/photos/{photo_id}")
async def delete_photo(photo_id: str):
  res = get_supabase_admin().table("projectPhotos").select("*").eq("id", photo_id).execute()
  if not res.data:
    raise HTTPException(status_code=404, detail="Снимката не е намерена")
  
  photo = res.data[0]
  url = photo.get("originalUrl")
  path = _extract_storage_path(url, bucket_uploads()) if url else None
  
  # 1. Delete from Storage if path exists
  if path:
      try:
          get_supabase_admin().storage.from_(bucket_uploads()).remove([path])
      except Exception as e:
          logger.warning(f"Failed to remove file from storage: {e}")

  # 2. Delete from Database
  get_supabase_admin().table("projectPhotos").delete().eq("id", photo_id).execute()
  
  return {"ok": True}

@app.post("/v1/photos/{photo_id}/analyze")
async def analyze_photo(photo_id: str):
  res = get_supabase_admin().table("projectPhotos").select("*").eq("id", photo_id).execute()
  if not res.data:
    raise HTTPException(status_code=404, detail="Снимката не е намерена")
  photo = res.data[0]
  
  if not _gemini_enabled():
    raise HTTPException(status_code=400, detail="Gemini не е конфигуриран")
    
  import google.generativeai as genai
  api_key = os.environ.get("GEMINI_API_KEY")
  client = genai.Client(api_key=api_key)
  
  # Fetch image bytes
  import httpx
  async with httpx.AsyncClient() as hc:
    r = await hc.get(photo["originalUrl"])
    if r.status_code != 200:
       raise HTTPException(status_code=400, detail="Грешка при изтегляне на снимката")
    image_bytes = r.content
    
  try:
    response = client.models.generate_content(
      model=_image_model_for_mode(),
      contents=[
          "Анализирай тази интериорна/мебелна снимка. Какъв стил е? Какви са основните цветове и материали? (Напиши го в 2-3 изречения на български).",
          {"mime_type": "image/jpeg", "data": image_bytes}
      ]
    )
    analysis = response.text.strip()
    
    # Save back
    get_supabase_admin().table("projectPhotos").update({"aiStyle": {"description": analysis}}).eq("id", photo_id).execute()
    return {"ok": True, "analysis": analysis}
  except Exception as e:
    return {"ok": False, "error": str(e)}

@app.get("/v1/projects/{project_id}/photos")
def list_project_photos(project_id: str):
  res = get_supabase_admin().table("projectPhotos").select("*").eq("projectId", project_id).order("createdAt", desc=True).execute()
  items = []
  if res.data:
      for r in res.data:
          # Map originalUrl to url for frontend compatibility
          r["url"] = r.get("originalUrl")
          items.append(r)
  return {"items": items}


@app.post("/v1/projects/{project_id}/ai-studio")
async def ai_studio_analysis(project_id: str, mode: str = "style"):
  """Comprehensive Project Analysis using all uploaded photos."""
  photos = list_project_photos(project_id)["items"]
  if not photos:
      raise HTTPException(status_code=400, detail="Няма качени снимки за анализ")
  
  if not _gemini_enabled():
      raise HTTPException(status_code=400, detail="Gemini не е конфигуриран")

  # Master Prompts
  prompts = {
      "style": "Анализирай тези снимки на интериор/мебели като професионален дизайнер. Опиши общия архитектурен стил, цветовата палитра и настроението. Обобщи ги в 3-4 изречения на български.",
      "materials": "Направи детайлен опис на материалите, които виждаш на тези снимки. Търси видове дървесина (дъб, орех), метали, камък, текстил и видове финиши (мат, гланц). Напиши списък на български.",
      "technical": "Направи технически разбор на конструкцията и обкова на тези мебели. Какви механизми виждаш (панти, водачи, дръжки)? Как е организирано пространството? Дай професионално мнение на български за майстор мебелист."
  }
  
  prompt = prompts.get(mode, prompts["style"])
  contents = [prompt]

  # Fetch all images in parallel
  import httpx
  async with httpx.AsyncClient() as hc:
      jobs = [hc.get(p["originalUrl"]) for p in photos[:5]] # Limit to 5 images for speed/tokens
      responses = await asyncio.gather(*jobs)
      for r in responses:
          if r.status_code == 200:
              contents.append({"mime_type": "image/jpeg", "data": r.content})

  # use legacy SDK model initialization (standardized in main.py global scope)
  model_name = _image_model_for_mode("premium")
  model = genai.GenerativeModel(model_name)

  try:
    response = model.generate_content(contents=contents)
    result = response.text.strip()
    
    # Persistent storage in project.aiInsights (with fallback to description)
    try:
        current_project = _find_project(project_id)
        insights = current_project.get("aiInsights") or {}
        if not isinstance(insights, dict): insights = {}
        insights[mode] = result
        
        get_supabase_admin().table("projects").update({"aiInsights": insights}).eq("id", project_id).execute()
    except Exception as e:
        logger.warning(f"Failed to save aiInsights to column: {e}. Falling back to description.")
        # Fallback: append to description
        desc = current_project.get("description") or ""
        new_desc = f"{desc}\n\n[AI {mode.upper()}]: {result}"
        get_supabase_admin().table("projects").update({"description": new_desc.strip()}).eq("id", project_id).execute()

    return {"ok": True, "result": result, "mode": mode}
  except Exception as e:
    return {"ok": False, "error": str(e)}


STYLE_PROMPTS = {
    "scandinavian": "Scandinavian style: Light wood (oak/birch), matte white cabinets, minimalist handles, large windows, natural light, clean functional layout, cozy textures.",
    "industrial": "Industrial style: Exposed brick walls, concrete countertops, black steel accents, dark wood, Edison bulb pendant lighting, raw textures, matte finishes.",
    "minimalist": "Modern Minimalist: Handleless high-gloss white or matte anthracite cabinets, seamless dekton countertops, hidden appliances, monochromatic palette, ultra-clean lines.",
    "farmhouse": "Modern Farmhouse: Shaker-style cabinets, apron-front farmhouse sink, butcher block or marble countertops, barn-style lighting, warm wood accents, classic textures.",
    "japandi": "Japandi: Hybrid of Japanese zen and Scandi. Low profile, sliding elements, bamboo or light ash, earth tones, matte ceramic finishes, organic minimalism.",
    "traditional": "Traditional/Classic: Raised panel cabinets with ornate routing, crown molding, brass or nickel hardware, natural cherry or mahogany wood, granite tops.",
    "transitional": "Transitional: Clean shaker cabinets, quartz countertops, modern industrial lighting, neutral palette, perfect balance of traditional and contemporary elements.",
    "mid-century": "Mid-Century Modern: Tapered legs, geometric tile backsplashes, mustard or teal accents, walnut wood, futuristic 1950s aesthetic.",
    "mediterranean": "Mediterranean: Wrought iron details, terracotta tiles, warm plaster walls, blue accents, arched elements, rustic stone.",
    "hitech": "High-Tech: Glowing LED strips, smart touch panels, integrated stainless steel surfaces, futuristic polished glass, high-contrast cool lighting."
}

@app.post("/v1/projects/{project_id}/visualize")
async def visualize_kitchen_style(project_id: str, photo_id: str, style_key: str, photo_url: str = None):
  """Transforms a kitchen photo into a new style using Nano Banana PRO with zero layout drift."""
  res = get_supabase_admin().table("projectPhotos").select("*").eq("id", photo_id).execute()
  if not res.data:
      raise HTTPException(status_code=404, detail="Снимката не е намерена")
  photo = res.data[0]
  
  style_desc = STYLE_PROMPTS.get(style_key, STYLE_PROMPTS["scandinavian"])
  
  import google.generativeai as genai
  # api_key and genai.configure moved to global scope for stability
  
  # Nano Banana 2 (Gemini 3.1 Flash Image) for native image output
  try:
      model = genai.GenerativeModel("gemini-3.1-flash-image-preview")
  except Exception:
      logger.warning("gemini-3.1-flash-image-preview not found, falling back to gemini-2.5-flash-image")
      model = genai.GenerativeModel("gemini-2.5-flash-image")

  # Fetch image
  import httpx
  try:
      # Use a client with specific timeout and pool limits for Windows local development
      async with httpx.AsyncClient(timeout=45.0, follow_redirects=True, limits=httpx.Limits(max_keepalive_connections=5, max_connections=10)) as hc:
          target_url = photo_url or photo.get("originalUrl") or photo.get("url")
          if not target_url:
              raise Exception("Няма наличен URL адрес за снимката.")
          r = await hc.get(target_url)
          if r.status_code != 200:
              raise Exception(f"Неуспешно изтегляне на снимката ({r.status_code})")
          image_bytes = r.content
  except Exception as e:
      logger.error(f"Image fetch error: {e}")
      return {"ok": False, "error": f"Грешка при изтегляне на снимка: {str(e)}"}

  prompt = (
      f"Acting as a master interior designer, transform this kitchen into the {style_key.upper()} style. "
      "CRITICAL INSTRUCTION: You MUST maintain the EXACT spatial layout, cabinet positioning, faucet position, and architectural structure of the kitchen in the reference image. "
      "Do NOT change the physical footprint. ONLY transform materials, textures, colors, and lighting. "
      f"STYLE SPECIFICATION: {style_desc}"
  )

  try:
    logger.info(f"Starting visualization for project={project_id}, photo={photo_id}, style={style_key}")
    # Use native multimodal generation
    # Nano Banana PRO (Gemini 3 Pro) with image generation modality
    try:
        response = model.generate_content(
            contents=[
                prompt,
                {"mime_type": "image/jpeg", "data": image_bytes}
            ]
        )
    except Exception as ai_err:
        logger.warning(f"Native image generation failed: {ai_err}. Trying fallback model.")
        # Fallback to older image model
        model = genai.GenerativeModel("gemini-2.5-flash-image")
        response = model.generate_content(
            contents=[
                prompt,
                {"mime_type": "image/jpeg", "data": image_bytes}
            ]
        )
    
    # Extract the generated image. Native generation returns it in the parts.
    img_part = next((p for p in response.candidates[0].content.parts if p.inline_data), None)
    if not img_part:
        if response.text:
             logger.error(f"AI returned text instead of image: {response.text}")
             raise Exception(f"AI върна текстово описание вместо изображение: {response.text[:100]}...")
        raise Exception("AI не върна изображение. Проверете наличностите на модела.")

    # Save generated image to Supabase
    import uuid
    filename = f"viz_{uuid.uuid4()}.png"
    storage_path = f"visualizations/{project_id}/{filename}"
    
    upload_res = get_supabase_admin().storage.from_(bucket_uploads()).upload(
        storage_path, img_part.inline_data.data, {"content-type": "image/png"}
    )
    
    viz_url = get_supabase_admin().storage.from_(bucket_uploads()).get_public_url(storage_path)
    
    logger.info(f"Visualization successful: {viz_url}")
    return {"ok": True, "url": viz_url, "style": style_key}
  except Exception as e:
    logger.error(f"Visualization error: {e}", exc_info=True)
    return {"ok": False, "error": str(e)}

@app.post("/v1/pro100/ingest")
async def ingest_pro100(
  file: UploadFile = File(...),
  project_id: str | None = Form(None),
  workspace_name: str = Form("По подразбиране"),
  project_name: str = Form("Untitled Project"),
  client_name: str | None = Form(None),
):
  if project_id:
    project = _find_project(project_id)
    if not project:
      raise HTTPException(status_code=404, detail="Проектът не е намерен")
  else:
    project = {
      "id": str(uuid.uuid4()),
      "name": project_name,
      "clientName": client_name,
      "workspaceName": workspace_name,
      "saved": False,
    }
    get_supabase_admin().table("projects").insert(project).execute()

  upload_id = str(uuid.uuid4())
  content = await file.read()
  
  rows = _parse_csv_content(content)
  normalized = _normalize_rows(rows)
  normalized = await _gemini_repair_rows(rows, normalized)
  grouped = _group_rows(normalized)

  upload = {
    "id": upload_id,
    "projectId": project["id"],
    "filename": file.filename or f"{upload_id}.csv",
    "rawRows": len(rows),
    "normalizedRows": len(normalized),
    "groupedRows": len(grouped),
  }
  get_supabase_admin().table("uploads").insert(upload).execute()
  
  for g in grouped:
      g["uploadId"] = upload_id
      get_supabase_admin().table("grouped").insert(g).execute()

  return {
    "workspaceId": project["workspaceName"],
    "projectId": project["id"],
    "uploadId": upload_id,
    "workspaceName": project["workspaceName"],
    "projectName": project["name"],
    "clientName": project["clientName"],
    "rawRows": len(rows),
    "normalizedRows": len(normalized),
    "groupedRows": len(grouped),
  }


@app.get("/v1/uploads/{upload_id}/grouped")
def grouped(upload_id: str):
  upload = _find_upload(upload_id)
  if not upload:
    raise HTTPException(status_code=404, detail="Каченият файл не е намерен")
  res = get_supabase_admin().table("grouped").select("*").eq("uploadId", upload_id).execute()
  return {"items": res.data}


@app.get("/v1/uploads/{upload_id}/salex-resolved-table")
def get_resolved_table(upload_id: str):
  upload = _find_upload(upload_id)
  if not upload:
    raise HTTPException(status_code=404, detail="Каченият файл не е намерен")
  res = get_supabase_admin().table("resolvedTables").select("data").eq("uploadId", upload_id).execute()
  return {"resolved": res.data[0]["data"] if res.data else None}


@app.post("/v1/uploads/{upload_id}/salex-resolve-table")
async def resolve_table(upload_id: str, force: bool = False):
  upload = _find_upload(upload_id)
  if not upload:
    raise HTTPException(status_code=404, detail="Каченият файл не е намерен")

  if not force:
    res = get_supabase_admin().table("resolvedTables").select("data").eq("uploadId", upload_id).execute()
    if res.data:
      return {"resolved": res.data[0]["data"], "cached": True}

  grouped_items = get_supabase_admin().table("grouped").select("*").eq("uploadId", upload_id).execute().data
  status_data = {
    "running": True,
    "processed": 0,
    "total": len(grouped_items),
    "progressPct": 0,
    "startedAt": _now()
  }
  get_supabase_admin().table("resolvedStatus").upsert({"uploadId": upload_id, "data": status_data, "updatedAt": _now()}).execute()
  
  resolved_rows: dict[str, dict[str, Any]] = {}
  sem = asyncio.Semaphore(4)

  async def resolve_one(row: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    async with sem:
      resolved = await resolve_row_from_salex((row.get("code") or "").strip(), str(row.get("material") or ""))
      return row["key"], resolved

  tasks = [asyncio.create_task(resolve_one(row)) for row in grouped_items]
  processed = 0
  total = len(tasks)
  for done in asyncio.as_completed(tasks):
    key, resolved = await done
    resolved_rows[key] = resolved
    processed += 1
    
    status_data["processed"] = processed
    status_data["progressPct"] = int((processed / total) * 100) if total else 100
    get_supabase_admin().table("resolvedStatus").upsert({"uploadId": upload_id, "data": status_data, "updatedAt": _now()}).execute()

  table = build_resolved_pricing_table(grouped_items, resolved_rows)
  snapshot = {
    "uploadId": upload_id,
    "projectId": upload.get("projectId"),
    "resolvedAt": _now(),
    "modelMeta": {
      "mode": "gemini-only",
      "model": os.getenv("GEMINI_MODEL_FLAGSHIP", "gemini-2.5-pro").strip(),
    },
    **table,
  }
  
  get_supabase_admin().table("resolvedTables").upsert({"uploadId": upload_id, "data": snapshot, "resolvedAt": _now()}).execute()
  
  status_data["running"] = False
  status_data["progressPct"] = 100
  get_supabase_admin().table("resolvedStatus").upsert({"uploadId": upload_id, "data": status_data, "updatedAt": _now()}).execute()
  
  return {"resolved": snapshot, "cached": False}


@app.get("/v1/uploads/{upload_id}/salex-resolve-status")
def get_resolve_status(upload_id: str):
  res = get_supabase_admin().table("resolvedStatus").select("data").eq("uploadId", upload_id).execute()
  if not res.data:
    return {"running": False, "processed": 0, "total": 0, "progressPct": 0}
  return res.data[0]["data"]


@app.post("/v1/uploads/{upload_id}/describe")
async def describe_upload(upload_id: str):
  """Uses Gemini to auto-generate a project description from resolved table data."""
  upload = _find_upload(upload_id)
  if not upload:
    raise HTTPException(status_code=404, detail="Каченият файл не е намерен")
  
  res = get_supabase_admin().table("resolvedTables").select("data").eq("uploadId", upload_id).execute()
  if not res.data:
    raise HTTPException(status_code=404, detail="Таблицата не е разрешена")
  
  table_data = res.data[0]["data"]
  items = table_data.get("items", [])
  
  if not _gemini_enabled():
    return {"description": "AI описанието не е налично (Gemini не е конфигуриран)."}
  
  # Build a concise summary of items for the prompt
  material_lines = []
  total_area = 0.0
  for item in items[:20]:  # Limit to 20 items for prompt size
    name = item.get("productName") or item.get("material") or "Неизвестен"
    area = item.get("areaM2Total") or 0
    qty = item.get("qtyTotal") or 0
    total_area += area
    material_lines.append(f"- {name}: {qty} бр, {area:.2f} м²")
  
  materials_text = "\n".join(material_lines)
  total_items = len(items)
  
  prompt = (
    "Ти си асистент на мебелен майстор. Анализирай следния списък с материали от мебелен проект "
    "и напиши кратко, лесно разбираемо и маркетингово описание на проекта за клиента. "
    "Определи дали е кухня, гардероб, баня, офис, или комбинация. "
    "Спомени ключови материали с декор/цвят ако има. "
    "Включи обща площ ако е над 1 м². Пиши на БЪЛГАРСКИ. Максимум 3-4 изречения.\n\n"
    f"Брой артикули: {total_items}\n"
    f"Обща площ: {total_area:.2f} м²\n"
    f"Материали:\n{materials_text}"
  )
  
  try:
    import google.generativeai as genai
    model_name = os.getenv("GEMINI_MODEL_FAST", "gemini-2.5-flash").strip()
    model = genai.GenerativeModel(model_name)
    result = model.generate_content(prompt)
    description = result.text.strip()
    return {"description": description}
  except Exception as e:
    logger.error(f"Gemini describe error: {e}")
    return {"description": "Не успяхме да генерираме автоматично описание в момента."}


@app.post("/v1/uploads/{upload_id}/map")
def map_token(upload_id: str, payload: MappingIn):
  upload = _find_upload(upload_id)
  if not upload:
    raise HTTPException(status_code=404, detail="Каченият файл не е намерен")
  
  get_supabase_admin().table("mappings").insert(
    {
      "uploadId": upload_id,
      "sourceMaterial": payload.sourceMaterial,
      "catalogItemId": payload.catalogItemId,
    }
  ).execute()
  return {"ok": True}


@app.post("/v1/uploads/{upload_id}/price-override")
def set_price_override(upload_id: str, payload: PriceOverrideIn):
  upload = _find_upload(upload_id)
  if not upload:
    raise HTTPException(status_code=404, detail="Каченият файл не е намерен")
  
  # Check if item exists
  g_res = get_supabase_admin().table("grouped").select("id").eq("uploadId", upload_id).eq("key", payload.key).execute()
  if not g_res.data:
    raise HTTPException(status_code=404, detail="Групираният ред не е намерен")
  
  val = {
    "priceEur": round(payload.priceEur, 2),
    "sourceUrl": payload.sourceUrl,
    "supplier": payload.supplier,
    "createdAt": _now(),
  }
  
  get_supabase_admin().table("priceOverrides").delete().eq("uploadId", upload_id).eq("key", payload.key).execute()
  get_supabase_admin().table("priceOverrides").insert({
      "uploadId": upload_id,
      "key": payload.key,
      "data": val
  }).execute()

  return {"ok": True, "key": payload.key, "priceEur": val["priceEur"]}


@app.post("/v1/uploads/{upload_id}/salex-refresh")
async def refresh_upload_salex_prices(upload_id: str, force: bool = True):
  upload = _find_upload(upload_id)
  if not upload:
    raise HTTPException(status_code=404, detail="Каченият файл не е намерен")

  grouped_items = get_supabase_admin().table("grouped").select("*").eq("uploadId", upload_id).execute().data
  salex_data = get_supabase_admin().table("salexCache").select("*").execute().data
  salex_cache = {x["code"]: x.get("data") for x in salex_data}
  
  cat_data = get_supabase_admin().table("catalog").select("*").execute().data
  catalog_by_id = {c["id"]: c for c in cat_data}
  
  checked = 0
  found = 0
  updated = 0

  for item in grouped_items:
    code = (item.get("code") or "").strip().upper()
    if not code:
      continue
    checked += 1

    live = None
    if not force:
      cached = salex_cache.get(code)
      if cached:
        live = cached
    if live is None:
      live = await _salex_lookup_by_code(code, item.get("material"))
      if live:
        salex_cache[code] = live
        get_supabase_admin().table("salexCache").upsert({"code": code, "data": live}).execute()

    if not live:
      continue

    found += 1
    cat_id = f"salex-live-{code.replace(' ', '-')}"
    existing = catalog_by_id.get(cat_id)
    live_card = {
      "id": cat_id,
      "type": "board",
      "brand": "Salex",
      "supplier": "salex",
      "code": live.get("code", code),
      "name": live.get("name", code),
      "pricePerM2": float(live.get("priceEur") or live.get("priceBgn", 0.0) / 1.95583), # convert if only BGN available
      "imageUrl": live.get("imageUrl", ""),
      "sourceUrl": live.get("sourceUrl"),
    }
    
    # Supabase allows upsert without merging easily, we will execute upsert
    get_supabase_admin().table("catalog").upsert(live_card).execute()
    updated += 1

    item["catalogItemId"] = cat_id
    item["matchStatus"] = "matched-live"
    item["matchConfidence"] = 1.0
    
    get_supabase_admin().table("grouped").upsert(item).execute()

  return {"ok": True, "checked": checked, "found": found, "updated": updated}


@app.post("/v1/matchmaker/run")
async def run_matchmaker(upload_id: str):
  upload = _find_upload(upload_id)
  if not upload:
    raise HTTPException(status_code=404, detail="Каченият файл не е намерен")
  grouped_items = get_supabase_admin().table("grouped").select("*").eq("uploadId", upload_id).execute().data
  mappings = get_supabase_admin().table("mappings").select("*").eq("uploadId", upload_id).execute().data
  salex_data = get_supabase_admin().table("salexCache").select("*").execute().data
  salex_cache = {x["code"]: x.get("data") for x in salex_data}
  
  catalog = get_supabase_admin().table("catalog").select("*").execute().data
  catalog_by_id = {c["id"]: c for c in catalog}
  matched = 0
  needs_review = 0
  
  for item in grouped_items:
    code = (item.get("code") or "").strip().upper()
    if code:
      live = salex_cache.get(code)
      if live is None:
        live = await _salex_lookup_by_code(code, item.get("material"))
        salex_cache[code] = live or {}
        get_supabase_admin().table("salexCache").upsert({"code": code, "data": salex_cache[code]}).execute()
      if live:
        cat_id = f"salex-live-{code.replace(' ', '-')}"
        existing = catalog_by_id.get(cat_id)
        live_card = {
          "id": cat_id,
          "type": "board",
          "brand": "Salex",
          "supplier": "salex",
          "code": live.get("code", code),
          "name": live.get("name", code),
          "pricePerM2": float(live.get("priceBgn", 0.0)),
          "imageUrl": live.get("imageUrl", ""),
          "sourceUrl": live.get("sourceUrl"),
        }
        get_supabase_admin().table("catalog").upsert(live_card).execute()
        if not existing:
          catalog.append(live_card)
        catalog_by_id[cat_id] = live_card

    catalog_id, confidence = _match_group(item, catalog, mappings)
    if catalog_id and confidence >= 0.85:
      item["catalogItemId"] = catalog_id
      item["matchStatus"] = "matched"
      item["matchConfidence"] = confidence
      matched += 1
      get_supabase_admin().table("grouped").upsert(item).execute()
      continue
    
    shortlist = catalog[:5]
    ai_choice = await _gemini_simple_score(item["material"], shortlist)
    if ai_choice and ai_choice["confidence"] >= 0.7:
      item["catalogItemId"] = ai_choice["catalogItemId"]
      item["matchStatus"] = "matched-ai"
      item["matchConfidence"] = round(float(ai_choice["confidence"]), 2)
      get_supabase_admin().table("aiEvents").insert(
        {
          "type": "match-rerank",
          "uploadId": upload_id,
          "inputHash": uuid.uuid5(uuid.NAMESPACE_DNS, item["material"]).hex,
          "modelClass": "fast",
          "confidence": item["matchConfidence"],
        }
      ).execute()
      matched += 1
    else:
      item["matchStatus"] = "needs-review"
      item["matchConfidence"] = confidence
      needs_review += 1
      
    get_supabase_admin().table("grouped").upsert(item).execute()

  return {"total": len(grouped_items), "matched": matched, "needsReview": needs_review}


@app.get("/v1/pricing/preview")
def pricing_preview(upload_id: str):
  upload = _find_upload(upload_id)
  if not upload:
    raise HTTPException(status_code=404, detail="Каченият файл не е намерен")
  grouped_items = get_supabase_admin().table("grouped").select("*").eq("uploadId", upload_id).execute().data
  
  cat_data = get_supabase_admin().table("catalog").select("*").execute().data
  catalog_by_id = {c["id"]: c for c in cat_data}
  
  over_res = get_supabase_admin().table("priceOverrides").select("*").eq("uploadId", upload_id).execute().data
  upload_overrides = {r["key"]: r.get("data", {}) for r in over_res}
  
  missing = 0
  material_cost = 0.0
  area = 0.0
  edge = 0.0
  item_costs = []
  for item in grouped_items:
    area += item["areaM2Total"]
    edge += item["edgeMTotal"]
    cat = catalog_by_id.get(item.get("catalogItemId") or "")
    override = upload_overrides.get(item["key"])
    if override:
      line_cost = round(float(item["areaM2Total"]) * float(override.get("priceEur", override.get("priceBgn", 0.0))), 2)
    else:
      line_cost = _price_for_item(item, cat)
    if not cat:
      missing += 1
    material_cost += line_cost
    material_only = line_cost
    with_waste = round(material_only * 1.15, 2)
    with_labor = round(with_waste * 1.25, 2)
    workshop_final = round(with_labor + (8 if material_only > 0 else 0), 2)
    item_costs.append(
      {
        "key": item["key"],
        "material": item["material"],
        "code": item.get("code"),
        "thicknessMm": item.get("thicknessMm"),
        "qtyTotal": item.get("qtyTotal"),
        "areaM2Total": item.get("areaM2Total"),
        "edgeMTotal": item.get("edgeMTotal"),
        "cost": material_only,
        "matched": bool(cat),
        "matchStatus": item.get("matchStatus", "unmatched"),
        "catalogName": (cat or {}).get("name"),
        "supplier": (cat or {}).get("supplier", "salex"),
        "imageUrl": (cat or {}).get("imageUrl"),
        "sourceUrl": (cat or {}).get("sourceUrl"),
        "priceVariants": {
          "materialOnly": material_only,
          "withWaste": with_waste,
          "withLabor": with_labor,
          "workshopFinal": workshop_final,
        },
        "override": override,
        "priceSource": (
          "override"
          if override
          else ("salex-live" if (cat or {}).get("id", "").startswith("salex-live-") else ("catalog" if cat else "none"))
        ),
        "priceUpdatedAt": (
          (override or {}).get("createdAt")
          or (cat or {}).get("updatedAt")
          or (cat or {}).get("fetchedAt")
          or (cat or {}).get("createdAt")
        ),
        "priceSourceUrl": (override or {}).get("sourceUrl") or (cat or {}).get("sourceUrl"),
      }
    )
  waste_cost = round(material_cost * 0.15, 2)
  edging_cost = round(edge * 0.6, 2) # 0.60 EUR per meter
  labor_cost = round((material_cost + waste_cost + edging_cost) * 0.25, 2)
  transport_cost = 40.0 if material_cost > 0 else 0.0 # 40 EUR transport
  total = round(material_cost + waste_cost + edging_cost + labor_cost + transport_cost, 2)
  return {
    "projectId": upload["projectId"],
    "projectSaved": bool((_find_project(upload["projectId"]) or {}).get("saved", False)),
    "materials": {"areaM2": round(area, 3), "edgeM": round(edge, 3), "cost": round(material_cost, 2), "missingPriceItems": missing},
    "waste": {"pct": 0.15, "cost": waste_cost},
    "edging": {"costPerM": 1.2, "cost": edging_cost},
    "labor": {"mode": "pct", "value": 0.25, "cost": labor_cost},
    "transport": {"cost": transport_cost},
    "items": item_costs,
    "total": total,
  }


@app.post("/v1/offers/create")
def create_offer(payload: OfferCreateIn):
  upload = _find_upload(payload.uploadId)
  if not upload:
    raise HTTPException(status_code=404, detail="Каченият файл не е намерен")
  pricing = pricing_preview(payload.uploadId)
  # material base includes waste, labor, transport (defaults)
  base_subtotal = pricing["total"]
  
  # Add manual components
  # Note: pricing["total"] already includes pricing["transport"]["cost"] (defaults)
  # If the user provides a transportCost in the payload, we treat it as an override or extra?
  # Let's say payload.transportCost is the FINAL transport cost to be used.
  
  subtotal = base_subtotal - pricing["transport"]["cost"] + payload.transportCost + payload.installationCost + payload.otherCost
  
  margin = round(subtotal * payload.marginPct, 2)
  final_total = round(subtotal + margin, 2)
  slug = _slug()
  offer = {
    "id": str(uuid.uuid4()),
    "slug": slug,
    "uploadId": payload.uploadId,
    "projectId": upload["projectId"],
    "status": "draft",
    "version": 1,
    "createdAt": _now(),
    "updatedAt": _now(),
  }
  
  # For pricing and totals, we add them as jsonb columns if needed or just insert it.
  # The schema for `offers` has JSONB columns for `pricing` and `totals`.
  offer["pricing"] = pricing
  offer["totals"] = {
    "subtotal": subtotal, 
    "margin": margin, 
    "total": final_total,
    "manualCosts": {
      "transport": payload.transportCost,
      "installation": payload.installationCost,
      "other": payload.otherCost,
      "otherDescription": payload.otherDescription,
    }
  }
  get_supabase_admin().table("offers").insert(offer).execute()

  _log_activity(upload.get("userId"), "OFFER_CREATED", "offers", offer["id"], upload.get("workspaceId"), {"slug": slug})
  return {"slug": slug, "offerId": offer["id"]}


@app.post("/v1/quick-offer/create")
async def create_quick_offer(payload: QuickOfferIn):
  """Creates a project, upload, and fully resolved table bypassing PRO100."""
  user_id = payload.userId
  workspace_id = payload.workspaceId
  now_str = _now()
  
  # 1. Create Project
  project_id = str(uuid.uuid4())
  get_supabase_admin().table("projects").insert({
    "id": project_id,
    "userId": user_id,
    "workspaceId": workspace_id,
    "name": f"Бърза Оферта {now_str[:10]}",
    "createdAt": now_str,
  }).execute()

  # 2. Create Upload
  upload_id = str(uuid.uuid4())
  get_supabase_admin().table("uploads").insert({
    "id": upload_id,
    "projectId": project_id,
    "userId": user_id,
    "workspaceId": workspace_id,
    "format": "quick-offer",
    "createdAt": now_str,
  }).execute()

  # 3. Create Grouped Items and manually resolve them
  resolved_rows = {}
  grouped_items = []
  
  for idx, item in enumerate(payload.items):
    key = str(idx)
    # create grouped format
    g_item = {
      "uploadId": upload_id,
      "key": key,
      "material": item.material,
      "code": item.code or "",
      "areaM2Total": item.qty if item.unit == "м²" else 0,
      "edgeMTotal": item.qty if item.unit == "м" else 0,
      "qtyTotal": item.qty if item.unit == "бр" else 0,
    }
    grouped_items.append(g_item)
    get_supabase_admin().table("grouped").insert(g_item).execute()
    
    # create resolve logic format
    price = item.priceEur or 0.0
    resolved_rows[key] = {
      "matched": True,
      "catalogItem": {
        "id": f"manual-{uuid.uuid4()}",
        "type": "other",
        "supplier": "manual",
        "code": item.code or "-",
        "name": item.material,
        "pricePerM2": price, # treated as unit price for calculation
        "imageUrl": ""
      },
      "exactMatch": True,
      "score": 1.0,
      "candidates": []
    }

  # Build table
  table = build_resolved_pricing_table(grouped_items, resolved_rows)
  snapshot = {
    "uploadId": upload_id,
    "projectId": project_id,
    "resolvedAt": now_str,
    "modelMeta": {"mode": "manual"},
    **table,
  }
  get_supabase_admin().table("resolvedTables").upsert({"uploadId": upload_id, "data": snapshot, "resolvedAt": now_str}).execute()

  # Set Status
  status_data = {"running": False, "processed": len(payload.items), "total": len(payload.items), "progressPct": 100}
  get_supabase_admin().table("resolvedStatus").upsert({"uploadId": upload_id, "data": status_data, "updatedAt": now_str}).execute()

  _log_activity(user_id, "QUICK_OFFER_CREATED", "projects", project_id, workspace_id)
  return {"ok": True, "uploadId": upload_id, "projectId": project_id}


@app.get("/v1/offers/{slug}")
def get_offer(slug: str):
  offer = _find_offer(slug)
  if not offer:
    raise HTTPException(status_code=404, detail="Офертата не е намерена")
  return offer

@app.get("/v1/offers/{slug}/interactive")
def get_interactive_offer(slug: str):
  offer = _find_offer(slug)
  if not offer:
    raise HTTPException(status_code=404, detail="Офертата не е намерена")
  
  offer_id = offer["id"]
  
  # Fetch comments
  comments_res = get_supabase_admin().table("offerComments").select("*").eq("offerId", offer_id).order("createdAt", desc=False).execute()
  comments = comments_res.data or []
  
  # Fetch alternatives
  alts_res = get_supabase_admin().table("offerAlternatives").select("*").eq("offerId", offer_id).execute()
  alternatives = alts_res.data or []
  
  return {
    "offer": offer,
    "comments": comments,
    "alternatives": alternatives
  }

@app.post("/v1/offers/{slug}/comment")
def add_offer_comment(slug: str, payload: OfferCommentIn):
  offer = _find_offer(slug)
  if not offer:
    raise HTTPException(status_code=404, detail="Офертата не е намерена")
  
  comment = {
    "id": str(uuid.uuid4()),
    "offerId": offer["id"],
    "author": payload.author,
    "text": payload.text,
    "createdAt": _now()
  }
  get_supabase_admin().table("offerComments").insert(comment).execute()
  return {"ok": True, "comment": comment}

@app.post("/v1/offers/{slug}/select-alternative")
def select_offer_alternative(slug: str, payload: OfferAlternativeSelectIn):
  offer = _find_offer(slug)
  if not offer:
    raise HTTPException(status_code=404, detail="Офертата не е намерена")
  
  # Set all alternatives for this lineKey to unselected
  get_supabase_admin().table("offerAlternatives").update({"selected": False}).eq("offerId", offer["id"]).eq("lineKey", payload.lineKey).execute()
  
  # Check if the desired alternative exists; if yes, select it. If not (and they want to use a fallback or create ad-hoc), insert it.
  existing = get_supabase_admin().table("offerAlternatives").select("*").eq("offerId", offer["id"]).eq("lineKey", payload.lineKey).eq("catalogItemId", payload.catalogItemId).execute()
  
  if existing.data:
    get_supabase_admin().table("offerAlternatives").update({"selected": True}).eq("id", existing.data[0]["id"]).execute()
  else:
    get_supabase_admin().table("offerAlternatives").insert({
      "id": str(uuid.uuid4()),
      "offerId": offer["id"],
      "lineKey": payload.lineKey,
      "catalogItemId": payload.catalogItemId,
      "priceEur": payload.priceEur,
      "selected": True,
      "createdAt": _now()
    }).execute()
    
  return {"ok": True}


@app.post("/v1/offers/{slug}/master-approve")
def master_approve_offer(slug: str):
  offer = _find_offer(slug)
  if not offer:
    raise HTTPException(status_code=404, detail="Офертата не е намерена")
  
  updated_at = _now()
  get_supabase_admin().table("offers").update({"masterApprovedAt": updated_at}).eq("slug", slug).execute()
  
  # Check if both are approved to set status
  if offer.get("clientApprovedAt"):
    get_supabase_admin().table("offers").update({"status": "approved"}).eq("slug", slug).execute()
    
  return {"ok": True, "masterApprovedAt": updated_at}


@app.post("/v1/offers/{slug}/revise")
def revise_offer(slug: str):
  """Duplicates an existing offer as a new version"""
  offer = _find_offer(slug)
  if not offer:
    raise HTTPException(status_code=404, detail="Офертата не е намерена")
  
  # Get all offers for this upload to determine max version
  all_project_offers = get_supabase_admin().table("offers").select("version").eq("projectId", offer["projectId"]).execute()
  max_version = 0
  for o in all_project_offers.data:
      v = o.get("version") or 1
      if v > max_version: max_version = v
      
  new_version = max_version + 1
  new_slug = _slug()
  
  new_offer = {
    "id": str(uuid.uuid4()),
    "slug": new_slug,
    "uploadId": offer["uploadId"],
    "projectId": offer["projectId"],
    "status": "draft",
    "version": new_version,
    "createdAt": _now(),
    "updatedAt": _now(),
    "pricing": offer.get("pricing"),
    "totals": offer.get("totals"),
  }
  
  get_supabase_admin().table("offers").insert(new_offer).execute()
  
  # Return the new offer
  return {"ok": True, "slug": new_slug, "offerId": new_offer["id"], "version": new_version}


@app.post("/v1/offers/{slug}/client-approve")
def client_approve_offer(slug: str, payload: ClientApproveIn):
  offer = _find_offer(slug)
  if not offer:
    raise HTTPException(status_code=404, detail="Офертата не е намерена")
  
  updated_at = _now()
  get_supabase_admin().table("offers").update({
    "clientApprovedAt": updated_at,
    "clientIp": payload.ip,
    "clientUserAgent": payload.userAgent
  }).eq("slug", slug).execute()
  
  # Check if both are approved to set status
  if offer.get("masterApprovedAt"):
    get_supabase_admin().table("offers").update({"status": "approved"}).eq("slug", slug).execute()
    
  return {"ok": True, "clientApprovedAt": updated_at}



@app.get("/v1/offers/{slug}/pdf")
async def get_offer_pdf(slug: str):
  offer = _find_offer(slug)
  if not offer:
    raise HTTPException(status_code=404, detail="Офертата не е намерена")
    
  items = get_supabase_admin().table("grouped").select("*").eq("uploadId", offer["uploadId"]).execute().data
  
  pdf_bytes = generate_offer_pdf(offer, items)
  
  return Response(
    content=pdf_bytes,
    media_type="application/pdf",
    headers={
      "Content-Disposition": f"attachment; filename=offer-{slug}.pdf"
    }
  )


@app.get("/v1/offers/{slug}/salex-order.csv")
def salex_order(slug: str):
  offer = _find_offer(slug)
  if not offer:
    raise HTTPException(status_code=404, detail="Офертата не е намерена")
  
  grouped_items = get_supabase_admin().table("grouped").select("*").eq("uploadId", offer["uploadId"]).execute().data
  
  cat_data = get_supabase_admin().table("catalog").select("*").execute().data
  catalog_by_id = {c["id"]: c for c in cat_data}
  
  output = io.StringIO()
  writer = csv.writer(output)
  writer.writerow(["category", "material", "code", "thickness_mm", "qty_total", "area_m2_total", "edge_m_total", "unit_price", "line_total"])
  for item in grouped_items:
    cat = catalog_by_id.get(item.get("catalogItemId") or "")
    unit_price = 0.0
    if cat:
      unit_price = float(cat.get("pricePerM2") or cat.get("pricePerM") or cat.get("pricePerUnit") or 0.0)
    writer.writerow(
      [
        (cat or {}).get("type", "unmatched"),
        item["material"],
        item.get("code", ""),
        item.get("thicknessMm", 0),
        item["qtyTotal"],
        item["areaM2Total"],
        item["edgeMTotal"],
        unit_price,
        _price_for_item(item, cat),
      ]
    )
  return {"filename": f"salex-order-{slug}.csv", "content": output.getvalue()}


@app.get("/v1/ai/health")
def ai_health():
  return {
    "enabled": _gemini_enabled(),
    "modelFast": os.getenv("GEMINI_MODEL_FAST", "gemini-2.5-flash"),
    "modelFlagship": os.getenv("GEMINI_MODEL_FLAGSHIP", "gemini-2.5-pro"),
    "imageMode": _image_mode(),
    "imageModelActive": _image_model_for_mode(),
    "imageModelFast": os.getenv("GEMINI_IMAGE_MODEL_FAST", "gemini-2.5-flash-image"),
    "imageModelPremium": os.getenv("GEMINI_IMAGE_MODEL_PREMIUM", "gemini-2.5-pro"),
  }


@app.get("/v1/ai/image-model")
def ai_image_model(mode: str | None = None):
  requested_mode = (mode or _image_mode()).strip().lower()
  if requested_mode not in {"fast", "premium"}:
    raise HTTPException(status_code=400, detail="Режимът трябва да е 'fast' или 'premium'")
  return {
    "mode": requested_mode,
    "model": _image_model_for_mode(requested_mode),
    "available": {
      "fast": os.getenv("GEMINI_IMAGE_MODEL_FAST", "gemini-2.5-flash-image"),
      "premium": os.getenv("GEMINI_IMAGE_MODEL_PREMIUM", "gemini-2.5-pro"),
    },
  }


@app.get("/v1/ai/evals")
def ai_evals():
  events = get_supabase_admin().table("aiEvents").select("*").execute().data
  if not events:
    return {"events": 0, "avgConfidence": 0.0, "modelUsage": {}}
  avg = round(sum(float(e.get("confidence", 0)) for e in events) / len(events), 3)
  by_model: dict[str, int] = defaultdict(int)
  for e in events:
    by_model[e.get("modelClass", "unknown")] += 1
  return {"events": len(events), "avgConfidence": avg, "modelUsage": dict(by_model)}


@app.post("/v1/ai/catalog/reindex")
async def reindex_catalog():
  """Generates embeddings for all catalog items that don't have one."""
  admin = get_supabase_admin()
  items = admin.table("catalog").select("id, name").is_("embedding", "null").execute().data
  
  if not items:
    return {"ok": True, "message": "Всички артикули вече имат ембединги."}
    
  success = 0
  for item in items:
    emb = await get_embedding(item["name"])
    if emb:
      admin.table("catalog").update({"embedding": emb}).eq("id", item["id"]).execute()
      success += 1
      
  return {"ok": True, "reindexed": success, "total": len(items)}


@app.post("/v1/scrape/salex/run")
async def scrape_salex(background_tasks: BackgroundTasks):
  if SCRAPER_STATE.is_running:
    return {"ok": False, "message": "Scraper-ът вече работи."}
  
  SCRAPER_STATE.is_running = True
  SCRAPER_STATE.items_added = 0
  SCRAPER_STATE.items_processed = 0
  SCRAPER_STATE.current_category = "all"
  SCRAPER_STATE.last_item_name = None
  SCRAPER_STATE.started_at = datetime.now(timezone.utc).isoformat()
  SCRAPER_STATE.finished_at = None

  background_tasks.add_task(run_full_scrape_with_state, SCRAPER_STATE)
  return {"ok": True, "message": "Scraper-ът е стартиран."}


@app.get("/v1/scrape/salex/status")
async def get_scrape_status():
  return SCRAPER_STATE

