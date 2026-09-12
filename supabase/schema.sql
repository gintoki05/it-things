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
    role TEXT NOT NULL DEFAULT 'member', -- 'member' | 'treasurer' | 'admin'
    bank_name TEXT,
    account_number TEXT,
    account_holder TEXT,
    qris_url TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Table: vote_groups (Kelompok vote bebas topik)
CREATE TABLE IF NOT EXISTS public.vote_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    emoji TEXT DEFAULT '🗳️',
    vote_type TEXT NOT NULL DEFAULT 'single', -- 'single' | 'multiple'
    is_closed BOOLEAN NOT NULL DEFAULT false,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + interval '21 days'),
    created_by_id TEXT NOT NULL,
    created_by_name TEXT NOT NULL,
    created_by_avatar TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Table: vote_options (Opsi/pilihan dalam sebuah vote group)
CREATE TABLE IF NOT EXISTS public.vote_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.vote_groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    emoji TEXT DEFAULT '📌',
    proposed_by_id TEXT NOT NULL,
    proposed_by_name TEXT NOT NULL,
    proposed_by_avatar TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Table: vote_records (Catatan vote per user per opsi)
CREATE TABLE IF NOT EXISTS public.vote_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.vote_groups(id) ON DELETE CASCADE,
    option_id UUID NOT NULL REFERENCES public.vote_options(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_avatar TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(option_id, user_id)
);

-- 4b. Table: vote_comments (Komentar per vote group)
CREATE TABLE IF NOT EXISTS public.vote_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.vote_groups(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_avatar TEXT,
    content TEXT NOT NULL CHECK (char_length(trim(content)) > 0 AND char_length(content) <= 500),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
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
    items JSONB DEFAULT '[]'::jsonb,
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

-- 10. Table: chat_messages (Pesan instan tim / Live Chat)
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message TEXT NOT NULL,
    mentions TEXT[] DEFAULT '{}',
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_avatar TEXT,
    user_role TEXT DEFAULT 'member', -- 'member' | 'treasurer' | 'admin'
    is_edited BOOLEAN NOT NULL DEFAULT false,
    edited_at TIMESTAMPTZ,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_by TEXT, -- 'creator' | 'admin'
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT chat_messages_message_content_check CHECK (
      char_length(trim(regexp_replace(message, '[\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF\u180E\u2800]', '', 'g'))) > 0
      AND char_length(message) <= 1000
    )
);

-- 11. Table: chat_reactions (Reaksi emoji pada pesan chat)
CREATE TABLE IF NOT EXISTS public.chat_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(message_id, user_id),
    CONSTRAINT chat_reactions_emoji_length_check CHECK (char_length(emoji) > 0 AND char_length(emoji) <= 16)
);

-- 12. Table: pantry_items (Katalog makanan & kuota bulanan snack bar)
CREATE TABLE IF NOT EXISTS public.pantry_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT DEFAULT 'Mie Instan',
    emoji TEXT DEFAULT '🍜',
    monthly_quota INT NOT NULL DEFAULT 2,
    stock_qty INT NOT NULL DEFAULT 0,
    unit TEXT DEFAULT 'pcs',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. Table: pantry_logs (Catatan konsumsi/pengambilan snack oleh member)
