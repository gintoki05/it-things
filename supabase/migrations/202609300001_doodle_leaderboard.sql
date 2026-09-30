-- Migrasi Tabel Doodle Leaderboard (Solo Wave Mode)
-- IT-THINGS.EXE v2.3.67

CREATE TABLE IF NOT EXISTS public.doodle_leaderboard (
  user_id TEXT PRIMARY KEY,
  user_name TEXT NOT NULL CHECK (char_length(user_name) BETWEEN 1 AND 80),
  user_avatar TEXT,
  highest_wave INTEGER NOT NULL DEFAULT 1,
  highest_score INTEGER NOT NULL DEFAULT 0,
  total_kills INTEGER NOT NULL DEFAULT 0,
  total_headshots INTEGER NOT NULL DEFAULT 0,
  games_played INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.doodle_leaderboard ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS doodle_leaderboard_select ON public.doodle_leaderboard;
CREATE POLICY doodle_leaderboard_select ON public.doodle_leaderboard
  FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS doodle_leaderboard_insert ON public.doodle_leaderboard;
CREATE POLICY doodle_leaderboard_insert ON public.doodle_leaderboard
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() IS NOT NULL AND user_id = auth.uid()::text
  );

DROP POLICY IF EXISTS doodle_leaderboard_update ON public.doodle_leaderboard;
CREATE POLICY doodle_leaderboard_update ON public.doodle_leaderboard
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()::text OR public.is_admin())
  WITH CHECK (user_id = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS doodle_leaderboard_delete ON public.doodle_leaderboard;
CREATE POLICY doodle_leaderboard_delete ON public.doodle_leaderboard
  FOR DELETE TO authenticated USING (public.is_admin());

CREATE INDEX IF NOT EXISTS doodle_leaderboard_ranking_idx
  ON public.doodle_leaderboard(highest_wave DESC, highest_score DESC, total_kills DESC);

GRANT ALL ON public.doodle_leaderboard TO anon, authenticated, service_role;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.doodle_leaderboard FROM anon, authenticated;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public' AND tablename = 'doodle_leaderboard') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.doodle_leaderboard;
  END IF;
END $$;
