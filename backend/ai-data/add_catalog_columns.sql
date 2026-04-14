-- ==========================================
-- CATALOG SCHEMA MIGRATION - Embedding Fix
-- Paste this in Supabase SQL Editor → Run
-- ==========================================
ALTER TABLE public.catalog DROP COLUMN IF EXISTS "embedding";
ALTER TABLE public.catalog ADD COLUMN "embedding" vector(3072);
