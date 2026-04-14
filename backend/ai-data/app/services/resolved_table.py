from __future__ import annotations

import asyncio
import json
import logging
import os
import re
from typing import Any

import httpx
from bs4 import BeautifulSoup
from pydantic import BaseModel, Field, ValidationError

from ..supabase_client import get_supabase_admin
from .embeddings import get_embedding

logger = logging.getLogger(__name__)


class GeminiResolvedItem(BaseModel):
  sourceUrl: str
  name: str
  codeDetected: str
  priceValue: float = Field(ge=0)
  priceUnit: str
  availableSizes: list[str] = Field(default_factory=list)
  availabilityText: str = ""
  exactMatch: bool
  confidence: float = Field(ge=0, le=1)
  reason: str = ""
  imageUrl: str = ""


def _norm(s: str | None) -> str:
  return (s or "").strip().lower()


def _to_float(value: str | None, default: float = 0.0) -> float:
  if not value:
    return default
  normalized = value.replace(",", ".").strip()
  try:
    return float(normalized)
  except ValueError:
    return default


def _abs_salex_url(src: str | None) -> str:
  value = (src or "").strip()
  if not value:
    return ""
  if value.startswith("//"):
    return f"https:{value}"
  if value.startswith("/"):
    return f"https://salex.bg{value}"
  return value


def _extract_price_bgn(text: str) -> float | None:
  m = re.search(r"(\d+(?:[.,]\d{1,2})?)\s*(?:BGN|лв)\.?", text, re.IGNORECASE)
  if not m:
    return None
  return _to_float(m.group(1), 0.0)


def _normalize_unit(raw: str | None) -> str:
  s = _norm(raw)
  if "м2" in s or "м²" in s:
    return "€/м2"
  if "лист" in s:
    return "€/лист"
  if "бр" in s:
    return "€/бр"
  if "€" in s or "eur" in s or "евро" in s:
    if "м2" in s or "м²" in s: return "€/м2"
    if "бр" in s: return "€/бр"
    if "лист" in s: return "€/лист"
    return "€/м2"
  if re.search(r"(^|[^0-9])м($|[^0-9²2])", s):
    return "€/м"
  return "€/м2"


def _extract_price_eur(text: str) -> float | None:
  # Търсим Евро символи: €, EUR, евро
  m = re.search(r"(\d+(?:[.,]\d{1,2})?)\s*(?:\u20ac|EUR|\u0435\u0432\u0440\u043e)\.?", text, re.IGNORECASE)
  if not m:
    return None
  return _to_float(m.group(1), 0.0)


def _extract_price_and_unit(text: str) -> tuple[float | None, str | None]:
  clean = re.sub(r"\s+", " ", text or "")
  # Първо търсим изрични форми "€/UNIT"
  strong_patterns = [
    r"(\d+(?:[.,]\d{1,2})?)\s*(?:\u20ac|EUR)\s*/\s*(м2|м²|лист|бр|м)\b",
    r"(\d+(?:[.,]\d{1,2})?)\s*/\s*(м2|м²|лист|бр|м)\s*(?:\u20ac|EUR)\b",
  ]
  for pat in strong_patterns:
    m = re.search(pat, clean, re.IGNORECASE)
    if m:
      return _to_float(m.group(1), 0.0), _normalize_unit(m.group(2))
  
  # Fallback към цена в евро
  price = _extract_price_eur(clean)
  if price is None:
    return None, None
    
  # Проверка за слаби подсказки за мерни единици
  around = clean[:1200].lower()
  if "лист" in around:
    return price, "€/лист"
  if "бр." in around or " бр " in around:
    return price, "€/бр"
  if "€/м2" in around or "€/м²" in around or "eur/m2" in around:
    return price, "€/м2"
  if "€/м" in around or "eur/m" in around:
    return price, "€/м"
  return price, None


