import os, sys
sys.path.insert(0, 'H:/Apps/STAIPO/STAIPOAI/backend/ai-data')
import httpx
import re
from bs4 import BeautifulSoup

URL = "https://salex.bg/laminirani-ploskosti/uni/"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

res = httpx.get(URL, headers=HEADERS, follow_redirects=True)
soup = BeautifulSoup(res.text, "lxml")

count = 0
for a_tag in soup.select("a[href]"):
    href = a_tag.get("href", "")
    
    if not re.search(r'-\d+/$', href):
        continue
    if "/tools-box" in href or "/image/" in href:
        continue
    if not href.startswith("/") and not href.startswith("https://salex.bg/"):
        continue
    
    img = a_tag.find("img")
    if not img:
        continue
    
    count += 1
    full_text = a_tag.get_text(separator="\n", strip=True)
    lines = [l.strip() for l in full_text.split("\n") if l.strip()]
    
    name_lines = []
    price_eur = None
    for line in lines:
        euro_match = re.search(r'([\d.,]+)\s*\u20ac', line)
        if euro_match:
            price_eur = float(euro_match.group(1).replace(",", "."))
        elif re.search(r'[\d.,]+\s*\u043b\u0432', line):
            pass
        else:
            name_lines.append(line)
    
    name = " ".join(name_lines).strip()
    
    with open("out.txt", "a", encoding="utf-8") as f:
        f.write(f"[{count}] href={href[:60]}\n")
        f.write(f"  lines={lines}\n")
        f.write(f"  name_lines={name_lines}\n")
        f.write(f"  priceEur={price_eur}\n")
        f.write(f"  name={name[:60]}\n\n")
    
    if count >= 3:
        break

print(f"Total products found: {count}")
