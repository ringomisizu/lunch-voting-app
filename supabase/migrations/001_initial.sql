-- ============================================================
-- 1. settings (singleton: id boolean PRIMARY KEY)
-- ============================================================
CREATE TABLE public.settings (
  id                boolean     PRIMARY KEY DEFAULT true CHECK (id = true),
  title             text        NOT NULL DEFAULT '',
  status            text        NOT NULL DEFAULT 'preparing'
                                CHECK (status IN ('preparing', 'open', 'closed')),
  results_published boolean     NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Insert the single row immediately
INSERT INTO public.settings (id) VALUES (true);

-- ============================================================
-- 2. candidates
-- ============================================================
CREATE TABLE public.candidates (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  sort_order integer     NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name)
);

-- ============================================================
-- 3. voters
-- ============================================================
CREATE TABLE public.voters (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  voter_token text        NOT NULL UNIQUE,
  voted_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. votes
-- ============================================================
CREATE TABLE public.votes (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  voter_id     uuid        NOT NULL REFERENCES public.voters(id) ON DELETE CASCADE,
  candidate_id uuid        NOT NULL REFERENCES public.candidates(id) ON DELETE RESTRICT,
  points       integer     NOT NULL CHECK (points >= 0 AND points <= 100),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (voter_id, candidate_id)
);

-- ============================================================
-- 5. RLS: deny all public access
-- ============================================================
ALTER TABLE public.settings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voters     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes      ENABLE ROW LEVEL SECURITY;

-- anon / authenticated roles cannot access any table.
-- service_role bypasses RLS by default in Supabase.
CREATE POLICY "deny_all_settings"
  ON public.settings   FOR ALL TO anon, authenticated USING (false);
CREATE POLICY "deny_all_candidates"
  ON public.candidates FOR ALL TO anon, authenticated USING (false);
CREATE POLICY "deny_all_voters"
  ON public.voters     FOR ALL TO anon, authenticated USING (false);
CREATE POLICY "deny_all_votes"
  ON public.votes      FOR ALL TO anon, authenticated USING (false);

-- ============================================================
-- 6. Table-level grants for service_role
--    (Required for newer Supabase projects where service_role
--     no longer gets automatic access to user-created tables)
-- ============================================================
GRANT ALL ON ALL TABLES    IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ============================================================
-- 7. submit_vote function
-- ============================================================
CREATE OR REPLACE FUNCTION public.submit_vote(
  p_voter_token  text,
  p_distribution jsonb  -- [{"candidate_id": "<uuid>", "points": <int>}, ...]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settings      public.settings%ROWTYPE;
  v_voter_count   integer;
  v_voter_id      uuid;
  v_total_points  integer := 0;
  v_elem          jsonb;
  v_cid_text      text;
  v_cid           uuid;
  v_pts_text      text;
  v_pts           integer;
  v_seen_ids      uuid[] := '{}';
BEGIN
  -- 1. Lock the singleton settings row to serialize concurrent submissions
  SELECT * INTO v_settings
  FROM public.settings WHERE id = true FOR UPDATE;

  -- 2. Voting must be open
  IF v_settings.status <> 'open' THEN
    RAISE EXCEPTION 'VOTING_NOT_OPEN';
  END IF;

  -- 3. Count existing voters (safe: settings row is locked above)
  SELECT COUNT(*) INTO v_voter_count FROM public.voters;
  IF v_voter_count >= 3 THEN
    RAISE EXCEPTION 'VOTING_CLOSED';
  END IF;

  -- 4. Validate p_distribution: not null, must be a JSON array, non-empty
  IF p_distribution IS NULL
     OR jsonb_typeof(p_distribution) <> 'array'
     OR jsonb_array_length(p_distribution) = 0
  THEN
    RAISE EXCEPTION 'INVALID_DISTRIBUTION';
  END IF;

  -- 5. Validate each element
  FOR v_elem IN SELECT * FROM jsonb_array_elements(p_distribution)
  LOOP
    -- 5a. candidate_id must be present and match UUID format
    v_cid_text := v_elem->>'candidate_id';
    IF v_cid_text IS NULL OR v_cid_text = '' THEN
      RAISE EXCEPTION 'INVALID_CANDIDATE';
    END IF;
    IF v_cid_text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RAISE EXCEPTION 'INVALID_CANDIDATE';
    END IF;
    -- Safe to cast: already validated as UUID format
    v_cid := v_cid_text::uuid;

    -- 5b. No duplicate candidate IDs
    IF v_cid = ANY(v_seen_ids) THEN
      RAISE EXCEPTION 'DUPLICATE_CANDIDATE';
    END IF;
    v_seen_ids := array_append(v_seen_ids, v_cid);

    -- 5c. Candidate must exist in the registered candidates
    IF NOT EXISTS (SELECT 1 FROM public.candidates WHERE id = v_cid) THEN
      RAISE EXCEPTION 'INVALID_CANDIDATE';
    END IF;

    -- 5d. points must be a non-negative integer string (no decimals, no sign)
    v_pts_text := v_elem->>'points';
    IF v_pts_text IS NULL OR v_pts_text !~ '^(0|[1-9][0-9]*)$' THEN
      RAISE EXCEPTION 'INVALID_POINTS';
    END IF;

    -- 5e. Guard against integer overflow before casting:
    --     valid range is 0-100 (max 3 digits); reject strings longer than 4 chars
    --     so the cast is always safe (max attempted value: 9999)
    IF length(v_pts_text) > 4 THEN
      RAISE EXCEPTION 'POINTS_OUT_OF_RANGE';
    END IF;
    v_pts := v_pts_text::integer;

    -- 5f. Enforce 0-100 range after cast
    IF v_pts < 0 OR v_pts > 100 THEN
      RAISE EXCEPTION 'POINTS_OUT_OF_RANGE';
    END IF;

    v_total_points := v_total_points + v_pts;
  END LOOP;

  -- 6. Total must equal exactly 100
  IF v_total_points <> 100 THEN
    RAISE EXCEPTION 'INVALID_TOTAL_POINTS';
  END IF;

  -- 7. Insert voter record
  INSERT INTO public.voters (voter_token)
  VALUES (p_voter_token)
  RETURNING id INTO v_voter_id;

  -- 8. Insert individual vote rows
  INSERT INTO public.votes (voter_id, candidate_id, points)
  SELECT v_voter_id,
         (elem->>'candidate_id')::uuid,
         (elem->>'points')::integer
  FROM jsonb_array_elements(p_distribution) AS elem;

  -- 9. If this was the 3rd vote, close voting automatically
  IF v_voter_count + 1 >= 3 THEN
    UPDATE public.settings
    SET status = 'closed', updated_at = now()
    WHERE id = true;
  END IF;
END;
$$;

-- Restrict execution: service_role only
REVOKE ALL ON FUNCTION public.submit_vote(text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_vote(text, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.submit_vote(text, jsonb) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.submit_vote(text, jsonb) TO service_role;

-- ============================================================
-- 7. reset_votes function
-- ============================================================
CREATE OR REPLACE FUNCTION public.reset_votes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Lock settings row to prevent concurrent submit_vote during reset
  PERFORM id FROM public.settings WHERE id = true FOR UPDATE;

  -- WHERE true makes the intent explicit and satisfies Supabase's bulk-delete protection
  DELETE FROM public.votes  WHERE true;
  DELETE FROM public.voters WHERE true;

  -- Reset status and results_published; title and candidates are preserved
  UPDATE public.settings
  SET status            = 'preparing',
      results_published = false,
      updated_at        = now()
  WHERE id = true;
END;
$$;

-- Restrict execution: service_role only
REVOKE ALL ON FUNCTION public.reset_votes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reset_votes() FROM anon;
REVOKE ALL ON FUNCTION public.reset_votes() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.reset_votes() TO service_role;
