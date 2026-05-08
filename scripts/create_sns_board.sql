CREATE TABLE IF NOT EXISTS public.sns_board_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    created_by UUID REFERENCES public.sns_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_post_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    post_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.sns_board_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES public.sns_board_threads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.sns_profiles(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.sns_board_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sns_board_posts ENABLE ROW LEVEL SECURITY;

-- Policies for threads (Everyone can view, authenticated can create)
DROP POLICY IF EXISTS "Anyone can view board threads" ON public.sns_board_threads;
CREATE POLICY "Anyone can view board threads" ON public.sns_board_threads FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create threads" ON public.sns_board_threads;
CREATE POLICY "Authenticated users can create threads" ON public.sns_board_threads FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their own threads" ON public.sns_board_threads;
CREATE POLICY "Users can update their own threads" ON public.sns_board_threads FOR UPDATE USING (auth.uid() = created_by);

-- Policies for posts (VIP/Admin can view and create)
DROP POLICY IF EXISTS "Authenticated users can view posts" ON public.sns_board_posts;
CREATE POLICY "Authenticated users can view posts" ON public.sns_board_posts FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can create posts" ON public.sns_board_posts;
CREATE POLICY "Authenticated users can create posts" ON public.sns_board_posts FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their own posts" ON public.sns_board_posts;
CREATE POLICY "Users can update their own posts" ON public.sns_board_posts FOR UPDATE USING (auth.uid() = user_id);
