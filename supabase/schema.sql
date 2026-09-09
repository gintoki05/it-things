-- ============================================================
-- IT-THINGS.EXE / PANTRY.EXE DATABASE SCHEMA (SUPABASE)
-- Jalankan query ini di SQL Editor dashboard Supabase Anda.
-- ============================================================

-- 1. Table: pantry_items (Item usulan belanja konsumsi/snack)
CREATE TABLE IF NOT EXISTS public.pantry_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT DEFAULT 'Snack',
    detail TEXT,
    emoji TEXT DEFAULT '📦',
    month_period TEXT NOT NULL, -- Format: 'YYYY-MM', misal '2026-09'
    proposed_by_id TEXT NOT NULL,
    proposed_by_name TEXT NOT NULL,
    proposed_by_avatar TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Table: pantry_votes (Pencatatan 1-vote per user per item)
CREATE TABLE IF NOT EXISTS public.pantry_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.pantry_items(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_avatar TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(item_id, user_id) -- 1 orang hanya boleh vote 1x per item usulan
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.pantry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pantry_votes ENABLE ROW LEVEL SECURITY;

-- Buat policies publik untuk read & authenticated untuk insert/delete
CREATE POLICY "Allow public read on pantry_items" ON public.pantry_items FOR SELECT USING (true);
CREATE POLICY "Allow public insert on pantry_items" ON public.pantry_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on pantry_items" ON public.pantry_items FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on pantry_items" ON public.pantry_items FOR DELETE USING (true);

CREATE POLICY "Allow public read on pantry_votes" ON public.pantry_votes FOR SELECT USING (true);
CREATE POLICY "Allow public insert on pantry_votes" ON public.pantry_votes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete on pantry_votes" ON public.pantry_votes FOR DELETE USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pantry_items_period ON public.pantry_items(month_period);
CREATE INDEX IF NOT EXISTS idx_pantry_votes_item ON public.pantry_votes(item_id);
CREATE INDEX IF NOT EXISTS idx_pantry_votes_user ON public.pantry_votes(user_id);

-- Enable Realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.pantry_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pantry_votes;