CREATE TABLE IF NOT EXISTS public.pantry_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.pantry_items(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_avatar TEXT,
    quantity INT NOT NULL DEFAULT 1,
    period_month TEXT NOT NULL, -- Format: YYYY-MM
    notes TEXT,
    logged_by_id TEXT NOT NULL,
    logged_by_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 14. Table: pantry_restocks (Riwayat restock stok gudang/pantry oleh admin)
CREATE TABLE IF NOT EXISTS public.pantry_restocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.pantry_items(id) ON DELETE CASCADE,
    quantity INT NOT NULL,
    notes TEXT,
    restocked_by_id TEXT NOT NULL,
    restocked_by_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 15. Table: desktop_memos (Papan pengumuman / sticky note memo di wallpaper desktop)
CREATE TABLE IF NOT EXISTS public.desktop_memos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL DEFAULT 'MEMO_PENGUMUMAN.TXT',
    content TEXT NOT NULL,
    updated_by_id TEXT NOT NULL,
    updated_by_name TEXT NOT NULL,
    updated_by_avatar TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 16. Table: module_pics (Penunjukan Multi-PIC per Modul seperti Kas & Pantry)
CREATE TABLE IF NOT EXISTS public.module_pics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module TEXT NOT NULL, -- 'kas' | 'pantry'
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_avatar TEXT,
    assigned_by_id TEXT,
    assigned_by_name TEXT,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(module, user_id)
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) & POLICIES
-- ============================================================
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wheel_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wheel_spins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.split_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.split_bill_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kas_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kas_dues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pantry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pantry_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.desktop_memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_pics ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTIONS: is_admin(), is_module_pic(), is_kas_pic(), is_pantry_pic(), is_treasurer()
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT 
    COALESCE((auth.jwt() ->> 'email') = 'ajieprastyo@gmail.com', false)
    OR EXISTS (
      SELECT 1 FROM public.team_members
      WHERE user_id = (auth.uid())::text
        AND role = 'admin'
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.is_module_pic(p_module TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT 
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.module_pics
      WHERE module = p_module
        AND user_id = (auth.uid())::text
    );
$$;

CREATE OR REPLACE FUNCTION public.is_kas_pic()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT public.is_module_pic('kas');
$$;

CREATE OR REPLACE FUNCTION public.is_pantry_pic()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT public.is_module_pic('pantry');
$$;

CREATE OR REPLACE FUNCTION public.is_treasurer()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT public.is_module_pic('kas');
$$;

GRANT EXECUTE ON FUNCTION public.is_module_pic(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_kas_pic() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_pantry_pic() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_treasurer() TO authenticated, anon;

-- ============================================================
-- HELPER FUNCTION: cleanup_expired_split_bills
-- Pembersihan otomatis sesi split bill yang berumur lebih dari 7 hari
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_split_bills()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  WITH deleted AS (
    DELETE FROM public.split_bills
    WHERE created_at < (timezone('utc'::text, now()) - interval '7 days')
    RETURNING id
  )
  SELECT count(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_split_bills() TO anon, authenticated, service_role;

-- Sinkronisasi nama dan avatar pengguna ke seluruh aktivitas/data terkait
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_user_profile_name(new_name TEXT, new_avatar TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid TEXT := auth.uid()::text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. team_members
  UPDATE public.team_members
  SET name = new_name,
      avatar_url = COALESCE(new_avatar, avatar_url)
  WHERE user_id = v_uid;

  -- 2. module_pics
  UPDATE public.module_pics
  SET user_name = new_name,
      user_avatar = COALESCE(new_avatar, user_avatar)
  WHERE user_id = v_uid;

  -- 3. vote_groups (created_by)
  UPDATE public.vote_groups
  SET created_by_name = new_name,
      created_by_avatar = COALESCE(new_avatar, created_by_avatar)
  WHERE created_by_id = v_uid;

  -- 3. vote_options (proposed_by)
  UPDATE public.vote_options
  SET proposed_by_name = new_name,
      proposed_by_avatar = COALESCE(new_avatar, proposed_by_avatar)
  WHERE proposed_by_id = v_uid;

  -- 4. vote_records
  UPDATE public.vote_records
  SET user_name = new_name,
      user_avatar = COALESCE(new_avatar, user_avatar)
  WHERE user_id = v_uid;

  -- 5. wheel_places
  UPDATE public.wheel_places
  SET proposed_by_name = new_name
  WHERE proposed_by_id = v_uid;

  -- 6. wheel_spins
  UPDATE public.wheel_spins
  SET spun_by_name = new_name
  WHERE spun_by_id = v_uid;

  -- 7. split_bills
  UPDATE public.split_bills
  SET created_by_name = new_name,
      created_by_avatar = COALESCE(new_avatar, created_by_avatar)
  WHERE created_by_id = v_uid;

  -- 8. split_bill_participants
  UPDATE public.split_bill_participants
  SET user_name = new_name,
      user_avatar = COALESCE(new_avatar, user_avatar)
  WHERE user_id = v_uid;

  -- 9. kas_transactions
  UPDATE public.kas_transactions
  SET created_by_name = new_name
  WHERE created_by_id = v_uid;

  -- 10. kas_dues
  UPDATE public.kas_dues
  SET user_name = new_name,
      user_avatar = COALESCE(new_avatar, user_avatar)
  WHERE user_id = v_uid;

  -- 11. chat_messages
  UPDATE public.chat_messages
  SET user_name = new_name,
      user_avatar = COALESCE(new_avatar, user_avatar)
  WHERE user_id = v_uid;

  -- 12. chat_reactions
  UPDATE public.chat_reactions
  SET user_name = new_name
  WHERE user_id = v_uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_user_profile_name(TEXT, TEXT) TO authenticated, anon;

-- ============================================================
-- 1. TEAM MEMBERS POLICIES
-- ============================================================
CREATE POLICY "team_members_select" ON public.team_members
  FOR SELECT USING (true);

CREATE POLICY "team_members_insert" ON public.team_members
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL 
    AND (
      (user_id = auth.uid()::text AND (role = 'member' OR public.is_admin()))
      OR public.is_admin()
    )
  );

CREATE POLICY "team_members_update" ON public.team_members
  FOR UPDATE USING (
    auth.uid() IS NOT NULL 
    AND (user_id = auth.uid()::text OR public.is_admin())
  ) WITH CHECK (
    auth.uid() IS NOT NULL 
    AND (
      (user_id = auth.uid()::text AND role = 'member')
      OR public.is_admin()
    )
  );

CREATE POLICY "team_members_delete" ON public.team_members
  FOR DELETE USING (
    auth.uid() IS NOT NULL 
    AND public.is_admin()
  );

-- ============================================================
-- 2. VOTE GROUPS POLICIES
-- ============================================================
CREATE POLICY "vote_groups_select" ON public.vote_groups
  FOR SELECT USING (true);

CREATE POLICY "vote_groups_insert" ON public.vote_groups
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by_id = auth.uid()::text
  );

CREATE POLICY "vote_groups_update" ON public.vote_groups
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND (created_by_id = auth.uid()::text OR public.is_admin())
  );

CREATE POLICY "vote_groups_delete" ON public.vote_groups
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND (created_by_id = auth.uid()::text OR public.is_admin())
    AND (is_closed = true OR expires_at <= timezone('utc'::text, now()))
  );

