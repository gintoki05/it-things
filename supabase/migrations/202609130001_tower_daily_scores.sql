-- Tower 98 casual daily leaderboard. Scores are plausibility-checked, not
-- cryptographically verified; this is not a tournament/financial scoreboard.
CREATE TABLE IF NOT EXISTS public.tower_daily_scores (
  user_id TEXT NOT NULL,
  target_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Jakarta')::date,
  user_name TEXT NOT NULL CHECK (char_length(user_name) BETWEEN 1 AND 80),
  score INTEGER NOT NULL,
  floors INTEGER NOT NULL CHECK (floors BETWEEN 1 AND 1000),
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, target_date),
  CHECK (score BETWEEN floors * 100 AND floors * 350 AND score % 50 = 0)
);

ALTER TABLE public.tower_daily_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY tower_scores_select ON public.tower_daily_scores
  FOR SELECT TO authenticated USING (true);
CREATE POLICY tower_scores_insert ON public.tower_daily_scores
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() IS NOT NULL AND user_id = auth.uid()::text
    AND target_date = (now() AT TIME ZONE 'Asia/Jakarta')::date
  );
CREATE POLICY tower_scores_update ON public.tower_daily_scores
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()::text OR public.is_admin())
  WITH CHECK (user_id = auth.uid()::text OR public.is_admin());
CREATE POLICY tower_scores_delete ON public.tower_daily_scores
  FOR DELETE TO authenticated USING (user_id = auth.uid()::text OR public.is_admin());

CREATE INDEX IF NOT EXISTS tower_scores_ranking_idx
  ON public.tower_daily_scores(target_date, score DESC, achieved_at, user_id);
GRANT ALL ON public.tower_daily_scores TO anon, authenticated, service_role;
-- TRUNCATE bypasses row policies; browser roles only need row-level operations.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.tower_daily_scores FROM anon, authenticated;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public' AND tablename = 'tower_daily_scores') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tower_daily_scores;
  END IF;
END $$;
