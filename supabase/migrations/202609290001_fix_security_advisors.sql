-- ============================================================
-- MIGRATION: 202609290001_fix_security_advisors.sql
-- Memperbaiki 28 security advisor warnings di Supabase
-- ============================================================

-- ------------------------------------------------------------
-- 1. FIX: function_search_path_mutable (2 warnings)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_chat_message_soft_delete()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_deleted = true THEN
    NEW.message := '[Pesan telah dihapus]';
    NEW.mentions := '{}'::text[];
    DELETE FROM public.chat_reactions WHERE message_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_feedback_upvote_count()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.feedbacks
        SET upvote_count = upvote_count + 1,
            updated_at = timezone('utc'::text, now())
        WHERE id = NEW.feedback_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.feedbacks
        SET upvote_count = GREATEST(0, upvote_count - 1),
            updated_at = timezone('utc'::text, now())
        WHERE id = OLD.feedback_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;


-- ------------------------------------------------------------
-- 2. FIX: rls_policy_always_true (2 warnings)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can insert feedback" ON public.feedbacks;
CREATE POLICY "Authenticated users can insert feedback"
ON public.feedbacks FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by_id = auth.uid()::text
);

DROP POLICY IF EXISTS "Authenticated users can upvote" ON public.feedback_upvotes;
CREATE POLICY "Authenticated users can upvote"
ON public.feedback_upvotes FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()::text
);


-- ------------------------------------------------------------
-- 3. FIX: public_bucket_allows_listing (1 warning)
-- ------------------------------------------------------------
-- Drop SELECT policy broad pada storage.objects untuk bucket 'avatars'.
-- File foto profil tetap bisa diakses publik langsung via URL karena bucket sudah public = true.
DROP POLICY IF EXISTS "Public avatars are readable by everyone" ON storage.objects;


-- ------------------------------------------------------------
-- 4. FIX: anon & authenticated security definer triggers (8 warnings)
-- Trigger functions tidak boleh dieksekusi via PostgREST RPC
-- ------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.handle_chat_message_soft_delete() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_feedback_upvote_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_pantry_log_stock() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_pantry_restock() FROM PUBLIC, anon, authenticated;


-- ------------------------------------------------------------
-- 5. FIX: anon & authenticated security definer internal functions (4 warnings)
-- Maintenance & profile sync functions hanya untuk service_role
-- ------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_split_bills() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_split_bills() TO service_role;

REVOKE EXECUTE ON FUNCTION public.sync_user_profile_name(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_user_profile_name(TEXT, TEXT) TO service_role;


-- ------------------------------------------------------------
-- 6. FIX: anon & authenticated security definer helper functions (10 warnings)
-- Ubah ke SECURITY INVOKER (karena tabel team_members & module_pics punya policy SELECT true)
-- Cabut izin EXECUTE dari anon (hanya authenticated & service_role)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
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

CREATE OR REPLACE FUNCTION public.is_module_pic(p_module TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
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
SECURITY INVOKER
STABLE
SET search_path = ''
AS $$
  SELECT public.is_module_pic('kas');
$$;

CREATE OR REPLACE FUNCTION public.is_pantry_pic()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = ''
AS $$
  SELECT public.is_module_pic('pantry');
$$;

CREATE OR REPLACE FUNCTION public.is_treasurer()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = ''
AS $$
  SELECT public.is_module_pic('kas');
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_module_pic(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_module_pic(TEXT) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_kas_pic() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_kas_pic() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_pantry_pic() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_pantry_pic() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_treasurer() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_treasurer() TO authenticated, service_role;