-- ============================================================
-- 3. VOTE OPTIONS POLICIES
-- ============================================================
CREATE POLICY "vote_options_select" ON public.vote_options
  FOR SELECT USING (true);

CREATE POLICY "vote_options_insert" ON public.vote_options
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND proposed_by_id = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.vote_groups
      WHERE id = group_id
        AND is_closed = false
        AND expires_at > timezone('utc'::text, now())
    )
  );

CREATE POLICY "vote_options_delete" ON public.vote_options
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND (
      proposed_by_id = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.vote_groups
        WHERE id = group_id AND created_by_id = auth.uid()::text
      )
      OR public.is_admin()
    )
  );

-- ============================================================
-- 4. VOTE RECORDS POLICIES
-- ============================================================
CREATE POLICY "vote_records_select" ON public.vote_records
  FOR SELECT USING (true);

CREATE POLICY "vote_records_insert" ON public.vote_records
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.vote_groups
      WHERE id = group_id
        AND is_closed = false
        AND expires_at > timezone('utc'::text, now())
    )
  );

CREATE POLICY "vote_records_delete" ON public.vote_records
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()::text
  );

-- ============================================================
-- 4b. VOTE COMMENTS POLICIES
-- ============================================================
CREATE POLICY "vote_comments_select" ON public.vote_comments
  FOR SELECT USING (true);

CREATE POLICY "vote_comments_insert" ON public.vote_comments
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()::text
  );

CREATE POLICY "vote_comments_delete" ON public.vote_comments
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND (user_id = auth.uid()::text OR public.is_admin())
  );

-- ============================================================
-- 5. WHEEL PLACES POLICIES
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
-- 6. WHEEL SPINS POLICIES
-- ============================================================
CREATE POLICY "wheel_spins_select" ON public.wheel_spins
  FOR SELECT USING (true);

CREATE POLICY "wheel_spins_insert" ON public.wheel_spins
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL 
    AND spun_by_id = auth.uid()::text
  );

-- ============================================================
-- 7. SPLIT BILLS POLICIES
-- ============================================================
CREATE POLICY "split_bills_select" ON public.split_bills
  FOR SELECT USING (true);

