
import os
import httpx
import json
from pathlib import Path
from dotenv import load_dotenv

# Load env from root
load_dotenv(Path(__file__).resolve().parents[3] / ".env")

async def test_viz():
    # Use IDs from the project
    project_id = "a090ff6d-78e9-45a5-bba0-a513d0972691"
    # Find a photo ID for this project
    url = f"http://localhost:8000/v1/projects/{project_id}/photos"
    async with httpx.AsyncClient() as client:
        res = await client.get(url)
        photos = res.json().get("items", [])
        if not photos:
            print("No photos found for project")
            return
        
        photo_id = photos[0]["id"]
        style_key = "scandinavian"
        
        print(f"Testing visualization for photo {photo_id} in style {style_key}")
        
        viz_url = f"http://localhost:8000/v1/projects/{project_id}/visualize?photo_id={photo_id}&style_key={style_key}"
        res = await client.post(viz_url, timeout=60.0)
        
        print(f"Status: {res.status_code}")
        try:
            print(f"Response: {json.dumps(res.json(), indent=2)}")
        except:
            print(f"Response (text): {res.text}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_viz())