def _extract_from_jsonld(doc: BeautifulSoup) -> float | None:
  for script in doc.find_all("script", type="application/ld+json"):
    if not script.string: continue
    try:
      data = json.loads(script.string)
      items = data.get("@graph", [data]) if isinstance(data, dict) else (data if isinstance(data, list) else [])
      for item in items:
        if isinstance(item, dict) and item.get("@type") == "Product":
          offers = item.get("offers", {})
          if isinstance(offers, list) and len(offers) > 0:
            offers = offers[0]
          if isinstance(offers, dict) and "price" in offers:
            return float(offers["price"])
    except Exception:
      pass
  return None


def _extract_sizes(text: str) -> list[str]:
  clean = re.sub(r"\s+", " ", text)
  out: list[str] = []
  for pattern in [
    r"\b\d{2,4}\s*[xх*]\s*\d{2,4}(?:\s*[xх*]\s*\d{1,3})?\s*мм?\b",
    r"\b\d{2,4}\s*[xх*]\s*\d{2,4}(?:\s*[xх*]\s*\d{1,3})?\b",
    r"\bдебелина\s*\d{1,3}\s*мм\b",
  ]:
    for m in re.finditer(pattern, clean, re.IGNORECASE):
      token = m.group(0).strip()
      if token and token not in out:
        out.append(token)
  return out[:8]


def _looks_like_product_link(url: str) -> bool:
  u = (url or "").lower()
  if not u or "salex.bg" not in u:
    return False
  bad = ["/cart", "/checkout", "/my-account", "/wishlist", "/blog", "/tag/", "/category/", "/product-category/"]
  return not any(x in u for x in bad)


def _contains_code(code: str, text: str | None) -> bool:
  c = (code or "").strip().lower()
  t = (text or "").lower()
  if not c or not t:
    return False
  c_compact = re.sub(r"[\s\-_]+", "", c)
  t_compact = re.sub(r"[\s\-_]+", "", t)
  return c in t or c_compact in t_compact


def _candidate_score(code: str, material: str, c: dict[str, Any]) -> float:
  title = str(c.get("title") or "")
  url = str(c.get("sourceUrl") or "")
  excerpt = str(c.get("excerpt") or "")
  score = 0.0
  if _contains_code(code, title):
    score += 5.0
  if _contains_code(code, url):
    score += 4.0
  if _contains_code(code, excerpt):
    score += 2.0
  mat_tokens = [t for t in re.split(r"\s+", _norm(material)) if len(t) >= 3][:4]
  hay = _norm(f"{title} {excerpt}")
  score += sum(0.5 for t in mat_tokens if t in hay)
  if float(c.get("priceGuess") or 0) > 0:
    score += 1.0
  if c.get("unitGuess"):
    score += 0.5
  return score


def _hard_match(code: str, candidates: list[dict[str, Any]]) -> dict[str, Any] | None:
  if not (code or "").strip():
    return None
  matched = [
    c for c in candidates
    if _contains_code(code, str(c.get("sourceUrl") or ""))
    or _contains_code(code, str(c.get("title") or ""))
    or _contains_code(code, str(c.get("excerpt") or ""))
  ]
  if not matched:
    return None
  return sorted(matched, key=lambda x: _candidate_score(code, "", x), reverse=True)[0]


async def _semantic_match(code: str, material: str, match_threshold: float = 0.5) -> dict[str, Any] | None:
    """Attempts to find a match using pgvector semantic search in the catalog."""
    query_text = f"{code} {material}".strip()
    if not query_text:
        return None

    embedding = await get_embedding(query_text)
    if not embedding:
        return None

    try:
        # We call the RPC function created in Supabase
        res = get_supabase_admin().rpc(
            "match_catalog_items",
            {
                "query_embedding": embedding,
                "match_threshold": match_threshold,
                "match_count": 1
            }
        ).execute()

        if res.data and len(res.data) > 0:
            best = res.data[0]
            # Map semantic result to expected candidate format (aligned with 'catalog' table)
            return {
                "id": best.get("id"),
                "name": best.get("name"),   # using 'name' column
                "brand": best.get("brand"),
                "code": best.get("code"),
                "price": best.get("priceEur"), # using 'priceEur' column
                "unit": best.get("unit"),
                "imageUrl": best.get("imageUrl"),
                "sourceUrl": best.get("sourceUrl"),
                "similarity": best.get("similarity"),
                "isSemantic": True
            }
    except Exception as e:
        logger.error(f"Semantic search error: {e}")
    
    return None