CREATE POLICY "split_bills_insert" ON public.split_bills
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL 
    AND created_by_id = auth.uid()::text
  );

DROP POLICY IF EXISTS "split_bills_update" ON public.split_bills;
CREATE POLICY "split_bills_update" ON public.split_bills
  FOR UPDATE USING (
    auth.uid() IS NOT NULL 
    AND (created_by_id = auth.uid()::text OR public.is_admin())
  );

DROP POLICY IF EXISTS "split_bills_delete" ON public.split_bills;
CREATE POLICY "split_bills_delete" ON public.split_bills
  FOR DELETE USING (
    auth.uid() IS NOT NULL 
    AND (created_by_id = auth.uid()::text OR public.is_admin())
  );

-- ============================================================
-- 8. SPLIT BILL PARTICIPANTS POLICIES
-- ============================================================
CREATE POLICY "split_bill_participants_select" ON public.split_bill_participants
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "split_bill_participants_insert" ON public.split_bill_participants;
CREATE POLICY "split_bill_participants_insert" ON public.split_bill_participants
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.split_bills 
        WHERE id = bill_id AND created_by_id = auth.uid()::text
      )
      OR public.is_admin()
    )
  );

DROP POLICY IF EXISTS "split_bill_participants_update" ON public.split_bill_participants;
CREATE POLICY "split_bill_participants_update" ON public.split_bill_participants
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND (
      user_id = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.split_bills 
        WHERE id = bill_id AND created_by_id = auth.uid()::text
      )
      OR public.is_admin()
    )
  );

DROP POLICY IF EXISTS "split_bill_participants_delete" ON public.split_bill_participants;
CREATE POLICY "split_bill_participants_delete" ON public.split_bill_participants
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.split_bills 
        WHERE id = bill_id AND created_by_id = auth.uid()::text
      )
      OR public.is_admin()
    )
  );

-- ============================================================
-- 9. KAS TRANSACTIONS POLICIES
-- ============================================================
CREATE POLICY "kas_transactions_select" ON public.kas_transactions
  FOR SELECT USING (true);

CREATE POLICY "kas_transactions_insert" ON public.kas_transactions
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL 
    AND created_by_id = auth.uid()::text
    AND (type = 'in' OR public.is_kas_pic())
  );

CREATE POLICY "kas_transactions_update" ON public.kas_transactions
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND public.is_kas_pic()
  );

CREATE POLICY "kas_transactions_delete" ON public.kas_transactions
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND public.is_kas_pic()
  );

-- ============================================================
-- 10. KAS DUES POLICIES
-- ============================================================
CREATE POLICY "kas_dues_select" ON public.kas_dues
  FOR SELECT USING (true);

CREATE POLICY "kas_dues_insert" ON public.kas_dues
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND public.is_kas_pic()
  );

CREATE POLICY "kas_dues_update" ON public.kas_dues
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND public.is_kas_pic()
  );

CREATE POLICY "kas_dues_delete" ON public.kas_dues
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND public.is_kas_pic()
  );

-- ============================================================
-- 10. CHAT MESSAGES POLICIES
-- ============================================================
-- Hanya user login yang bisa membaca (Tamu ditolak)
CREATE POLICY "chat_messages_select" ON public.chat_messages
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Hanya user login yang bisa kirim pesan dengan user_id miliknya
CREATE POLICY "chat_messages_insert" ON public.chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL 
    AND user_id = auth.uid()::text
  );

-- Pengirim hanya bisa hapus dalam 15 menit, Admin bisa hapus kapan saja
CREATE POLICY "chat_messages_delete" ON public.chat_messages
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND (
      public.is_admin()
      OR (
        user_id = auth.uid()::text
        AND created_at >= (timezone('utc'::text, now()) - interval '15 minutes')
      )
    )
  );

-- Edit pesan (oleh pengirim <= 15 menit) atau Soft Delete (oleh pengirim <= 15 menit atau Admin kapan saja)
CREATE POLICY "chat_messages_update" ON public.chat_messages
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND (
      public.is_admin()
      OR (
        user_id = auth.uid()::text
        AND created_at >= (timezone('utc'::text, now()) - interval '15 minutes')
      )
    )
  ) WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      public.is_admin()
      OR user_id = auth.uid()::text
    )
  );

