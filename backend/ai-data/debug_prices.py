import httpx
import re
from bs4 import BeautifulSoup

URL = "https://salex.bg/laminirani-ploskosti/uni/"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

def main():
    res = httpx.get(URL, headers=HEADERS, follow_redirects=True)
    soup = BeautifulSoup(res.text, "lxml")
    links = soup.select("a[href]")
    
    product_links = [a for a in links if re.search(r'-\d+/$', a.get("href", ""))]
    print(f"Product links found: {len(product_links)}")
    
    for a in product_links[:5]:
        href = a.get("href", "")
        full_text = a.get_text(separator="\n", strip=True)
        lines = [l.strip() for l in full_text.split("\n") if l.strip()]
        
        print(f"\n--- href: {href[:60]} ---")
        print(f"Lines ({len(lines)}):")
        for i, l in enumerate(lines):
            # Use ascii for safety
            safe_l = l.encode('ascii', 'replace').decode('ascii')
            print(f"  [{i}]: {safe_l}")
        
        if lines:
            price_line = lines[-1]
            euro_match = re.search(r'([\d.,]+)\s*\xe2\x82\xac', price_line.encode('utf-8'), re.IGNORECASE)
            
            # Try alternative
            euro_match2 = re.search(r'([\d.,]+)\s*EUR', price_line, re.IGNORECASE)
            has_euro = '\u20ac' in price_line
            print(f"  Last line (hex): {price_line.encode('utf-8').hex()[:80]}")
            print(f"  Has euro symbol: {has_euro}")
            print(f"  EUR regex match: {euro_match2}")

if __name__ == "__main__":
    main()
