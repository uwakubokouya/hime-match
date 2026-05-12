-- スレッドテーブルにジャンルカラムを追加
ALTER TABLE public.sns_board_threads ADD COLUMN IF NOT EXISTS genre TEXT;
