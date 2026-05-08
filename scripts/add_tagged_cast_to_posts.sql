-- sns_postsテーブルに tagged_cast_id カラムを追加 (sns_profilesへの外部キー制約付き)
ALTER TABLE public.sns_posts
ADD COLUMN IF NOT EXISTS tagged_cast_id uuid REFERENCES public.sns_profiles(id) ON DELETE SET NULL;

-- 既存のPostgREST APIキャッシュを更新するためにリロード
NOTIFY pgrst, 'reload schema';
