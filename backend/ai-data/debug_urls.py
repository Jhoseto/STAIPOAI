import httpx
import re
from bs4 import BeautifulSoup
import sys

URL = "https://salex.bg/laminirani-ploskosti/uni/"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

def main():
    res = httpx.get(URL, headers=HEADERS, follow_redirects=True)
    print(f"Status: {res.status_code}")
    
    soup = BeautifulSoup(res.text, "lxml")
    links = soup.select("a[href]")
    print(f"Total links: {len(links)}")
    
    # links with -NUMBER/ at end 
    product_links = [(a.get("href"), a.get_text(strip=True)[:60]) for a in links if re.search(r'-\d+/$', a.get("href", ""))]
    print(f"\nLinks ending with -NUMBER/: {len(product_links)}")
    for href, text in product_links[:15]:
        print(f"  [{href}] | {text}")
    
    # all hrefs
    all_hrefs = [a.get("href", "") for a in links]
    print(f"\nAll hrefs sample (first 30):")
    for h in all_hrefs[:30]:
        print(f"  {h}")

if __name__ == "__main__":
    main()

sys.stdout.flush()
