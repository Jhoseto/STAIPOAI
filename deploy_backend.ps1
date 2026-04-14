# deploy_backend.ps1
# ─────────────────────────────────────────────────────────────────
# Еднократен (и при всяка промяна в backend) deploy на
# staipo-ai-data FastAPI сервиса към Cloud Run.
#
# Изисква: gcloud CLI инсталиран и автентикиран
#   gcloud auth login
#   gcloud config set project YOUR_PROJECT_ID
#
# Стартирай от корена на проекта (STAIPOAI/):
#   .\deploy_backend.ps1
# ─────────────────────────────────────────────────────────────────

$PROJECT_ID   = (gcloud config get-value project 2>$null).Trim()
$REGION       = "europe-west1"
$SERVICE      = "staipo-ai-data"
$IMAGE        = "gcr.io/$PROJECT_ID/${SERVICE}:latest"
$FRONTEND_URL = "https://staiposerver-1083584564861.europe-west1.run.app"

# Supabase & AI keys — четат се от .env в корена
$env_file = Join-Path $PSScriptRoot ".env"
if (Test-Path $env_file) {
    Get-Content $env_file | ForEach-Object {
        if ($_ -match "^\s*([^#][^=]+)=(.*)$") {
            [System.Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), "Process")
        }
    }
}

$SUPABASE_URL              = $env:SUPABASE_URL
$SUPABASE_SERVICE_ROLE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY
$SUPABASE_ANON_KEY         = $env:SUPABASE_ANON_KEY
$GEMINI_API_KEY            = $env:GEMINI_API_KEY

Write-Host "Building backend image: $IMAGE" -ForegroundColor Cyan
gcloud builds submit `
    --tag $IMAGE `
    backend\ai-data

if ($LASTEXITCODE -ne 0) { Write-Error "Build failed!"; exit 1 }

Write-Host "Deploying $SERVICE to Cloud Run ($REGION)..." -ForegroundColor Cyan
gcloud run deploy $SERVICE `
    --image=$IMAGE `
    --region=$REGION `
    --platform=managed `
    --allow-unauthenticated `
    --port=8080 `
    --set-env-vars="SUPABASE_URL=$SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY,SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY,SUPABASE_DB_SCHEMA=public,SUPABASE_STORAGE_BUCKET_UPLOADS=uploads,SUPABASE_STORAGE_BUCKET_OFFERS=offers,GEMINI_API_KEY=$GEMINI_API_KEY,CORS_ALLOW_ORIGINS=$FRONTEND_URL"

if ($LASTEXITCODE -ne 0) { Write-Error "Deploy failed!"; exit 1 }

Write-Host ""
Write-Host "✅ Backend deployed!" -ForegroundColor Green
$BACKEND_URL = (gcloud run services describe $SERVICE --region=$REGION --format="value(status.url)").Trim()
Write-Host "Backend URL: $BACKEND_URL" -ForegroundColor Yellow
Write-Host ""
Write-Host "Сега добави тази стойност в Cloud Build Trigger → Variables:" -ForegroundColor Cyan
Write-Host "  _BACKEND_URL = $BACKEND_URL" -ForegroundColor White
