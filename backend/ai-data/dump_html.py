import httpx, re
from bs4 import BeautifulSoup

URL = "https://salex.bg/laminirani-ploskosti/uni/"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

res = httpx.get(URL, headers=HEADERS, follow_redirects=True)
soup = BeautifulSoup(res.text, "lxml")

output_lines = []
found = 0
for a in soup.select("a[href]"):
    href = a.get("href", "")
    if re.search(r'-\d+/$', href) and "/tools-box" not in href and href.startswith("/"):
        found += 1
        # dump the a tag and its parent
        output_lines.append(f"=== Match {found}: {href[:80]} ===")
        output_lines.append(f"A tag text: '{a.get_text(separator='|', strip=True)[:200]}'")
        output_lines.append(f"A tag inner: {str(a)[:500]}")
        output_lines.append(f"Parent tag: {a.parent.name} class={a.parent.get('class')}")
        output_lines.append(f"Grandparent: {a.parent.parent.name if a.parent.parent else 'none'} class={a.parent.parent.get('class') if a.parent.parent else 'none'}")
        output_lines.append("")
        if found >= 3:
            break

with open("html_dump.html", "w", encoding="utf-8") as f:
    f.write("\n".join(output_lines))

print(f"Found {found} links, dumped to html_dump.html")
