-- 既存の旧テーブルを削除
DROP TABLE IF EXISTS public.sns_ads CASCADE;
DROP TABLE IF EXISTS public.sns_ad_contents CASCADE;
DROP TABLE IF EXISTS public.sns_ad_campaigns CASCADE;

-- 広告枠(キャンペーン)テーブルの作成
CREATE TABLE IF NOT EXISTS public.sns_ad_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    max_slots INTEGER NOT NULL DEFAULT 1,
    target_area TEXT DEFAULT 'all', -- 'all' または 都道府県名
    display_mode TEXT NOT NULL DEFAULT 'random', -- 'random' または 'ordered'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 広告内容(コンテンツ)テーブルの作成
CREATE TABLE IF NOT EXISTS public.sns_ad_contents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES public.sns_ad_campaigns(id) ON DELETE CASCADE,
    title TEXT,
    description TEXT,
    image_url TEXT,
    link_url TEXT,
    store_id UUID REFERENCES public.sns_profiles(id) ON DELETE SET NULL,
    sort_order INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLSの有効化
ALTER TABLE public.sns_ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sns_ad_contents ENABLE ROW LEVEL SECURITY;

-- アプリ側のReactで権限管理を行うため、DBアクセス自体は認証ユーザーにすべて許可
CREATE POLICY "Allow authenticated access to ad campaigns"
ON public.sns_ad_campaigns FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read access to ad campaigns"
ON public.sns_ad_campaigns FOR SELECT USING (true);

CREATE POLICY "Allow authenticated access to ad contents"
ON public.sns_ad_contents FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read access to ad contents"
ON public.sns_ad_contents FOR SELECT USING (true);
