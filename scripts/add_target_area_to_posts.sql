-- sns_postsテーブルに target_area カラムを追加
ALTER TABLE public.sns_posts
ADD COLUMN IF NOT EXISTS target_area text;

-- 既存のPostgREST APIキャッシュを更新するためにリロード
NOTIFY pgrst, 'reload schema';
