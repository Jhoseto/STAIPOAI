import asyncio
import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

from .embeddings import get_embedding
from ..supabase_client import get_supabase_admin, get_supabase_async_admin
from ..state import STOPPED_RUN_IDS

logger = logging.getLogger(__name__)

class ScraperStoppedException(Exception):
    """Custom exception to halt the scraper immediately."""
    pass

SALEX_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

SALEX_BASE = "https://salex.bg"
SEED_CATEGORIES = [
    ("lpch_uni", "Ламинирани Уни", "https://salex.bg/laminirani-ploskosti/uni/"),
    ("lpch_darv", "Ламинирани Дървесни", "https://salex.bg/laminirani-ploskosti/darvesni/"),
    ("lpch_fantasy", "Ламинирани Fantasy", "https://salex.bg/laminirani-ploskosti/fantasy/"),
    ("mdf_akril", "МДФ Акрил", "https://salex.bg/mdf-s-dekorativni-pokritiya-kolekciya-exclusive/mdf-akril/"),
    ("mdf_pet", "МДФ PET", "https://salex.bg/mdf-s-dekorativni-pokritiya-kolekciya-exclusive/mdf-s-pet-folio/"),
    ("mdf_fenix", "МДФ Fenix", "https://salex.bg/mdf-s-dekorativni-pokritiya-kolekciya-exclusive/mdf-fenix/"),
    ("mdf_surov", "МДФ Суров", "https://salex.bg/mdf/surov/"),
    ("mdf_cveten", "МДФ Цветен", "https://salex.bg/mdf/cveten/"),
    ("plotove", "Работни плотове", "https://salex.bg/rabotni-plotove-garbove-i-aksesoari/rabotni-plotove/"),
    ("kanti_abs", "ABS Кантове", "https://salex.bg/kantove/abs-kantove/"),
    ("kanti_akril", "Акрилни Кантове", "https://salex.bg/kantove/akrilni-kantove/"),
    ("panti", "Панти", "https://salex.bg/panti/standartni-panti/"),
    ("drajki", "Дръжки", "https://salex.bg/drajki-i-zakachalki/drajki/"),
    ("hpl", "ХПЛ Стандартни", "https://salex.bg/hpl-listi/standartni/"),
]

DISCOVERY_ENTRYPOINTS = [
    "https://salex.bg/",
    "https://salex.bg/laminirani-ploskosti/",
    "https://salex.bg/mdf/",
    "https://salex.bg/kantove/",
    "https://salex.bg/panti/",
    "https://salex.bg/drajki-i-zakachalki/",
    "https://salex.bg/rabotni-plotove-garbove-i-aksesoari/",
]

DISCOVERY_INCLUDE_KEYWORDS = (
    "laminirani-ploskosti",
    "mdf",
    "kant",
    "panti",
    "drajki",
    "obkov",
    "rabotni-plotove",
    "garbove",
    "hpl",
)


def _set_state(state: Any, **kwargs: Any) -> None:
    if not state:
        return
    for key, value in kwargs.items():
        setattr(state, key, value)


def _norm_space(s: str | None) -> str:
    return re.sub(r"\s+", " ", (s or "").strip())


def _slugify(s: str | None) -> str:
    txt = (s or "").lower()
    txt = re.sub(r"[^a-z0-9а-я]+", "-", txt, flags=re.IGNORECASE)
    return re.sub(r"-+", "-", txt).strip("-") or "category"


def _canonical_url(raw: str) -> str:
    if not raw:
        return ""
    abs_url = urljoin(SALEX_BASE, raw)
    parsed = urlparse(abs_url)
    if parsed.netloc and "salex.bg" not in parsed.netloc:
        return ""
    path = re.sub(r";jsessionid=[^/?#]+", "", parsed.path, flags=re.IGNORECASE)
    path = re.sub(r"/{2,}", "/", path)
    if path != "/":
        path = path.rstrip("/") + "/"
    return f"{SALEX_BASE}{path}"


def _is_product_url(url: str) -> bool:
    u = _canonical_url(url).lower()
    if not u:
        return False
    if any(skip in u for skip in ["/tools-box", "/image/", "/cache/", "/tag/", "/blog/", "/cart", "/checkout"]):
        return False
    return bool(re.search(r"-\d+/$", u))


