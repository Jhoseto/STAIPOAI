import httpx
from bs4 import BeautifulSoup
import uuid
import re
import logging
import asyncio
from datetime import datetime, timezone
from typing import Any
from .embeddings import get_embedding
from ..supabase_client import get_supabase_admin

logger = logging.getLogger(__name__)

SALEX_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

# Всички под-категории (проверени URLs)
CATEGORIES = [
    ("lpch_uni",      "Ламинирани Уни",       "https://salex.bg/laminirani-ploskosti/uni/"),
    ("lpch_darv",     "Ламинирани Дървесни",   "https://salex.bg/laminirani-ploskosti/darvesni/"),
    ("lpch_fantasy",  "Ламинирани Fantasy",    "https://salex.bg/laminirani-ploskosti/fantasy/"),
    ("mdf_akril",     "МДФ Акрил",             "https://salex.bg/mdf-s-dekorativni-pokritiya-kolekciya-exclusive/mdf-akril/"),
    ("mdf_pet",       "МДФ PET",               "https://salex.bg/mdf-s-dekorativni-pokritiya-kolekciya-exclusive/mdf-s-pet-folio/"),
    ("mdf_fenix",     "МДФ Fenix",             "https://salex.bg/mdf-s-dekorativni-pokritiya-kolekciya-exclusive/mdf-fenix/"),
    ("mdf_surov",     "МДФ Суров",             "https://salex.bg/mdf/surov/"),
    ("mdf_cveten",    "МДФ Цветен",            "https://salex.bg/mdf/cveten/"),
    ("plotove",       "Работни плотове",       "https://salex.bg/rabotni-plotove-garbove-i-aksesoari/rabotni-plotove/"),
    ("kanti_abs",     "ABS Кантове",           "https://salex.bg/kantove/abs-kantove/"),
    ("kanti_akril",   "Акрилни Кантове",       "https://salex.bg/kantove/akrilni-kantove/"),
    ("panti",         "Панти",                 "https://salex.bg/panti/standartni-panti/"),
    ("drajki",        "Дръжки",                "https://salex.bg/drajki-i-zakachalki/drajki/"),
    ("hpl",           "ХПЛ Стандартни",        "https://salex.bg/hpl-listi/standartni/"),
]


def _parse_products_from_page(html: str, category_key: str, category_name: str) -> list:
    """
    Реалната структура на Salex (UniVersumERP):
    Продуктите са <a href="/slug-ID/"> съдържащ <img> и текст с цена.
    Цените се пресмятат и записват само в ЕВРО.

    ВАЖНО: За всеки продукт на Salex има ДВА <a> тага с еднакъв href:
      1. <a href="..."><img ...></a>          — само снимка, без текст
      2. <a href="...">Наименование...€...</a> — текст, съдържащ цената в евро
    Затова: намираме текст-съдържащите тагове, img-а търсим отделно.
    """
    soup = BeautifulSoup(html, "lxml")
    # Build a map from href -> img_src for all image-bearing anchors
    img_map = {}
    for a in soup.select("a[href]"):
        img_el = a.find("img")
        if img_el:
            h = a.get("href", "")
            src = img_el.get("src", "") or img_el.get("data-src", "")
            if src and h not in img_map:
                img_map[h] = f"https://salex.bg{src}" if src.startswith("/") else src

    results = []
    seen_urls = set()

    for a_tag in soup.select("a[href]"):
        href = a_tag.get("href", "")

        # Продуктовите URLs завършват с -ЧИСЛО/
        if not re.search(r'-\d+/$', href):
            continue
        # Пропускаме asset URLs
        if any(skip in href for skip in ["/tools-box", "/image/", "/cache/"]):
            continue

        # Трябва да съдържа текст (наименование + цена)
        full_text = a_tag.get_text(separator="\n", strip=True)
        if not full_text:
            continue

        lines = [l.strip() for l in full_text.split("\n") if l.strip()]
        if len(lines) < 2:
            continue

        # Разделяме наименование от цени
        name_lines = []
        price_eur = None
        for line in lines:
            euro_match = re.search(r'([\d.,]+)\s*\u20ac', line)
            if euro_match:
                price_eur = float(euro_match.group(1).replace(",", "."))
            elif re.search(r'[\d.,]+\s*\u043b\u0432', line):
                pass  # Пропускаме левовете
            else:
                name_lines.append(line)

        if price_eur is None:
            continue

        name = " ".join(name_lines).strip()
        if not name:
            continue

        source_url = f"https://salex.bg{href}" if href.startswith("/") else href
        if source_url in seen_urls:
            continue
        seen_urls.add(source_url)

        # ID от URL
        id_match = re.search(r'-(\d+)/$', href)
        product_id = id_match.group(1) if id_match else uuid.uuid4().hex[:8]

        # Изображение (от img_map)
        image_url = img_map.get(href, "")

        # Код: "н.U220 ST9" или "н.H1316 ST17"
        code = ""
        code_match = re.search(r'н\.([A-Z0-9]+(?:\s+ST\d+)?)', name)
        if code_match:
            code = code_match.group(1).strip()
        else:
            # Fallback към общи кодове
            gen_code = re.search(r'\b([A-Z]{1,2}\d{3,4}|[A-Z]\d{3})\b', name)
            if gen_code:
                code = gen_code.group(1)

        # Дебелина: "18мм", "19мм"
        thickness = None
        thick_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:мм|mm)\b', name, re.IGNORECASE)
        if thick_match:
            thickness = float(thick_match.group(1))

        # Бранд
        brand = "Други"
        name_lower = name.lower()
        if "egger" in name_lower:       brand = "Egger"
        elif "fundermax" in name_lower:  brand = "Fundermax"
        elif "cleaf" in name_lower:      brand = "Cleaf"
        elif "sonae" in name_lower:      brand = "Sonae"

        # Мерна единица
        unit = "€/м2"
        if "кант" in category_name.lower():
            unit = "€/м"
        elif category_key in ("panti", "drajki"):
            unit = "€/бр"

        results.append({
            "id": str(uuid.uuid5(uuid.NAMESPACE_URL, source_url)),
            "salex_id": product_id,
            "name": name,
            "type": category_key,
            "category": category_name,
            "brand": brand,
            "code": code,
            "thicknessMm": thickness,
            "priceEur": price_eur,
            "pricePerUnit": price_eur,  # основна цена = евро
            "unit": unit,
            "sourceUrl": source_url,
            "imageUrl": image_url,
            "lastScrapedAt": datetime.now(timezone.utc).isoformat(),
        })

    return results


