ALTER TABLE public.sns_ad_campaigns ADD COLUMN IF NOT EXISTS placement TEXT NOT NULL DEFAULT 'board';