def _is_category_url(url: str) -> bool:
    u = _canonical_url(url).lower()
    if not u or _is_product_url(u):
        return False
    blocked = ["?s=", "/my-account", "/wishlist", "/cart", "/checkout", "/wp-", "/tag/", "/author/", "/kontakt", "/za-nas"]
    if any(b in u for b in blocked):
        return False
    if not any(k in u for k in DISCOVERY_INCLUDE_KEYWORDS):
        return False
    return bool(re.search(r"salex\.bg/.+/$", u))


def _unit_from_context(type_key: str, category_path: str) -> str:
    txt = f"{type_key} {category_path}".lower()
    if "кант" in txt:
        return "€/м"
    if any(k in txt for k in ["панти", "дръжк", "обков", "аксесоар"]):
        return "€/бр"
    if "лист" in txt or "hpl" in txt or "плоск" in txt:
        return "€/лист"
    return "€/м2"


def _normalize_type(category_path: str, url: str) -> str:
    txt = f"{category_path} {url}".lower()
    if any(k in txt for k in ["плоск", "lpch", "mdf", "hpl", "egger", "fundermax"]):
        return "ploskosti"
    if "кант" in txt:
        return "kantove"
    if any(k in txt for k in ["пант", "водач", "дръжк", "обков", "механиз"]):
        return "obkov"
    if "плот" in txt:
        return "plotove"
    return "aksesoari"


def _extract_category_links(html: str) -> list[tuple[str, str]]:
    soup = BeautifulSoup(html, "lxml")
    links: list[tuple[str, str]] = []
    for tag in soup.select("[data-url], a[href]"):
        href = tag.get("data-url") or tag.get("href") or ""
        url = _canonical_url(href)
        if not _is_category_url(url):
            continue
        label = _norm_space(tag.get_text(" ", strip=True)) or _norm_space(tag.get("title") or "")
        if len(label) < 2:
            label = url.rstrip("/").split("/")[-1].replace("-", " ").strip().title()
        links.append((label, url))
    # dedupe by URL
    out: list[tuple[str, str]] = []
    seen: set[str] = set()
    for name, url in links:
        if url in seen:
            continue
        seen.add(url)
        out.append((name, url))
    return out


def _parse_products_from_page(
    html: str,
    category_key: str,
    category_leaf: str,
    category_path: str,
) -> list[dict[str, Any]]:
    soup = BeautifulSoup(html, "lxml")
    img_map: dict[str, str] = {}
    for a in soup.select("a[href]"):
        href = _canonical_url(a.get("href", ""))
        if not href:
            continue
        img_el = a.find("img")
        if img_el:
            src = (img_el.get("src", "") or img_el.get("data-src", "")).strip()
            if src:
                img_map[href] = urljoin(SALEX_BASE, src)

    results: list[dict[str, Any]] = []
    seen_urls: set[str] = set()
    for a_tag in soup.select("a[href]"):
        source_url = _canonical_url(a_tag.get("href", ""))
        if not _is_product_url(source_url) or source_url in seen_urls:
            continue
        full_text = a_tag.get_text(separator="\n", strip=True)
        if not full_text:
            continue
        lines = [l.strip() for l in full_text.split("\n") if l.strip()]
        if len(lines) < 2:
            continue
        name_lines: list[str] = []
        price_eur: float | None = None
        for line in lines:
            euro_match = re.search(r"([\d.,]+)\s*€", line)
            if euro_match:
                try:
                    price_eur = float(euro_match.group(1).replace(",", "."))
                except ValueError:
                    price_eur = None
            elif re.search(r"[\d.,]+\s*лв", line, re.IGNORECASE):
                continue
            else:
                name_lines.append(line)
        if price_eur is None:
            continue
        name = _norm_space(" ".join(name_lines))
        if not name:
            continue
        seen_urls.add(source_url)
        id_match = re.search(r"-(\d+)/$", source_url)
        product_id = id_match.group(1) if id_match else uuid.uuid4().hex[:8]
        code = ""
        code_match = re.search(r"н\.([A-Z0-9]+(?:\s+ST\d+)?)", name)
        if code_match:
            code = code_match.group(1).strip()
        else:
            gen_code = re.search(r"\b([A-Z]{1,2}\d{3,4}(?:\s*ST\d+)?)\b", name)
            if gen_code:
                code = gen_code.group(1).strip()
        thickness = None
        thick_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:мм|mm)\b", name, re.IGNORECASE)
        if thick_match:
            thickness = float(thick_match.group(1))
        brand = "Други"
        name_lower = name.lower()
        if "egger" in name_lower:
            brand = "Egger"
        elif "fundermax" in name_lower:
            brand = "Fundermax"
        elif "cleaf" in name_lower:
            brand = "Cleaf"
        elif "sonae" in name_lower:
            brand = "Sonae"
        results.append(
            {
                "id": str(uuid.uuid5(uuid.NAMESPACE_URL, source_url)),
                "salex_id": product_id,
                "name": name,
                "type": category_key,
                "category": category_leaf,
                "categoryPath": category_path,
                "brand": brand,
                "code": code,
                "thicknessMm": thickness,
                "priceEur": price_eur,
                "pricePerUnit": price_eur,
                "unit": _unit_from_context(category_key, category_path),
                "sourceUrl": source_url,
                "imageUrl": img_map.get(source_url, ""),
                "lastScrapedAt": datetime.now(timezone.utc).isoformat(),
            }
        )
    return results


