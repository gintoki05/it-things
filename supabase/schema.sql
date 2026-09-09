-- ============================================================
-- IT-THINGS.EXE / INTERNAL TEAM SUITE DATABASE SCHEMA (SUPABASE)
-- Jalankan query ini di SQL Editor dashboard Supabase Anda.
-- ============================================================

-- 1. Table: team_members (Profil anggota & penanda peran Bendahara)
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL UNIQUE,
    email TEXT,
    name TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'member', -- 'member' | 'treasurer'
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Table: pantry_items (Item usulan belanja konsumsi/snack bulanan)
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

-- 3. Table: pantry_votes (Pencatatan 1-vote per user per item)
CREATE TABLE IF NOT EXISTS public.pantry_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.pantry_items(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_avatar TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(item_id, user_id)
);

-- 4. Table: wheel_places (Rekomendasi tempat makan bersama)
CREATE TABLE IF NOT EXISTS public.wheel_places (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT DEFAULT 'Resto', -- 'Warteg/Budget', 'Fast Food', 'Kafe', 'Resto', 'Snack/Minuman'
    budget_level TEXT DEFAULT 'sedang', -- 'hemat', 'sedang', 'sultan'
    service_type TEXT DEFAULT 'both', -- 'dine_in', 'delivery', 'both'
    maps_url TEXT,
    notes TEXT,
    proposed_by_id TEXT,
    proposed_by_name TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Table: wheel_spins (Riwayat hasil putaran Mau Makan Apa)
CREATE TABLE IF NOT EXISTS public.wheel_spins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id UUID REFERENCES public.wheel_places(id) ON DELETE SET NULL,
    place_name TEXT NOT NULL,
    category TEXT,
    spun_by_id TEXT,
    spun_by_name TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Table: split_bills (Sesi tagihan patungan / makan bareng)
CREATE TABLE IF NOT EXISTS public.split_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'equal', -- 'equal' | 'itemized'
    created_by_id TEXT NOT NULL,
    created_by_name TEXT NOT NULL,
    created_by_avatar TEXT,
    bank_name TEXT,
    account_number TEXT,
    account_holder TEXT,
    qris_url TEXT,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    tax NUMERIC NOT NULL DEFAULT 0,
    delivery_fee NUMERIC NOT NULL DEFAULT 0,
    discount NUMERIC NOT NULL DEFAULT 0,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    is_settled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Table: split_bill_participants (Anggota yang ikut patungan di suatu bill)
CREATE TABLE IF NOT EXISTS public.split_bill_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES public.split_bills(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_avatar TEXT,
    amount_due NUMERIC NOT NULL DEFAULT 0,
    is_paid BOOLEAN NOT NULL DEFAULT false,
    paid_at TIMESTAMPTZ,
    is_confirmed BOOLEAN NOT NULL DEFAULT false,
    items JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(bill_id, user_id)
);

-- 8. Table: kas_transactions (Buku kas kecil bersama tim)
CREATE TABLE IF NOT EXISTS public.kas_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL, -- 'in' | 'out'
    amount NUMERIC NOT NULL,
    category TEXT NOT NULL, -- 'iuran', 'split_bill_sisa', 'donasi', 'konsumsi', 'keperluan_it', 'lainnya'
    description TEXT NOT NULL,
    receipt_url TEXT,
    created_by_id TEXT NOT NULL,
    created_by_name TEXT NOT NULL,
    verified_by_treasurer BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Table: kas_dues (Checklist iuran kas rutin bulanan)
CREATE TABLE IF NOT EXISTS public.kas_dues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month_period TEXT NOT NULL, -- 'YYYY-MM'
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_avatar TEXT,
    amount NUMERIC NOT NULL DEFAULT 20000,
    is_paid BOOLEAN NOT NULL DEFAULT false,
    paid_at TIMESTAMPTZ,
    confirmed_by TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(month_period, user_id)
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) & POLICIES
-- ============================================================
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pantry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pantry_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wheel_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wheel_spins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.split_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.split_bill_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kas_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kas_dues ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTION: is_treasurer()
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_treasurer()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = (auth.uid())::text
      AND role = 'treasurer'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_treasurer() TO authenticated, anon;

-- ============================================================
-- 1. TEAM MEMBERS POLICIES
-- ============================================================
CREATE POLICY "team_members_select" ON public.team_members
  FOR SELECT USING (true);

CREATE POLICY "team_members_insert" ON public.team_members
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL 
    AND user_id = auth.uid()::text 
    AND (role = 'member' OR public.is_treasurer())
  );

CREATE POLICY "team_members_update" ON public.team_members
  FOR UPDATE USING (
    auth.uid() IS NOT NULL 
    AND (user_id = auth.uid()::text OR public.is_treasurer())
  ) WITH CHECK (
    auth.uid() IS NOT NULL 
    AND (role = 'member' OR public.is_treasurer())
  );

-- ============================================================
-- 2. PANTRY ITEMS POLICIES
-- ============================================================
CREATE POLICY "pantry_items_select" ON public.pantry_items
  FOR SELECT USING (true);

CREATE POLICY "pantry_items_insert" ON public.pantry_items
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL 
    AND proposed_by_id = auth.uid()::text
  );

CREATE POLICY "pantry_items_update" ON public.pantry_items
  FOR UPDATE USING (
    auth.uid() IS NOT NULL 
    AND (proposed_by_id = auth.uid()::text OR public.is_treasurer())
  );

CREATE POLICY "pantry_items_delete" ON public.pantry_items
  FOR DELETE USING (
    auth.uid() IS NOT NULL 
    AND (proposed_by_id = auth.uid()::text OR public.is_treasurer())
  );

