-- Миграция для добавления таблицы примеров работ (Портфолио)
CREATE TABLE IF NOT EXISTS public.portfolio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    car_model TEXT NOT NULL,
    description TEXT DEFAULT '',
    image_url TEXT NOT NULL,
    before_image_url TEXT DEFAULT '',
    price_tag NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.portfolio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access portfolio" ON public.portfolio;
CREATE POLICY "Public access portfolio" ON public.portfolio FOR ALL USING (true) WITH CHECK (true);