def _get_page_count(html: str) -> int:
    soup = BeautifulSoup(html, "lxml")
    pages: list[int] = []
    for a in soup.select("a[href]"):
        href = a.get("href", "")
        for pattern in [r"/page-(\d+)/", r"[?&]page=(\d+)"]:
            m = re.search(pattern, href)
            if m:
                pages.append(int(m.group(1)))
    return max(pages) if pages else 1


class SalexScraper:
    def __init__(self, run_id: str):
        self.admin = get_supabase_admin()
        self.run_id = run_id
        self._unsupported_columns: set[str] = set()
        self._seen_product_urls: set[str] = set()
        self._discovered_products: set[str] = set()
        self._staged_by_id: dict[str, dict[str, Any]] = {}

        # Local stats cache to avoid hammering the DB
        self.stats = {
            "current_category": None,
            "items_added": 0,
            "items_processed": 0,
            "categories_discovered": 0,
            "categories_processed": 0,
            "products_discovered_total": 0,
            "unique_products_total": 0,
            "pending_new": 0,
            "pending_updated": 0,
            "pending_missing": 0,
            "last_item_name": None
        }
        self._last_db_update = datetime.now(timezone.utc)

    async def _check_stop(self):
        """Checks if stop_requested is True in the DB and raises ScraperStoppedException if so."""
        # 1. Check in-memory state first (immediate result from same process)
        if str(self.run_id) in STOPPED_RUN_IDS:
            logger.info(f"🛑 STOP SIGNAL (IN-MEMORY) for run {self.run_id}")
            raise ScraperStoppedException()

        # 2. Check DB as fallback (async to avoid blocking loop)
        try:
            async_admin = await get_supabase_async_admin()
            res = await async_admin.table("scrape_runs").select("stop_requested").eq("id", self.run_id).execute()
            if res.data:
                requested = res.data[0].get("stop_requested")
                if requested:
                    logger.info(f"🛑 STOP SIGNAL (DATABASE) for run {self.run_id}")
                    raise ScraperStoppedException()
        except ScraperStoppedException:
            raise
        except Exception as e:
            logger.warning(f"Error checking stop signal for {self.run_id}: {e}")

    def _sync_state(self, force=False):
        now = datetime.now(timezone.utc)
        if force or (now - self._last_db_update).total_seconds() > 3.0:
            try:
                self.admin.table("scrape_runs").update({
                    "current_category": self.stats["current_category"],
                    "items_added": self.stats["items_added"],
                    "items_processed": self.stats["items_processed"],
                    "categories_discovered": self.stats["categories_discovered"],
                    "categories_processed": self.stats["categories_processed"],
                    "products_discovered_total": self.stats["products_discovered_total"],
                    "unique_products_total": self.stats["unique_products_total"],
                    "pending_new": self.stats["pending_new"],
                    "pending_updated": self.stats["pending_updated"],
                    "pending_missing": self.stats["pending_missing"],
                    "last_item_name": self.stats["last_item_name"],
                }).eq("id", self.run_id).execute()
                self._last_db_update = now
            except Exception as e:
                logger.error(f"Failed to sync state to DB: {e}")

    async def discover_categories(self, client: httpx.AsyncClient) -> list[dict[str, str]]:
        self.stats["current_category"] = "Откриване на категории"
        self._sync_state()

        queue: list[tuple[str, list[str], int]] = []
        for _, name, url in SEED_CATEGORIES:
            queue.append((_canonical_url(url), [name], 0))
        for url in DISCOVERY_ENTRYPOINTS:
            queue.append((_canonical_url(url), [], 0))

        visited: set[str] = set()
        discovered: dict[str, dict[str, str]] = {}
        max_depth = 1  # Reduced depth for faster discovery
        max_pages = 20  # Reduced pages for faster discovery
        processed_pages = 0
        pages_without_new_cats = 0

        while queue:
            await self._check_stop()
            if processed_pages >= max_pages or pages_without_new_cats > 10:
                logger.info("Discovery limits reached. Continuing with found categories.")
                break
            current_url, path_parts, depth = queue.pop(0)
            if not current_url or current_url in visited:
                continue
            visited.add(current_url)
            processed_pages += 1
            try:
                resp = await client.get(current_url)
                if resp.status_code >= 300:
                    continue
            except Exception:
                continue
            
            links = _extract_category_links(resp.text)
            new_cats_found_this_page = 0
            
            for link_name, link_url in links:
                if not _is_category_url(link_url):
                    continue
                next_path = path_parts + [link_name]
                key = _canonical_url(link_url)
                if key not in discovered:
                    new_cats_found_this_page += 1
                    norm_type = _normalize_type(" > ".join(next_path), link_url)
                    discovered[key] = {
                        "url": key,
                        "name": link_name,
                        "path": " > ".join(p for p in next_path if p),
                        "type": norm_type,
                    }
                    self.stats["categories_discovered"] = len(discovered)
                    self.stats["current_category"] = f"Откриване на категории ({len(discovered)})"
                    self._sync_state()
                if depth < max_depth:
                    queue.append((link_url, next_path, depth + 1))
            
            if new_cats_found_this_page == 0:
                pages_without_new_cats += 1
            else:
                pages_without_new_cats = 0

        for seed_key, seed_name, seed_url in SEED_CATEGORIES:
            c_url = _canonical_url(seed_url)
            if c_url not in discovered:
                discovered[c_url] = {
                    "url": c_url,
                    "name": seed_name,
                    "path": seed_name,
                    "type": seed_key,
                }

        out = list(discovered.values())
        self.stats["categories_discovered"] = len(out)
        self._sync_state(force=True)
        return out

    async def scrape_category(self, client: httpx.AsyncClient, category: dict[str, str], index: int, total: int):
        key = category["type"]
        name = category["name"]
        base_url = category["url"]
        path = category["path"]
        logger.info(f"▶ [{index}/{total}] {name} ({base_url})")
        
        self.stats["current_category"] = name
        self.stats["categories_processed"] = index
        self._sync_state()

        try:
            resp = await client.get(base_url)
            if resp.status_code != 200:
                logger.warning(f"  ✗ HTTP {resp.status_code} for {base_url}")
                return
        except Exception as e:
            logger.error(f"  ✗ {e}")
            return

        total_pages = _get_page_count(resp.text)
        logger.info(f"  📄 {total_pages} страница(и)")
        page_html = resp.text
        for page_num in range(1, total_pages + 1):
            await self._check_stop()

            if page_num > 1:
                page_url = base_url.rstrip("/") + f"/page-{page_num}/"
                try:
                    r = await client.get(page_url)
                    page_html = r.text
                except Exception as e:
                    logger.error(f"  ✗ страница {page_num}: {e}")
                    continue
            products = _parse_products_from_page(page_html, key, name, path)
            logger.info(f"  ✓ стр.{page_num}: {len(products)} продукта")
            for p in products:
                await self._check_stop()
                self._discovered_products.add(p["sourceUrl"])
                self.stats["products_discovered_total"] = len(self._discovered_products)
                await self._upsert_product(p)
            self._sync_state()
            await asyncio.sleep(0.5)

    async def _upsert_product(self, item: dict[str, Any]):
        source_url = _canonical_url(str(item.get("sourceUrl") or ""))
        if not source_url or source_url in self._seen_product_urls:
            return
        self._seen_product_urls.add(source_url)
        item["sourceUrl"] = source_url
        
        # Track in memory for final diff calculation
        self._staged_by_id[item["id"]] = item
        
        self.stats["items_processed"] += 1
        self.stats["last_item_name"] = item["name"]
        
        # Periodically update DB to show progress in UI
        if self.stats["items_processed"] % 10 == 0:
            self._sync_state(force=True)

    @staticmethod
    def _is_changed(old: dict[str, Any], new: dict[str, Any]) -> bool:
        keys = [
            "name", "type", "category", "brand", "code",
            "thicknessMm", "priceEur", "pricePerUnit", "unit", "sourceUrl", "imageUrl",
        ]
        for k in keys:
            if str(old.get(k) or "") != str(new.get(k) or ""):
                return True
        return False

    async def run(self):
        stopped_early = False
        
        # Configure httpx limits to prevent Windows Socket Exhaustion (WinError 10035)
        limits = httpx.Limits(max_keepalive_connections=5, max_connections=10)
        
        try:
            async with httpx.AsyncClient(headers=SALEX_HEADERS, timeout=30.0, limits=limits, follow_redirects=True) as client:
                categories = await self.discover_categories(client)
                self.stats["categories_processed"] = 0
                self.stats["categories_discovered"] = len(categories)
                self._sync_state(force=True)

                for idx, category in enumerate(categories, start=1):
                    await self._check_stop()
                    
                    await self.scrape_category(client, category, idx, len(categories))
                    await asyncio.sleep(0.75)
                
                self.stats["unique_products_total"] = len(self._seen_product_urls)
                self._sync_state(force=True)

        except ScraperStoppedException:
            logger.info("Scraper stopped via exception")
            stopped_early = True
            self.stats["current_category"] = "Спрян"
        except Exception as e:
            logger.error(f"Unexpected scraper error: {e}")
            raise
        finally:
            # Always ensure we transition to stopped or completed and save stats
            self.stats["unique_products_total"] = len(self._seen_product_urls)
            self._sync_state(force=True)

        # Build preview diff vs current DB and insert into scrape_items
        # ...existing code...
        all_existing = []
        limit = 1000
        offset = 0
        while True:
            res = self.admin.table("catalog").select(
                "id, name, type, category, brand, code, thicknessMm, priceEur, pricePerUnit, unit, sourceUrl, imageUrl"
            ).range(offset, offset + limit - 1).execute()
            if not res.data:
                break
            all_existing.extend(res.data)
            if len(res.data) < limit:
                break
            offset += limit

        existing_by_id = {str(r.get("id")): r for r in all_existing if str(r.get("sourceUrl", "")).startswith(SALEX_BASE)}
        staged_by_id = self._staged_by_id
        
        new_count = 0
        updated_count = 0
        unchanged_count = 0
        missing_count = 0
        
        scrape_items_payload = []
        
        for sid, item in staged_by_id.items():
            old = existing_by_id.get(sid)
            action = "unchanged"
            if not old:
                action = "insert"
                new_count += 1
            elif self._is_changed(old, item):
                action = "update"
                updated_count += 1
            else:
                action = "unchanged"
                unchanged_count += 1
                
            scrape_items_payload.append({
                "run_id": self.run_id,
                "action": action,
                "catalog_id": sid if old else None,
                "payload": item
            })

        for eid in existing_by_id.keys():
            if eid not in staged_by_id:
                missing_count += 1
                scrape_items_payload.append({
                    "run_id": self.run_id,
                    "action": "delete",
                    "catalog_id": eid,
                    "payload": existing_by_id[eid]
                })

        # Bulk insert into scrape_items (batch to avoid large requests)
        batch_size = 500
        for i in range(0, len(scrape_items_payload), batch_size):
            batch = scrape_items_payload[i:i+batch_size]
            self.admin.table("scrape_items").insert(batch).execute()

        self.stats["items_added"] = new_count
        self.stats["pending_new"] = new_count
        self.stats["pending_updated"] = updated_count
        self.stats["pending_missing"] = missing_count
        
        # Check if stop was requested to set correct status
        final_status = "stopped" if stopped_early else "completed"
        
        self.admin.table("scrape_runs").update({
            "status": final_status,
            "finished_at": datetime.now(timezone.utc).isoformat(),
            **self.stats
        }).eq("id", self.run_id).execute()

