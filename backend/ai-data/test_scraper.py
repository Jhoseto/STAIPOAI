import httpx
from bs4 import BeautifulSoup
import re

URL = "https://salex.bg/laminirani-ploskosti/"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

async def test_scraping():
    async with httpx.AsyncClient(headers=HEADERS, timeout=30.0) as client:
        print(f"Fetching {URL}...")
        res = await client.get(URL, follow_redirects=True)
        print(f"Status: {res.status_code}")
        
        soup = BeautifulSoup(res.text, "lxml")
        
        # Test Container
        products = soup.select(".product-layout")
        print(f"Found {len(products)} products with .product-layout")
        
        if not products:
            # Fallback test
            products = soup.select(".product-thumb")
            print(f"Found {len(products)} products with .product-thumb")
            
        for i, p in enumerate(products[:5]):
            print(f"\n--- Product {i+1} ---")
            
            # Title
            title_el = p.select_one("p:nth-of-type(1) > span")
            name = title_el.get_text(strip=True) if title_el else "N/A"
            print(f"Name: {name}")
            
            # Price
            price_area = p.select_one("p:nth-of-type(2)")
            price_text = price_area.get_text(strip=True) if price_area else "N/A"
            print(f"Price Raw: {price_text}")
            
            # BGN Price
            bgn_match = re.search(r"/\s*(\d+(?:[.,]\d{1,2})?)\s*лв", price_text)
            if bgn_match:
                print(f"Parsed BGN: {bgn_match.group(1)}")
            
            # Link
            link_el = p.select_one("a")
            link = link_el.get("href") if link_el else "N/A"
            print(f"Link: {link}")
            
            # Image
            img_el = p.select_one("img")
            img = img_el.get("src") if img_el else "N/A"
            print(f"Image: {img}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_scraping())
