-- Таблица за рънове на скрапера
CREATE TABLE IF NOT EXISTS public.scrape_runs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    status text NOT NULL DEFAULT 'running', -- running, completed, failed, applied
    current_category text,
    items_added integer DEFAULT 0,
    items_processed integer DEFAULT 0,
    categories_discovered integer DEFAULT 0,
    categories_processed integer DEFAULT 0,
    products_discovered_total integer DEFAULT 0,
    unique_products_total integer DEFAULT 0,
    pending_new integer DEFAULT 0,
    pending_updated integer DEFAULT 0,
    pending_missing integer DEFAULT 0,
    last_item_name text,
    error_message text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    finished_at timestamp with time zone
);

-- Таблица за временно съхранение на извлечените артикули
CREATE TABLE IF NOT EXISTS public.scrape_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    run_id uuid NOT NULL REFERENCES public.scrape_runs(id) ON DELETE CASCADE,
    action text NOT NULL, -- insert, update, unchanged, delete
    catalog_id uuid, -- ID на артикула от таблица catalog (ако съществува)
    payload jsonb NOT NULL, -- Всички данни (name, priceEur, imageUrl и т.н.)
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Индекси за бързо търсене
CREATE INDEX IF NOT EXISTS idx_scrape_items_run_id ON public.scrape_items(run_id);
CREATE INDEX IF NOT EXISTS idx_scrape_items_action ON public.scrape_items(action);
CREATE INDEX IF NOT EXISTS idx_scrape_runs_status ON public.scrape_runs(status);

-- RLS (ако е необходимо)
ALTER TABLE public.scrape_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scrape_items ENABLE ROW LEVEL SECURITY;

-- Service Role policies
CREATE POLICY "Enable ALL for service role on scrape_runs" ON public.scrape_runs AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for service role on scrape_items" ON public.scrape_items AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Anonymous/Authenticated policies (само четене, ако фронтендът ги чете директно, но тук ги четем през FastAPI)
CREATE POLICY "Enable read for authenticated users on scrape_runs" ON public.scrape_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read for authenticated users on scrape_items" ON public.scrape_items FOR SELECT TO authenticated USING (true);