def _dedupe_candidates(candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
  seen: set[str] = set()
  out: list[dict[str, Any]] = []
  for c in candidates:
    src = str(c.get("sourceUrl") or "").strip()
    if not src:
      continue
    # Remove query/hash to avoid duplicated WooCommerce URLs.
    key = re.sub(r"[?#].*$", "", src)
    if key in seen:
      continue
    seen.add(key)
    out.append(c)
  return out


def _sheet_area_from_sizes(sizes: list[str]) -> float | None:
  for raw in sizes or []:
    s = (raw or "").replace("х", "x").replace("*", "x").lower()
    nums = re.findall(r"\d{2,4}", s)
    if len(nums) < 2:
      continue
    w = _to_float(nums[0], 0.0)
    h = _to_float(nums[1], 0.0)
    if w <= 0 or h <= 0:
      continue
    # Assume mm if large values; cm otherwise.
    if w > 1000 or h > 1000:
      wm = w / 1000.0
      hm = h / 1000.0
    else:
      wm = w / 100.0
      hm = h / 100.0
    area = wm * hm
    if area > 0.2:
      return area
  return None


async def _gemini_pick(code: str, material: str, candidates: list[dict[str, Any]]) -> dict[str, Any] | None:
  key = os.getenv("GEMINI_API_KEY", "").strip()
  model = os.getenv("GEMINI_MODEL_FLAGSHIP", "gemini-3-flash-preview").strip()
  if not key or not candidates:
    return None
  
  # Ensure model string doesn't have redundant models/ prefix for URL path
  safe_model = model.replace("models/", "")
  endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{safe_model}:generateContent"
  prompt = (
    "Role: You are a strict product matching validator for Salex.bg.\n"
    "Goal: Pick exactly one best candidate for the requested product and extract machine-readable fields.\n"
    "Hard rules:\n"
    "1) exactMatch=true ONLY if the requested code appears exactly in candidate url/title/content.\n"
    "2) If exact code is missing, set exactMatch=false and lower confidence.\n"
    "3) Never invent values. If missing, use empty string/0/[] and explain in reason.\n"
    "4) priceUnit must be one of: '€/м2', '€/лист', '€/бр', '€/м'.\n"
    "5) Prices in Salex are in EURO (\u20ac). Extract them carefully.\n"
    "6) Prefer Salex product pages over category/search pages.\n"
    "7) Keep reason concise and factual.\n"
    f"Requested code: {code}\n"
    f"Material hint: {material}\n"
    f"Candidates JSON: {json.dumps(candidates, ensure_ascii=False)}"
  )
  correction = (
    " Previous output was invalid. Return ONLY valid JSON strictly matching keys and value types."
  )
  enable_google_search = os.getenv("GEMINI_ENABLE_GOOGLE_SEARCH", "true").strip().lower() in {"1", "true", "yes", "on"}
  thinking_budget = int(os.getenv("GEMINI_THINKING_BUDGET", "24576"))
  def _extract_json_candidate(blob: str) -> dict[str, Any] | None:
    text = (blob or "").strip()
    if not text:
      return None
    # Handle ```json ... ``` wrappers.
    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)```", text, re.IGNORECASE)
    if fenced:
      text = fenced.group(1).strip()
    # Fast path.
    try:
      parsed = json.loads(text)
      return parsed if isinstance(parsed, dict) else None
    except Exception:
      pass
    # Robust scan for the first valid JSON object in text.
    decoder = json.JSONDecoder()
    for idx, ch in enumerate(text):
      if ch != "{":
        continue
      try:
        obj, _ = decoder.raw_decode(text[idx:])
        if isinstance(obj, dict):
          return obj
      except Exception:
        continue
    return None

  response_schema = {
    "type": "object",
    "required": [
      "sourceUrl",
      "name",
      "codeDetected",
      "priceValue",
      "priceUnit",
      "availableSizes",
      "availabilityText",
      "exactMatch",
      "confidence",
      "reason",
      "imageUrl",
    ],
    "properties": {
      "sourceUrl": {"type": "string"},
      "name": {"type": "string"},
      "codeDetected": {"type": "string"},
      "priceValue": {"type": "number"},
      "priceUnit": {"type": "string", "enum": ["\u20ac/\u043c2", "\u20ac/\u043b\u0438\u0441\u0442", "\u20ac/\u0431\u0440", "\u20ac/\u043c"]},
      "availableSizes": {"type": "array", "items": {"type": "string"}},
      "availabilityText": {"type": "string"},
      "exactMatch": {"type": "boolean"},
      "confidence": {"type": "number"},
      "reason": {"type": "string"},
      "imageUrl": {"type": "string"},
    },
  }

  for attempt in range(2):
    req_base: dict[str, Any] = {
      "contents": [{"parts": [{"text": prompt + (correction if attempt == 1 else "")}]}],
    }
    if enable_google_search:
      req_base["tools"] = [{"google_search": {}}]
    request_variants: list[dict[str, Any]] = [
      {
        **req_base,
        "generationConfig": {
          "responseMimeType": "application/json",
          "responseJsonSchema": response_schema,
          "thinkingConfig": {"thinkingBudget": max(thinking_budget, 0)},
        },
      },
      {
        **req_base,
        "generationConfig": {
          "responseMimeType": "application/json",
          "responseJsonSchema": response_schema,
        },
      },
      {
        **req_base,
        "generationConfig": {
          "responseMimeType": "application/json",
          "responseSchema": response_schema,
        },
      },
      req_base,
    ]
    try:
      async with httpx.AsyncClient(timeout=30.0) as client:
        for req in request_variants:
          resp = await client.post(endpoint, params={"key": key}, json=req)
          if resp.status_code >= 300:
            logger.error(f"Gemini HTTP Error (attempt {attempt}, status {resp.status_code}): {resp.text}")
            with open('gemini_error.txt', 'a', encoding='utf-8') as f:
                f.write(f"HTTP ERROR {resp.status_code}: {resp.text}\n")
            continue
          payload = resp.json()
          parsed: dict[str, Any] | None = None
          # Prefer text parts, then function-call args if present.
          for c in payload.get("candidates", []):
            for p in (((c.get("content") or {}).get("parts")) or []):
              txt = p.get("text")
              if txt:
                parsed = _extract_json_candidate(txt)
                if parsed:
                  break
              fn_call = p.get("functionCall") or {}
              if fn_call:
                fn_args = fn_call.get("args")
                if isinstance(fn_args, dict):
                  parsed = fn_args
                elif isinstance(fn_args, str):
                  parsed = _extract_json_candidate(fn_args)
                if parsed:
                  break
            if parsed:
              break
          if not parsed:
            parsed = _extract_json_candidate(json.dumps(payload, ensure_ascii=False))
          if not parsed:
            continue
          model = GeminiResolvedItem.model_validate(parsed)
          return {
            "sourceUrl": _abs_salex_url(model.sourceUrl),
            "name": model.name or code,
            "codeDetected": model.codeDetected or code,
            "priceValue": float(model.priceValue),
            "priceUnit": model.priceUnit or "€/м2",
            "availableSizes": [str(x).strip() for x in model.availableSizes if str(x).strip()][:8],
            "availabilityText": model.availabilityText or "",
            "exactMatch": bool(model.exactMatch),
            "confidence": float(model.confidence),
            "reason": model.reason or "",
            "imageUrl": _abs_salex_url(model.imageUrl),
          }
    except (ValidationError, ValueError, json.JSONDecodeError) as e:
      logger.warning(f"Gemini parsing error (attempt {attempt}): {e}")
      continue
    except Exception as e:
      logger.warning(f"Gemini API unexpected error (attempt {attempt}): {e}")
      continue
  
  logger.warning(f"Gemini failed to pick candidate for code={code} after all attempts")
  return None


async def resolve_row_from_salex(code: str, material: str, client: httpx.AsyncClient | None = None) -> dict[str, Any]:
  code = (code or "").strip().upper()
  query = code or material.strip()
  if not query:
    return {"exactMatch": False, "confidence": 0.0, "reason": "Липсват код и материал"}

  search_queries: list[str] = []
  for q in [code, material, f"{code} egger", f"{material} egger", f"{code} {material}".strip()]:
    qq = (q or "").strip()
    if qq and qq not in search_queries:
      search_queries.append(qq)
  search_url = f"https://salex.bg/?s={search_queries[0]}"
  # Using a more standard browser user-agent to bypass basic bot protection
  headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 STAIPO/1.0"}
  links: list[str] = []
  
  local_client = None
  if not client:
    local_client = httpx.AsyncClient(timeout=15.0, follow_redirects=True)
    client = local_client

  # 0. Local Semantic Match (pgvector)
  try:
    local_match = await _semantic_match(code, material)
    if local_match and local_match.get("similarity", 0) > 0.78:
      return {
        "sourceUrl": local_match.get("sourceUrl") or "",
        "name": local_match.get("name") or material or code,
        "codeDetected": local_match.get("code") or code,
        "priceValue": float(local_match.get("price") or 0.0), # price matches priceEur from _semantic_match
        "priceUnit": _normalize_unit(local_match.get("unit") or "\u20ac/m2"),
        "availableSizes": [],
        "availabilityText": "Налично в каталог",
        "exactMatch": True,
        "confidence": float(local_match.get("similarity") or 0.95),
        "reason": f"Семантичен match в каталога (similarity: {local_match.get('similarity'):.2f})",
        "imageUrl": local_match.get("imageUrl") or "",
      }
  except Exception as e:
    logger.debug(f"Catalog match skipped or failed: {e}")

  # 1. Fetch search links
    for q in search_queries[:5]:
      try:
        resp = await client.get(f"https://salex.bg/?s={q}", headers=headers)
        html = resp.text if resp.status_code < 300 else ""
        if not html:
          continue
        soup = BeautifulSoup(html, "lxml")
        selectors = [
          "li.product a.woocommerce-LoopProduct-link[href]",
          "li.product a[href]",
          ".products li.product a[href]",
          "article.product a[href]",
          "a[href]",
        ]
        for sel in selectors:
          for a in soup.select(sel):
            href = _abs_salex_url(a.get("href"))
            if href and href not in links and _looks_like_product_link(href):
              links.append(href)
        if len(links) >= 18:
          break
      except Exception as e:
        logger.warning(f"Error fetching search results for query '{q}': {e}")
        continue

    links = links[:20]
    if not links:
      return {"sourceUrl": search_url, "exactMatch": False, "confidence": 0.0, "reason": "Няма продуктови линкове"}

    # 2. Extract product candidates with concurrency limits
    candidates: list[dict[str, Any]] = []
    sem = asyncio.Semaphore(5)  # Max 5 parallel requests to Salex to prevent flooding

    async def fetch_candidate(url: str) -> dict[str, Any] | None:
      async with sem:
        try:
          page = await client.get(url, headers=headers)
          if page.status_code == 404:
            logger.debug(f"404 Not Found, skipping candidate page {url}")
            return None
          if page.status_code >= 300:
            logger.debug(f"Status {page.status_code} skipping candidate page {url}")
            return None
          doc = BeautifulSoup(page.text, "lxml")
          title = (doc.title.string if doc.title and doc.title.string else "").strip()
          text = doc.get_text(" ", strip=True)[:5000]
          
          ld_price = _extract_from_jsonld(doc)
          price_guess, unit_guess = _extract_price_and_unit(text)
          if ld_price:
            price_guess = ld_price
            
          return {
            "sourceUrl": url,
            "title": title,
            "priceGuess": price_guess or 0.0,
            "unitGuess": unit_guess or "",
            "sizesGuess": _extract_sizes(text),
            "excerpt": text[:1200],
          }
        except Exception as err:
          logger.warning(f"Failed to fetch or parse candidate {url}: {err}")
          return None

    # Fetch them concurrently
    tasks = [fetch_candidate(u) for u in links]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    for res in results:
      if isinstance(res, dict):
        candidates.append(res)
      elif isinstance(res, Exception):
        logger.error(f"Asyncio gather unexpected error for candidate: {res}")

    if not candidates:
      logger.warning(f"No candidates found out of {len(links)} links for '{query}'")
      return {"sourceUrl": search_url, "exactMatch": False, "confidence": 0.0, "reason": "Няма валидни продуктови страници"}
    candidates = _dedupe_candidates(candidates)
    if not candidates:
      return {"sourceUrl": search_url, "exactMatch": False, "confidence": 0.0, "reason": "Няма валидни уникални продукти"}

    # 1) Deterministic layer first.
    hard = _hard_match(code or query, candidates)
    if hard:
      return {
        "sourceUrl": hard.get("sourceUrl") or search_url,
        "name": hard.get("title") or material or code or query,
        "codeDetected": code or query,
        "priceValue": float(hard.get("priceGuess") or 0.0),
        "priceUnit": _normalize_unit(hard.get("unitGuess") or "лв/м2"),
        "availableSizes": hard.get("sizesGuess") or [],
        "availabilityText": "",
        "exactMatch": True,
        "confidence": 0.92,
        "reason": "Детерминистичен exact match по код в URL/заглавие/текст",
        "imageUrl": "",
      }

    # 2) Heuristic best candidate.
    best = sorted(candidates, key=lambda c: _candidate_score(code or query, material, c), reverse=True)[0]
    if _candidate_score(code or query, material, best) >= 3.5 and float(best.get("priceGuess") or 0.0) > 0:
      return {
        "sourceUrl": best.get("sourceUrl") or search_url,
        "name": best.get("title") or material or code or query,
        "codeDetected": code or query,
        "priceValue": float(best.get("priceGuess") or 0.0),
        "priceUnit": _normalize_unit(best.get("unitGuess") or "лв/м2"),
        "availableSizes": best.get("sizesGuess") or [],
        "availabilityText": "",
        "exactMatch": False,
        "confidence": 0.68,
        "reason": "Хевристичен match (без точен код)",
        "imageUrl": "",
      }

    # 3) AI fallback only for hard cases. Limiting to top 5 to save tokens and latency.
    top_candidates = sorted(candidates, key=lambda c: _candidate_score(code or query, material, c), reverse=True)[:5]
    pick = await _gemini_pick(code or query, material, top_candidates)
    
    if pick:
      if not pick.get("sourceUrl"):
        pick["sourceUrl"] = search_url
      # Enforce deterministic exactMatch at code level.
      selected = next((c for c in candidates if str(c.get("sourceUrl") or "") == str(pick.get("sourceUrl") or "")), None)
      exact = (
        _contains_code(code or query, str(pick.get("sourceUrl") or ""))
        or _contains_code(code or query, str(pick.get("name") or ""))
        or _contains_code(code or query, str(pick.get("codeDetected") or ""))
        or _contains_code(code or query, str((selected or {}).get("excerpt") or ""))
      )
      pick["exactMatch"] = bool(exact)
      if not pick.get("priceValue") and selected:
        pick["priceValue"] = float(selected.get("priceGuess") or 0.0)
      pick["priceUnit"] = _normalize_unit(pick.get("priceUnit") or (selected or {}).get("unitGuess") or "€/м2")
      if selected and not pick.get("availableSizes"):
        pick["availableSizes"] = selected.get("sizesGuess") or []
      if exact and float(pick.get("confidence") or 0.0) < 0.7:
        pick["confidence"] = 0.7
      return pick
      
    return {"sourceUrl": search_url, "exactMatch": False, "confidence": 0.0, "reason": "Gemini не върна валиден JSON"}

  finally:
    if local_client:
      await local_client.aclose()


def build_resolved_pricing_table(grouped_items: list[dict[str, Any]], resolved_rows: dict[str, dict[str, Any]]) -> dict[str, Any]:
  min_confidence = float(os.getenv("GEMINI_MIN_ACCEPT_CONFIDENCE", "0.6"))
  items: list[dict[str, Any]] = []
  total = 0.0
  accepted_total = 0.0
  
  for row in grouped_items:
    resolved = {} # default to empty dict
    try:
      key = row.get("key")
      if not key:
        logger.warning(f"Row missing key: {row}")
        continue
        
      # Get resolved data, ensure it's a dict
      raw_resolved = resolved_rows.get(key)
      if raw_resolved and isinstance(raw_resolved, dict):
        resolved = raw_resolved
      
      # Safely extract values with defaults
      price = float(resolved.get("priceValue") or 0.0)
      unit_raw = resolved.get("priceUnit") or "€/м2"
      unit = _normalize_unit(str(unit_raw))
      
      area = float(row.get("areaM2Total") or 0.0)
      qty = float(row.get("qtyTotal") or 0.0)
      edge = float(row.get("edgeMTotal") or 0.0)
      
      confidence = float(resolved.get("confidence") or 0.0)
      exact_match = bool(resolved.get("exactMatch"))
      accepted = confidence >= min_confidence
      
      line = 0.0
      if unit == "€/лист":
        sizes = resolved.get("availableSizes") or []
        sheet_area = _sheet_area_from_sizes(list(sizes))
        if sheet_area and sheet_area > 0:
          sheets = max(1, int(-(-area // sheet_area)))
          line = round(price * sheets, 2)
        else:
          line = round(price * qty, 2)
      elif unit == "€/бр":
        line = round(price * qty, 2)
      elif unit == "€/м":
        line = round(price * edge, 2)
      else:
        line = round(price * area, 2)
        
      total += line
      if accepted:
        accepted_total += line
        
      items.append({
        "key": key,
        "material": row.get("material"),
        "code": row.get("code"),
        "qtyTotal": row.get("qtyTotal"),
        "areaM2Total": row.get("areaM2Total"),
        "edgeMTotal": row.get("edgeMTotal"),
        "supplierName": "Salex",
        "productName": resolved.get("name") or row.get("material"),
        "productCode": resolved.get("codeDetected") or row.get("code"),
        "priceValue": price,
        "priceUnit": unit,
        "lineTotal": line,
        "availableSizes": resolved.get("availableSizes") or [],
        "availabilityText": resolved.get("availabilityText") or "",
        "sourceUrl": resolved.get("sourceUrl"),
        "imageUrl": resolved.get("imageUrl"),
        "exactMatch": exact_match,
        "confidence": confidence,
        "accepted": accepted,
        "acceptanceThreshold": min_confidence,
        "reason": resolved.get("reason") or "",
      })
    except Exception as e:
      logger.error(f"Error processing row in table builder: {e}\nRow: {row}")
      continue

  resolved_count = sum(1 for x in items if x.get("accepted"))
  return {
    "items": items,
    "summary": {
      "total": round(total, 2),
      "acceptedTotal": round(accepted_total, 2),
      "totalItems": len(items),
      "resolvedExact": resolved_count,
      "needsReview": len(items) - resolved_count,
      "acceptanceThreshold": min_confidence,
    },
  }

