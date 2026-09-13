-- Transactional checks: no test rows survive or reach realtime subscribers.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000091","role":"authenticated"}', true);
INSERT INTO public.tower_daily_scores(user_id, user_name, score, floors)
VALUES ('00000000-0000-4000-8000-000000000091', 'Tower RLS test', 150, 1);
DO $$ DECLARE affected integer; BEGIN
  UPDATE public.tower_daily_scores SET score = 200
    WHERE user_id = '00000000-0000-4000-8000-000000000091';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Owner update failed'; END IF;
END $$;

SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000092","role":"authenticated"}', true);
DO $$ DECLARE affected integer; BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.tower_daily_scores WHERE user_id = '00000000-0000-4000-8000-000000000091') THEN
    RAISE EXCEPTION 'Authenticated leaderboard read failed';
  END IF;
  UPDATE public.tower_daily_scores SET score = 250 WHERE user_id = '00000000-0000-4000-8000-000000000091';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'Non-owner update allowed'; END IF;
  DELETE FROM public.tower_daily_scores WHERE user_id = '00000000-0000-4000-8000-000000000091';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'Non-owner delete allowed'; END IF;
  BEGIN
    INSERT INTO public.tower_daily_scores(user_id, user_name, score, floors)
    VALUES ('00000000-0000-4000-8000-000000000093', 'Forged owner test', 150, 1);
    RAISE EXCEPTION 'Forged owner insert allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.tower_daily_scores) THEN RAISE EXCEPTION 'Anonymous read allowed'; END IF;
  BEGIN
    INSERT INTO public.tower_daily_scores(user_id, user_name, score, floors)
    VALUES ('00000000-0000-4000-8000-000000000094', 'Anonymous test', 150, 1);
    RAISE EXCEPTION 'Anonymous insert allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
ROLLBACK;
