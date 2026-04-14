import httpx
import re
from bs4 import BeautifulSoup

URL = "https://salex.bg/laminirani-ploskosti/uni/"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

def main():
    res = httpx.get(URL, headers=HEADERS, follow_redirects=True)
    soup = BeautifulSoup(res.text, "lxml")
    links = soup.select("a[href]")
    
    # Try various patterns
    pattern1 = [a for a in links if re.search(r'-\d+/$', a.get("href", ""))]
    pattern2 = [a for a in links if re.search(r'-\d+/', a.get("href", ""))]
    pattern3 = [a for a in links if re.search(r'salex.bg/.*-\d+', a.get("href", ""))]
    
    print(f"Pattern -DIGIT/$: {len(pattern1)}")
    print(f"Pattern -DIGIT/ (no end): {len(pattern2)}")
    print(f"Full URL with digit: {len(pattern3)}")
    
    if pattern2:
        a = pattern2[0]
        href = a.get("href", "")
        print(f"\nFirst match href: {href}")
        print(f"Regex test: {re.search(chr(45) + r'\\d+/$', href)}")
        # Character codes
        print(f"Last chars of href: {[hex(ord(c)) for c in href[-5:]]}")

if __name__ == "__main__":
    main()
