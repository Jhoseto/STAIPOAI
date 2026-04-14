## GCP deployment (Cloud Run + Cloud SQL + Storage + Scheduler)

Това е **deployment skeleton**, който прави проекта “готов за production”, без да предполага вече настроен GCP акаунт.

### Компоненти
- **Cloud Run service `staipo-web`**: Next.js app (`frontend/web`)
- **Cloud Run service `staipo-ai-data`**: FastAPI service (`backend/ai-data`)
- **Cloud SQL (Postgres + pgvector)**: база данни
- **Cloud Storage buckets**: uploads/offers/catalog cache (по-късно)
- **Cloud Scheduler → Cloud Run job**: нощен Salex scraper (03:00)

### 1) Build & Deploy (примерни команди)
Тук оставяме команди като шаблон (трябва да имаш `gcloud` инсталиран и автентикиран).

#### Web (Next.js)
```bash
gcloud builds submit --tag "gcr.io/$PROJECT_ID/staipo-web:latest" "frontend/web"
gcloud run deploy staipo-web \
  --image "gcr.io/$PROJECT_ID/staipo-web:latest" \
  --region "$REGION" \
  --allow-unauthenticated \
  --set-env-vars "AI_DATA_URL=$AI_DATA_URL"
```

#### AI/Data (FastAPI)
```bash
gcloud builds submit --tag "gcr.io/$PROJECT_ID/staipo-ai-data:latest" "backend/ai-data"
gcloud run deploy staipo-ai-data \
  --image "gcr.io/$PROJECT_ID/staipo-ai-data:latest" \
  --region "$REGION" \
  --allow-unauthenticated \
  --set-env-vars "DATABASE_URL=$DATABASE_URL"
```

### 2) Env променливи
Виж `env.example`.

### 3) Cloud SQL
- Избери Postgres 16
- Инсталирай/активирай `pgvector` extension
- За Cloud Run → Cloud SQL: или Cloud SQL connector, или публичен IP + allowlist (по-лесно за MVP)

### 4) Scheduler за scraper (placeholder)
В този repo scraper-ът е skeleton (`backend/ai-data/app/salex/scraper.py`).
Когато имплементацията е готова, ще добавим Cloud Run Job и Scheduler trigger.

