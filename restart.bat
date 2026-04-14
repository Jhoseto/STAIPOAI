@echo off
setlocal enabledelayedexpansion

REM ============================================
REM STAIPO AI - Restart Script (Windows)
REM - Stops processes on ports 3000 (web) and 8000 (ai-data)
REM - Restarts local Postgres via docker compose
REM - Installs deps (npm + pip) if missing
REM - Starts services in separate windows
REM ============================================

set ROOT=%~dp0

echo.
echo [0/6] Loading environment variables from .env...
if exist "%ROOT%.env" (
  for /f "usebackq tokens=1,* delims==" %%A in ("%ROOT%.env") do (
    set "KEY=%%A"
    set "VAL=%%B"
    if not "!KEY!"=="" (
      if /i not "!KEY:~0,1!"=="#" (
        set "!KEY!=!VAL!"
      )
    )
  )
) else (
  echo WARNING: .env not found in root. Using script defaults.
)

echo.
echo [1/6] Stopping processes on ports 3000 and 8000...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ports=@(3000,8000); foreach($p in $ports){ $c=Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue | Where-Object {$_.State -eq 'Listen'}; foreach($x in $c){ try{ Stop-Process -Id $x.OwningProcess -Force -ErrorAction SilentlyContinue } catch {} } }"

echo.
echo [2/6] Restarting local database (docker compose)...
pushd "%ROOT%"
where docker >nul 2>nul
if errorlevel 1 (
  echo WARNING: Docker is not installed or not in PATH. Skipping DB restart.
) else (
  docker compose -f "%ROOT%backend\infra\docker-compose.yml" down >nul 2>nul
  docker compose -f "%ROOT%backend\infra\docker-compose.yml" up -d
  if errorlevel 1 (
    echo WARNING: docker compose failed. Make sure Docker Desktop is running.
  )
)
popd

echo.
echo [3/6] Ensuring Python venv + dependencies for ai-data...
set AI_DIR=%ROOT%backend\ai-data
if not exist "%AI_DIR%\requirements.txt" (
  echo ERROR: Missing backend requirements file at "%AI_DIR%\requirements.txt"
  goto :end
)
if not exist "%AI_DIR%\.venv\Scripts\python.exe" (
  python -m venv "%AI_DIR%\.venv"
)
call "%AI_DIR%\.venv\Scripts\activate.bat"
python -m pip install --upgrade pip >nul
python -m pip install -r "%AI_DIR%\requirements.txt"

echo.
echo [4/6] Ensuring npm dependencies for Next.js web...
set WEB_DIR=%ROOT%frontend\web
if not exist "%WEB_DIR%\package.json" (
  echo ERROR: Missing frontend package.json at "%WEB_DIR%\package.json"
  goto :end
)
pushd "%WEB_DIR%"
if not exist "node_modules" (
  npm install
)
popd

echo.
echo [5/6] Starting ai-data (FastAPI) in a new window...
start "staipo-ai-data" cmd /k ^
  "cd /d ""%AI_DIR%"" && call .venv\Scripts\activate.bat && set DATABASE_URL=%DATABASE_URL% && set DIRECT_URL=%DIRECT_URL% && set SUPABASE_URL=%SUPABASE_URL% && set SUPABASE_ANON_KEY=%SUPABASE_ANON_KEY% && set SUPABASE_SERVICE_ROLE_KEY=%SUPABASE_SERVICE_ROLE_KEY% && set SUPABASE_STORAGE_BUCKET_UPLOADS=%SUPABASE_STORAGE_BUCKET_UPLOADS% && set SUPABASE_STORAGE_BUCKET_OFFERS=%SUPABASE_STORAGE_BUCKET_OFFERS% && set GEMINI_API_KEY=%GEMINI_API_KEY% && set GEMINI_MODEL_FAST=%GEMINI_MODEL_FAST% && set GEMINI_MODEL_FLAGSHIP=%GEMINI_MODEL_FLAGSHIP% && set GEMINI_IMAGE_MODE=%GEMINI_IMAGE_MODE% && set GEMINI_IMAGE_MODEL_FAST=%GEMINI_IMAGE_MODEL_FAST% && set GEMINI_IMAGE_MODEL_PREMIUM=%GEMINI_IMAGE_MODEL_PREMIUM% && set CORS_ALLOW_ORIGINS=%CORS_ALLOW_ORIGINS% && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo.
echo [6/6] Starting web (Next.js) in a new window...
start "staipo-web" cmd /k ^
  "cd /d ""%WEB_DIR%"" && set AI_DATA_URL=%AI_DATA_URL% && set NEXT_PUBLIC_AI_DATA_URL=%NEXT_PUBLIC_AI_DATA_URL% && set NEXT_PUBLIC_SUPABASE_URL=%NEXT_PUBLIC_SUPABASE_URL% && set NEXT_PUBLIC_SUPABASE_ANON_KEY=%NEXT_PUBLIC_SUPABASE_ANON_KEY% && set NEXT_PUBLIC_SITE_URL=%NEXT_PUBLIC_SITE_URL% && npm run dev"

echo.
echo Done. Web: http://localhost:3000  ^|  AI/Data: http://localhost:8000
echo.
:end
endlocal

