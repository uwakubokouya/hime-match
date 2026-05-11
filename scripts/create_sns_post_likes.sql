CREATE TABLE IF NOT EXISTS public.sns_post_likes (
    post_id UUID REFERENCES public.sns_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (post_id, user_id)
);

-- Enable RLS
ALTER TABLE public.sns_post_likes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view post likes"
    ON public.sns_post_likes FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can insert post likes"
    ON public.sns_post_likes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own post likes"
    ON public.sns_post_likes FOR DELETE
    USING (auth.uid() = user_id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_sns_post_likes_post_id ON public.sns_post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_sns_post_likes_user_id ON public.sns_post_likes(user_id);
