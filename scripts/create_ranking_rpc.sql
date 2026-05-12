-- ==========================================
-- ランキング取得用RPC関数 (get_cast_rankings)
-- ==========================================
-- カテゴリ、期間、対象キャストID配列を指定してランキングを取得します。
--
-- 引数:
--   p_category: 'likes', 'followers', 'pv', 'reservations'
--   p_period: 'daily', 'weekly', 'monthly'
--   p_cast_ids: 絞り込むキャストのID配列 (UUID[])
--   p_limit: 取得件数 (デフォルト10)
--   p_offset: スキップ件数 (デフォルト0)

DROP FUNCTION IF EXISTS public.get_cast_rankings(text, text, uuid[], integer, integer);

CREATE OR REPLACE FUNCTION public.get_cast_rankings(
    p_category text,
    p_period text,
    p_cast_ids uuid[],
    p_limit integer DEFAULT 10,
    p_offset integer DEFAULT 0
)
RETURNS TABLE (
    cast_id uuid,
    score bigint,
    rank bigint
) 
SECURITY DEFINER
AS $$
DECLARE
    v_start_time timestamptz;
    v_end_time timestamptz;
BEGIN
    IF p_period = 'daily' THEN
        -- 過去24時間
        v_start_time := now() - interval '24 hours';
        v_end_time := now();
    ELSIF p_period = 'weekly' THEN
        -- 過去7日間
        v_start_time := now() - interval '7 days';
        v_end_time := now();
    ELSIF p_period = 'monthly' THEN
        -- 過去30日間
        v_start_time := now() - interval '30 days';
        v_end_time := now();
    ELSIF p_period = 'all_time' THEN
        -- 累計（全期間）
        v_start_time := '1970-01-01 00:00:00+00';
        v_end_time := now();
    ELSE
        v_start_time := now() - interval '30 days';
        v_end_time := now();
    END IF;

    IF p_category = 'likes' THEN
        RETURN QUERY
        SELECT 
            sp.cast_id,
            COUNT(spl.post_id)::bigint AS score,
            ROW_NUMBER() OVER (ORDER BY COUNT(spl.post_id) DESC, MAX(spl.created_at) DESC)::bigint AS rank
        FROM public.sns_post_likes spl
        JOIN public.sns_posts sp ON spl.post_id = sp.id
        WHERE spl.created_at >= v_start_time AND spl.created_at <= v_end_time
          AND sp.cast_id = ANY(p_cast_ids)
        GROUP BY sp.cast_id
        ORDER BY rank ASC
        LIMIT p_limit OFFSET p_offset;

    ELSIF p_category = 'followers' THEN
        RETURN QUERY
        SELECT 
            sf.following_id AS cast_id,
            COUNT(*)::bigint AS score,
            ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC, MAX(sf.created_at) DESC)::bigint AS rank
        FROM public.sns_follows sf
        WHERE sf.created_at >= v_start_time AND sf.created_at <= v_end_time
          AND sf.following_id = ANY(p_cast_ids)
        GROUP BY sf.following_id
        ORDER BY rank ASC
        LIMIT p_limit OFFSET p_offset;

    ELSIF p_category = 'pv' THEN
        RETURN QUERY
        SELECT 
            pv.target_id AS cast_id,
            COUNT(pv.id)::bigint AS score,
            ROW_NUMBER() OVER (ORDER BY COUNT(pv.id) DESC, MAX(pv.created_at) DESC)::bigint AS rank
        FROM public.page_views pv
        WHERE pv.created_at >= v_start_time AND pv.created_at <= v_end_time
          AND pv.page_type = 'cast_profile'
          AND pv.target_id = ANY(p_cast_ids)
        GROUP BY pv.target_id
        ORDER BY rank ASC
        LIMIT p_limit OFFSET p_offset;

    ELSIF p_category = 'reservations' THEN
        RETURN QUERY
        SELECT 
            s.cast_id,
            COUNT(s.id)::bigint AS score,
            ROW_NUMBER() OVER (ORDER BY COUNT(s.id) DESC, MAX(s.created_at) DESC)::bigint AS rank
        FROM public.sales s
        WHERE s.created_at >= v_start_time AND s.created_at <= v_end_time
          AND s.is_web_reservation = true
          AND s.cast_id = ANY(p_cast_ids)
        GROUP BY s.cast_id
        ORDER BY rank ASC
        LIMIT p_limit OFFSET p_offset;

    END IF;

END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.get_cast_rankings(text, text, uuid[], integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cast_rankings(text, text, uuid[], integer, integer) TO anon;