async def run_full_scrape(run_id: str):
    scraper = SalexScraper(run_id=run_id)
    try:
        await scraper.run()
    except Exception as e:
        logger.error(f"Глобална scraper грешка: {e}")
        try:
            get_supabase_admin().table("scrape_runs").update({
                "status": "failed",
                "error_message": str(e),
                "finished_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", run_id).execute()
        except:
            pass
    finally:
        STOPPED_RUN_IDS.discard(str(run_id))

def get_sync_preview(run_id: str | None) -> dict[str, Any]:
    if not run_id:
        return {"ok": False, "message": "Липсва run_id"}
    
    admin = get_supabase_admin()
    run_info = admin.table("scrape_runs").select("*").eq("id", run_id).execute()
    if not run_info.data:
        return {"ok": False, "message": "Рънът не съществува"}

    items_res = admin.table("scrape_items").select("*").eq("run_id", run_id).execute()
    items = items_res.data or []
    
    counts = {"new": 0, "updated": 0, "missing": 0, "unchanged": 0}
    changed_items = []
    
    for i in items:
        act = i["action"]
        if act == "insert": counts["new"] += 1
        elif act == "update": counts["updated"] += 1
        elif act == "delete": counts["missing"] += 1
        elif act == "unchanged": counts["unchanged"] += 1

        if act != "unchanged":
            changed_items.append({
                "id": i["id"],
                "action": act,
                "catalog_id": i.get("catalog_id"),
                "payload": i["payload"]
            })

    return {
        "ok": True,
        "runId": run_id,
        "counts": counts,
        "items": changed_items
    }

async def apply_sync_actions(
    run_id: str,
    selected_ids: list[str] | None = None,
    clear_after: bool = False,
) -> dict[str, Any]:
    if not run_id:
        return {"ok": False, "message": "Липсва run_id"}
    
    admin = get_supabase_admin()
    run_info = admin.table("scrape_runs").select("*").eq("id", run_id).execute()
    if not run_info.data:
        return {"ok": False, "message": "Рънът не съществува"}

    items_res = admin.table("scrape_items").select("*").eq("run_id", run_id).execute()
    items = items_res.data or []

    if selected_ids is not None:
        selected_set = set(selected_ids)
        items = [i for i in items if i["id"] in selected_set]

    inserted = 0
    updated = 0
    deleted = 0

    to_insert = [i["payload"] for i in items if i["action"] == "insert"]
    for item in to_insert:
        emb = await get_embedding(item.get("name", ""))
        if emb:
            item["embedding"] = emb
        # Remove unsupported columns before insert
        if "categoryPath" in item:
            del item["categoryPath"]
        if "salex_id" in item:
            del item["salex_id"]
        
        try:
            admin.table("catalog").upsert(item).execute()
            inserted += 1
        except Exception as e:
            logger.error(f"Error inserting item {item.get('name')}: {e}")

    to_update = [i["payload"] for i in items if i["action"] == "update" and "id" in i["payload"]]
    for item in to_update:
        update_payload = {
            "name": item.get("name"),
            "type": item.get("type"),
            "category": item.get("category"),
            "brand": item.get("brand"),
            "code": item.get("code"),
            "thicknessMm": item.get("thicknessMm"),
            "priceEur": item.get("priceEur"),
            "pricePerUnit": item.get("pricePerUnit"),
            "unit": item.get("unit"),
            "sourceUrl": item.get("sourceUrl"),
            "imageUrl": item.get("imageUrl"),
            "lastScrapedAt": item.get("lastScrapedAt"),
        }
        
        # Ensure we only send non-None fields that exist in DB to prevent schema errors
        clean_payload = {k: v for k, v in update_payload.items() if v is not None}
        
        try:
            admin.table("catalog").update(clean_payload).eq("id", item.get("id")).execute()
            updated += 1
        except Exception as e:
            logger.error(f"Error updating item {item.get('name')}: {e}")

    to_delete = [i["catalog_id"] for i in items if i["action"] == "delete" and i["catalog_id"]]
    if to_delete:
        for catalog_id in to_delete:
            admin.table("catalog").delete().eq("id", catalog_id).execute()
            deleted += 1

    admin.table("scrape_runs").update({
        "status": "applied",
        "finished_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", run_id).execute()

    if clear_after:
        admin.table("scrape_items").delete().eq("run_id", run_id).execute()
        
    return {"ok": True, "runId": run_id, "inserted": inserted, "updated": updated, "deleted": deleted, "cleared": clear_after}