-- ============================================================
-- 11. CHAT REACTIONS POLICIES
-- ============================================================
CREATE POLICY "chat_reactions_select" ON public.chat_reactions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "chat_reactions_insert" ON public.chat_reactions
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()::text
  );

CREATE POLICY "chat_reactions_delete" ON public.chat_reactions
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()::text
  );

CREATE POLICY "chat_reactions_update" ON public.chat_reactions
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()::text
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()::text
  );

-- ============================================================
-- 12. PANTRY POLICIES & TRIGGERS
-- ============================================================
CREATE POLICY "pantry_items_select" ON public.pantry_items FOR SELECT USING (true);
CREATE POLICY "pantry_items_insert" ON public.pantry_items FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND (public.is_pantry_pic() OR created_by_id = auth.uid()::text)
);
CREATE POLICY "pantry_items_update" ON public.pantry_items FOR UPDATE USING (
  auth.uid() IS NOT NULL AND (public.is_pantry_pic() OR created_by_id = auth.uid()::text)
);
CREATE POLICY "pantry_items_delete" ON public.pantry_items FOR DELETE USING (public.is_pantry_pic());

CREATE POLICY "pantry_logs_select" ON public.pantry_logs FOR SELECT USING (true);
CREATE POLICY "pantry_logs_insert" ON public.pantry_logs FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND (logged_by_id = auth.uid()::text OR public.is_admin())
);
CREATE POLICY "pantry_logs_delete" ON public.pantry_logs FOR DELETE USING (
  public.is_admin() OR logged_by_id = auth.uid()::text OR user_id = auth.uid()::text
);

CREATE POLICY "pantry_restocks_select" ON public.pantry_restocks FOR SELECT USING (true);
CREATE POLICY "pantry_restocks_insert" ON public.pantry_restocks FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND public.is_pantry_pic()
);
CREATE POLICY "pantry_restocks_delete" ON public.pantry_restocks FOR DELETE USING (
  public.is_pantry_pic()
);

-- ============================================================
-- 13. DESKTOP MEMOS POLICIES
-- ============================================================
CREATE POLICY "desktop_memos_select" ON public.desktop_memos FOR SELECT USING (true);
CREATE POLICY "desktop_memos_insert" ON public.desktop_memos FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND (public.is_admin() OR public.is_kas_pic() OR public.is_pantry_pic())
);
CREATE POLICY "desktop_memos_update" ON public.desktop_memos FOR UPDATE USING (
  auth.uid() IS NOT NULL AND (public.is_admin() OR public.is_kas_pic() OR public.is_pantry_pic())
) WITH CHECK (
  auth.uid() IS NOT NULL AND (public.is_admin() OR public.is_kas_pic() OR public.is_pantry_pic())
);
CREATE POLICY "desktop_memos_delete" ON public.desktop_memos FOR DELETE USING (
  auth.uid() IS NOT NULL AND public.is_admin()
);

-- ============================================================
-- 14. MODULE PICS POLICIES
-- ============================================================
CREATE POLICY "module_pics_select" ON public.module_pics FOR SELECT USING (true);
CREATE POLICY "module_pics_insert" ON public.module_pics FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    public.is_admin()
    OR public.is_module_pic(module)
  )
);
CREATE POLICY "module_pics_update" ON public.module_pics FOR UPDATE USING (
  auth.uid() IS NOT NULL
  AND (
    public.is_admin()
    OR public.is_module_pic(module)
  )
);
CREATE POLICY "module_pics_delete" ON public.module_pics FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND (
    public.is_admin()
    OR public.is_module_pic(module)
  )
);


-- Trigger function for pantry stock adjustments
CREATE OR REPLACE FUNCTION public.handle_pantry_log_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.pantry_items
    SET stock_qty = GREATEST(0, stock_qty - NEW.quantity),
        updated_at = timezone('utc'::text, now())
    WHERE id = NEW.item_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.pantry_items
    SET stock_qty = GREATEST(0, stock_qty + (OLD.quantity - NEW.quantity)),
        updated_at = timezone('utc'::text, now())
    WHERE id = NEW.item_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.pantry_items
    SET stock_qty = stock_qty + OLD.quantity,
        updated_at = timezone('utc'::text, now())
    WHERE id = OLD.item_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_pantry_log_stock ON public.pantry_logs;
