import httpx
from bs4 import BeautifulSoup
import re

URL = "https://salex.bg/laminirani-ploskosti/"
HEADERS = {"User-Agent": "Mozilla/5.0"}

def debug_scrape():
    res = httpx.get(URL, headers=HEADERS)
    print(f"URL: {res.url}")
    print(f"Status: {res.status_code}")
    print(f"Length: {len(res.text)}")
    
    # Search for catalog-item in text
    matches = re.findall(r'class="[^"]*catalog-item[^"]*"', res.text)
    print(f"Regex matches for class containing 'catalog-item': {len(matches)}")
    if matches:
        print(f"First match: {matches[0]}")
    
    soup = BeautifulSoup(res.text, "lxml")
    
    # Try different selectors
    print(f"Selector '.catalog-item': {len(soup.select('.catalog-item'))}")
    print(f"Selector '.catalog-item-name': {len(soup.select('.catalog-item-name'))}")
    print(f"Selector 'div.catalog-item': {len(soup.find_all('div', class_='catalog-item'))}")
    
    # If all 0, check what divs ARE there
    if len(soup.select('.catalog-item')) == 0:
        divs = soup.find_all('div', class_=True)
        classes = set()
        for d in divs:
            classes.update(d.get('class'))
        print(f"Sample of found classes (first 20): {sorted(list(classes))[:20]}")

if __name__ == "__main__":
    debug_scrape()
