import httpx
import re

URL = "https://salex.bg/laminirani-ploskosti/"
HEADERS = {"User-Agent": "Mozilla/5.0"}

def main():
    res = httpx.get(URL, headers=HEADERS)
    classes = re.findall(r'class="([^"]*?catalog-item[^"]*)"', res.text)
    unique_classes = sorted(list(set(classes)))
    print(f"Unique classes containing 'catalog-item': {unique_classes}")
    
    # Check if there are elements with 'col-lg-2' or similar
    grid_classes = re.findall(r'class="([^"]*?col-[^"]*)"', res.text)
    unique_grid = sorted(list(set(grid_classes)))
    print(f"Sample grid classes: {unique_grid[:10]}")

    # Print a snippet of a product-like block
    match = re.search(r'class="[^"]*catalog-item[^"]*".*?</div>', res.text, re.DOTALL)
    if match:
        print(f"Match snippet:\n{match.group(0)[:500]}")

if __name__ == "__main__":
    main()