CREATE TRIGGER trg_pantry_log_stock
AFTER INSERT OR UPDATE OR DELETE ON public.pantry_logs
FOR EACH ROW EXECUTE FUNCTION public.handle_pantry_log_stock();

CREATE OR REPLACE FUNCTION public.handle_pantry_restock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.pantry_items
  SET stock_qty = stock_qty + NEW.quantity,
      updated_at = timezone('utc'::text, now())
  WHERE id = NEW.item_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pantry_restock ON public.pantry_restocks;
CREATE TRIGGER trg_pantry_restock
AFTER INSERT ON public.pantry_restocks
FOR EACH ROW EXECUTE FUNCTION public.handle_pantry_restock();

-- ============================================================
-- INDEXES FOR SPEED
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_vote_groups_created ON public.vote_groups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vote_groups_expires ON public.vote_groups(expires_at);
CREATE INDEX IF NOT EXISTS idx_vote_options_group ON public.vote_options(group_id);
CREATE INDEX IF NOT EXISTS idx_vote_records_option ON public.vote_records(option_id);
CREATE INDEX IF NOT EXISTS idx_vote_records_group_user ON public.vote_records(group_id, user_id);
CREATE INDEX IF NOT EXISTS idx_vote_comments_group ON public.vote_comments(group_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_wheel_places_category ON public.wheel_places(category);
CREATE INDEX IF NOT EXISTS idx_wheel_spins_created ON public.wheel_spins(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_split_bills_created ON public.split_bills(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_split_bill_participants_bill ON public.split_bill_participants(bill_id);
CREATE INDEX IF NOT EXISTS idx_kas_transactions_created ON public.kas_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kas_dues_period ON public.kas_dues(month_period);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON public.chat_messages(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_chat_reactions_message ON public.chat_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_pantry_logs_item_period ON public.pantry_logs(item_id, period_month);
-- 15. Table: lapak_items (Etalase & Iklan Usaha Teman / Tim)
CREATE TABLE IF NOT EXISTS public.lapak_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    tagline TEXT,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'Kuliner',
    price_range TEXT,
    contact_name TEXT NOT NULL,
    contact_wa TEXT,
    contact_link TEXT,
    badge TEXT DEFAULT 'PROMO',
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by_id TEXT NOT NULL,
    created_by_name TEXT NOT NULL,
    created_by_avatar TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.lapak_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lapak_items_select" ON public.lapak_items;
CREATE POLICY "lapak_items_select" ON public.lapak_items
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "lapak_items_insert" ON public.lapak_items;
CREATE POLICY "lapak_items_insert" ON public.lapak_items
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        created_by_id = auth.uid()::text
    );

DROP POLICY IF EXISTS "lapak_items_update" ON public.lapak_items;
CREATE POLICY "lapak_items_update" ON public.lapak_items
    FOR UPDATE USING (
        created_by_id = auth.uid()::text OR
        public.is_admin()
    );

DROP POLICY IF EXISTS "lapak_items_delete" ON public.lapak_items;
CREATE POLICY "lapak_items_delete" ON public.lapak_items
    FOR DELETE USING (
        created_by_id = auth.uid()::text OR
        public.is_admin()
    );

-- ============================================================
-- INDEXES FOR SPEED
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_vote_groups_created ON public.vote_groups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vote_groups_expires ON public.vote_groups(expires_at);
CREATE INDEX IF NOT EXISTS idx_vote_options_group ON public.vote_options(group_id);
CREATE INDEX IF NOT EXISTS idx_vote_records_option ON public.vote_records(option_id);
CREATE INDEX IF NOT EXISTS idx_vote_records_group_user ON public.vote_records(group_id, user_id);
CREATE INDEX IF NOT EXISTS idx_wheel_places_category ON public.wheel_places(category);
CREATE INDEX IF NOT EXISTS idx_wheel_spins_created ON public.wheel_spins(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_split_bills_created ON public.split_bills(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_split_bill_participants_bill ON public.split_bill_participants(bill_id);
CREATE INDEX IF NOT EXISTS idx_kas_transactions_created ON public.kas_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kas_dues_period ON public.kas_dues(month_period);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON public.chat_messages(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_chat_reactions_message ON public.chat_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_pantry_logs_item_period ON public.pantry_logs(item_id, period_month);
CREATE INDEX IF NOT EXISTS idx_pantry_logs_user_period ON public.pantry_logs(user_id, period_month);
CREATE INDEX IF NOT EXISTS idx_pantry_logs_created ON public.pantry_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pantry_restocks_item ON public.pantry_restocks(item_id);
CREATE INDEX IF NOT EXISTS idx_lapak_items_created ON public.lapak_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lapak_items_active ON public.lapak_items(is_active);
CREATE INDEX IF NOT EXISTS idx_lapak_items_category ON public.lapak_items(category);

-- ============================================================
-- REALTIME PUBLICATION
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vote_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vote_options;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vote_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vote_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wheel_places;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wheel_spins;
ALTER PUBLICATION supabase_realtime ADD TABLE public.split_bills;
ALTER PUBLICATION supabase_realtime ADD TABLE public.split_bill_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.kas_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.kas_dues;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pantry_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pantry_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pantry_restocks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.desktop_memos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lapak_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.module_pics;

-- ============================================================
-- GRANTS FOR CLIENT ACCESS (ANON, AUTHENTICATED)
-- ============================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- Seed default initial memo if none exists
INSERT INTO public.desktop_memos (id, title, content, updated_by_id, updated_by_name)
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid,
  'MEMO_PENGUMUMAN.TXT',
  '• Selamat datang di IT-THINGS 98!
• Jangan lupa bayar uang kas bulanan rek.
• Kopi & snack di pantry silakan dinikmati bersama.',
  'system',
  'Admin IT'
WHERE NOT EXISTS (SELECT 1 FROM public.desktop_memos LIMIT 1);

-- ============================================================
-- Table: fridge_items (Kulkas Virtual Kantor)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.fridge_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL CHECK (char_length(trim(name)) > 0 AND char_length(name) <= 100),
    category TEXT NOT NULL DEFAULT 'makanan', -- 'makanan' | 'minuman' | 'bumbu' | 'lainnya'
    notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 300),
    expired_at DATE, -- nullable: tidak semua item punya tanggal expired
    slot TEXT NOT NULL DEFAULT 'main_upper', -- 'freezer' | 'chiller' | 'main_upper' | 'main_lower' | 'crisper' | 'door'
    owner_id TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    owner_avatar TEXT,
    created_by_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.fridge_items ENABLE ROW LEVEL SECURITY;

-- SELECT: semua authenticated user bisa lihat (data internal tim)
CREATE POLICY "fridge_items_select" ON public.fridge_items
    FOR SELECT USING (true);

-- INSERT: hanya user login, owner harus diri sendiri
CREATE POLICY "fridge_items_insert" ON public.fridge_items
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
        AND owner_id = auth.uid()::text
        AND created_by_id = auth.uid()::text
    );

-- UPDATE: hanya owner atau admin
CREATE POLICY "fridge_items_update" ON public.fridge_items
    FOR UPDATE USING (
        owner_id = auth.uid()::text OR public.is_admin()
    );

-- DELETE: hanya owner atau admin
CREATE POLICY "fridge_items_delete" ON public.fridge_items
    FOR DELETE USING (
        owner_id = auth.uid()::text OR public.is_admin()
    );

-- Index
CREATE INDEX IF NOT EXISTS idx_fridge_items_owner_id ON public.fridge_items (owner_id);
CREATE INDEX IF NOT EXISTS idx_fridge_items_expired_at ON public.fridge_items (expired_at);
CREATE INDEX IF NOT EXISTS idx_fridge_items_created_at ON public.fridge_items (created_at DESC);

-- Grant access
GRANT ALL ON public.fridge_items TO anon, authenticated, service_role;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.fridge_items;

-- ============================================================
-- Table: paint_war_rooms, paint_war_players, paint_war_messages
-- PAINT_WAR.EXE / Retro Gartic 98 Multiplayer
-- ============================================================
CREATE TABLE IF NOT EXISTS public.paint_war_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT NOT NULL DEFAULT 'waiting', -- 'waiting' | 'selecting_word' | 'drawing' | 'round_ended'
    current_drawer_id TEXT,
    current_drawer_name TEXT,
    current_drawer_avatar TEXT,
    current_word TEXT,
    word_hint TEXT,
    category TEXT DEFAULT 'Campuran IT & Kantor',
    round_number INT NOT NULL DEFAULT 1,
    total_rounds INT NOT NULL DEFAULT 5,
    round_start_time TIMESTAMPTZ,
    round_duration_sec INT NOT NULL DEFAULT 60,
    canvas_snapshot TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.paint_war_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.paint_war_rooms(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_avatar TEXT,
    score INT NOT NULL DEFAULT 0,
    has_guessed BOOLEAN NOT NULL DEFAULT false,
    is_drawing BOOLEAN NOT NULL DEFAULT false,
    is_online BOOLEAN NOT NULL DEFAULT true,
    last_seen TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(room_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.paint_war_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.paint_war_rooms(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_avatar TEXT,
    message TEXT NOT NULL CHECK (char_length(trim(message)) > 0 AND char_length(message) <= 300),
    is_system BOOLEAN NOT NULL DEFAULT false,
    is_correct_guess BOOLEAN NOT NULL DEFAULT false,
    points_awarded INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.paint_war_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paint_war_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paint_war_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "paint_war_rooms_select" ON public.paint_war_rooms FOR SELECT USING (true);
CREATE POLICY "paint_war_rooms_insert" ON public.paint_war_rooms FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "paint_war_rooms_update" ON public.paint_war_rooms FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "paint_war_players_select" ON public.paint_war_players FOR SELECT USING (true);
CREATE POLICY "paint_war_players_insert" ON public.paint_war_players FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "paint_war_players_update" ON public.paint_war_players FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "paint_war_players_delete" ON public.paint_war_players FOR DELETE USING (user_id = auth.uid()::text OR public.is_admin());

CREATE POLICY "paint_war_messages_select" ON public.paint_war_messages FOR SELECT USING (true);
CREATE POLICY "paint_war_messages_insert" ON public.paint_war_messages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_paint_war_players_room ON public.paint_war_players(room_id);
CREATE INDEX IF NOT EXISTS idx_paint_war_players_user ON public.paint_war_players(user_id);
CREATE INDEX IF NOT EXISTS idx_paint_war_messages_room ON public.paint_war_messages(room_id, created_at DESC);

GRANT ALL ON public.paint_war_rooms TO anon, authenticated, service_role;
GRANT ALL ON public.paint_war_players TO anon, authenticated, service_role;
GRANT ALL ON public.paint_war_messages TO anon, authenticated, service_role;

ALTER PUBLICATION supabase_realtime ADD TABLE public.paint_war_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.paint_war_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.paint_war_messages;

INSERT INTO public.paint_war_rooms (id, status, category, round_number, total_rounds, round_duration_sec)
VALUES ('00000000-0000-0000-0000-000000000099'::uuid, 'waiting', 'Campuran IT & Kantor', 1, 5, 60)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Table: wordle_daily_entries
-- WORDLE98.EXE / Tebak Kata Harian 98
-- ============================================================
CREATE TABLE IF NOT EXISTS public.wordle_daily_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_avatar TEXT,
    target_date DATE NOT NULL,
    guesses TEXT[] NOT NULL DEFAULT '{}',
    is_solved BOOLEAN NOT NULL DEFAULT false,
    attempts INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMPTZ,
    UNIQUE(user_id, target_date)
);

ALTER TABLE public.wordle_daily_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wordle_daily_entries_select" ON public.wordle_daily_entries FOR SELECT USING (true);
CREATE POLICY "wordle_daily_entries_insert" ON public.wordle_daily_entries FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND user_id = auth.uid()::text
);
CREATE POLICY "wordle_daily_entries_update" ON public.wordle_daily_entries FOR UPDATE USING (
    auth.uid() IS NOT NULL AND user_id = auth.uid()::text
);

CREATE INDEX IF NOT EXISTS idx_wordle_target_date ON public.wordle_daily_entries(target_date, attempts);
CREATE INDEX IF NOT EXISTS idx_wordle_user_id ON public.wordle_daily_entries(user_id);

GRANT ALL ON public.wordle_daily_entries TO anon, authenticated, service_role;

ALTER PUBLICATION supabase_realtime ADD TABLE public.wordle_daily_entries;