-- ============================================================
-- 3. PANTRY VOTES POLICIES
-- ============================================================
CREATE POLICY "pantry_votes_select" ON public.pantry_votes
  FOR SELECT USING (true);

CREATE POLICY "pantry_votes_insert" ON public.pantry_votes
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL 
    AND user_id = auth.uid()::text
  );

CREATE POLICY "pantry_votes_delete" ON public.pantry_votes
  FOR DELETE USING (
    auth.uid() IS NOT NULL 
    AND user_id = auth.uid()::text
  );

-- ============================================================
-- 4. WHEEL PLACES POLICIES
-- ============================================================
CREATE POLICY "wheel_places_select" ON public.wheel_places
  FOR SELECT USING (true);

CREATE POLICY "wheel_places_insert" ON public.wheel_places
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL 
    AND proposed_by_id = auth.uid()::text
  );

CREATE POLICY "wheel_places_update" ON public.wheel_places
  FOR UPDATE USING (
    auth.uid() IS NOT NULL 
    AND (proposed_by_id = auth.uid()::text OR public.is_treasurer())
  );

CREATE POLICY "wheel_places_delete" ON public.wheel_places
  FOR DELETE USING (
    auth.uid() IS NOT NULL 
    AND (proposed_by_id = auth.uid()::text OR public.is_treasurer())
  );

-- ============================================================
-- 5. WHEEL SPINS POLICIES
-- ============================================================
CREATE POLICY "wheel_spins_select" ON public.wheel_spins
  FOR SELECT USING (true);

CREATE POLICY "wheel_spins_insert" ON public.wheel_spins
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL 
    AND spun_by_id = auth.uid()::text
  );

-- ============================================================
-- 6. SPLIT BILLS POLICIES
-- ============================================================
CREATE POLICY "split_bills_select" ON public.split_bills
  FOR SELECT USING (true);

CREATE POLICY "split_bills_insert" ON public.split_bills
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL 
    AND created_by_id = auth.uid()::text
  );

CREATE POLICY "split_bills_update" ON public.split_bills
  FOR UPDATE USING (
    auth.uid() IS NOT NULL 
    AND (created_by_id = auth.uid()::text OR public.is_treasurer())
  );

CREATE POLICY "split_bills_delete" ON public.split_bills
  FOR DELETE USING (
    auth.uid() IS NOT NULL 
    AND (created_by_id = auth.uid()::text OR public.is_treasurer())
  );

-- ============================================================
-- 7. SPLIT BILL PARTICIPANTS POLICIES
-- ============================================================
CREATE POLICY "split_bill_participants_select" ON public.split_bill_participants
  FOR SELECT USING (true);

CREATE POLICY "split_bill_participants_insert" ON public.split_bill_participants
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      user_id = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.split_bills 
        WHERE id = bill_id AND created_by_id = auth.uid()::text
      )
      OR public.is_treasurer()
    )
  );

CREATE POLICY "split_bill_participants_update" ON public.split_bill_participants
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND (
      user_id = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.split_bills 
        WHERE id = bill_id AND created_by_id = auth.uid()::text
      )
      OR public.is_treasurer()
    )
  );

CREATE POLICY "split_bill_participants_delete" ON public.split_bill_participants
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND (
      user_id = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.split_bills 
        WHERE id = bill_id AND created_by_id = auth.uid()::text
      )
      OR public.is_treasurer()
    )
  );

-- ============================================================
-- 8. KAS TRANSACTIONS POLICIES
-- ============================================================
CREATE POLICY "kas_transactions_select" ON public.kas_transactions
  FOR SELECT USING (true);

CREATE POLICY "kas_transactions_insert" ON public.kas_transactions
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL 
    AND created_by_id = auth.uid()::text
    AND (type = 'in' OR public.is_treasurer())
  );

CREATE POLICY "kas_transactions_update" ON public.kas_transactions
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND public.is_treasurer()
  );

CREATE POLICY "kas_transactions_delete" ON public.kas_transactions
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND public.is_treasurer()
  );

-- ============================================================
-- 9. KAS DUES POLICIES
-- ============================================================
CREATE POLICY "kas_dues_select" ON public.kas_dues
  FOR SELECT USING (true);

CREATE POLICY "kas_dues_insert" ON public.kas_dues
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND public.is_treasurer()
  );

CREATE POLICY "kas_dues_update" ON public.kas_dues
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND public.is_treasurer()
  );

CREATE POLICY "kas_dues_delete" ON public.kas_dues
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND public.is_treasurer()
  );

-- ============================================================
-- INDEXES FOR SPEED
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_pantry_items_period ON public.pantry_items(month_period);
CREATE INDEX IF NOT EXISTS idx_pantry_votes_item ON public.pantry_votes(item_id);
CREATE INDEX IF NOT EXISTS idx_pantry_votes_user ON public.pantry_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_wheel_places_category ON public.wheel_places(category);
CREATE INDEX IF NOT EXISTS idx_wheel_spins_created ON public.wheel_spins(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_split_bills_created ON public.split_bills(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_split_bill_participants_bill ON public.split_bill_participants(bill_id);
CREATE INDEX IF NOT EXISTS idx_kas_transactions_created ON public.kas_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kas_dues_period ON public.kas_dues(month_period);

-- ============================================================
-- REALTIME PUBLICATION
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pantry_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pantry_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wheel_places;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wheel_spins;
ALTER PUBLICATION supabase_realtime ADD TABLE public.split_bills;
ALTER PUBLICATION supabase_realtime ADD TABLE public.split_bill_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.kas_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.kas_dues;

-- ============================================================
-- GRANTS FOR CLIENT ACCESS (ANON, AUTHENTICATED)
-- ============================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
