-- sns_adsテーブルの作成
CREATE TABLE IF NOT EXISTS public.sns_ads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    link_url TEXT,
    weight INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLSポリシーの設定
ALTER TABLE public.sns_ads ENABLE ROW LEVEL SECURITY;

-- 誰でも参照可能
CREATE POLICY "Public profiles are viewable by everyone."
ON public.sns_ads FOR SELECT
USING ( true );

-- adminおよびsystemロールのみ挿入・更新・削除可能
CREATE POLICY "Only admin and system can insert ads."
ON public.sns_ads FOR INSERT
WITH CHECK ( 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.role = 'admin' OR profiles.role = 'system')
  )
);

CREATE POLICY "Only admin and system can update ads."
ON public.sns_ads FOR UPDATE
USING ( 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.role = 'admin' OR profiles.role = 'system')
  )
);

CREATE POLICY "Only admin and system can delete ads."
ON public.sns_ads FOR DELETE
USING ( 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.role = 'admin' OR profiles.role = 'system')
  )
);

-- ストレージバケット 'ads' の作成
INSERT INTO storage.buckets (id, name, public) 
VALUES ('ads', 'ads', true)
ON CONFLICT (id) DO NOTHING;

-- ストレージバケット 'ads' のRLSポリシー
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'ads' );

CREATE POLICY "Admin and System Insert"
ON storage.objects FOR INSERT
WITH CHECK ( 
  bucket_id = 'ads' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.role = 'admin' OR profiles.role = 'system')
  )
);

CREATE POLICY "Admin and System Update"
ON storage.objects FOR UPDATE
USING ( 
  bucket_id = 'ads' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.role = 'admin' OR profiles.role = 'system')
  )
);

CREATE POLICY "Admin and System Delete"
ON storage.objects FOR DELETE
USING ( 
  bucket_id = 'ads' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.role = 'admin' OR profiles.role = 'system')
  )
);