def _get_page_count(html: str) -> int:
    soup = BeautifulSoup(html, "lxml")
    pages = []
    for a in soup.select("a[href*='/page-']"):
        m = re.search(r'/page-(\d+)/', a.get("href", ""))
        if m:
            pages.append(int(m.group(1)))
    return max(pages) if pages else 1


class SalexScraper:
    def __init__(self, state: Any = None):
        self.admin = get_supabase_admin()
        self.state = state

    async def scrape_category(self, key: str, name: str, base_url: str):
        logger.info(f"▶ {name} ({base_url})")
        if self.state:
            self.state.current_category = name

        async with httpx.AsyncClient(headers=SALEX_HEADERS, timeout=30.0,
                                     follow_redirects=True) as client:
            # Първа страница
            try:
                resp = await client.get(base_url)
                if resp.status_code != 200:
                    logger.warning(f"  ✗ HTTP {resp.status_code}")
                    return
            except Exception as e:
                logger.error(f"  ✗ {e}")
                return

            total_pages = _get_page_count(resp.text)
            logger.info(f"  📄 {total_pages} страница(и)")

            for page_num in range(1, total_pages + 1):
                if page_num == 1:
                    html = resp.text
                else:
                    page_url = base_url.rstrip("/") + f"/page-{page_num}/"
                    try:
                        r = await client.get(page_url)
                        html = r.text
                    except Exception as e:
                        logger.error(f"  ✗ страница {page_num}: {e}")
                        continue

                products = _parse_products_from_page(html, key, name)
                logger.info(f"  ✓ стр.{page_num}: {len(products)} продукта")

                for p in products:
                    await self._upsert_product(p)

                await asyncio.sleep(1.2)

    async def _upsert_product(self, item: dict):
        try:
            existing = self.admin.table("catalog").select("id").eq("id", item["id"]).execute()

            if not existing.data:
                emb = await get_embedding(item["name"])
                if emb:
                    item["embedding"] = emb
                self.admin.table("catalog").insert(item).execute()
                if self.state:
                    self.state.items_added += 1
            else:
                self.admin.table("catalog").update({
                    "priceEur": item["priceEur"],
                    "pricePerUnit": item["pricePerUnit"],
                    "lastScrapedAt": item["lastScrapedAt"],
                }).eq("id", item["id"]).execute()

            if self.state:
                self.state.items_processed += 1
                self.state.last_item_name = item["name"]

        except Exception as e:
            logger.error(f"  ✗ upsert грешка: {e} | {item.get('name', '')[:50]}")


async def run_full_scrape():
    scraper = SalexScraper()
    for key, name, url in CATEGORIES:
        await scraper.scrape_category(key, name, url)
        await asyncio.sleep(2.0)


async def run_full_scrape_with_state(state: Any):
    scraper = SalexScraper(state=state)
    try:
        for key, name, url in CATEGORIES:
            await scraper.scrape_category(key, name, url)
            await asyncio.sleep(2.0)
    except Exception as e:
        logger.error(f"Глобална scraper грешка: {e}")
    finally:
        state.is_running = False
        state.finished_at = datetime.now(timezone.utc).isoformat()
