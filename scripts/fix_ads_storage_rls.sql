-- 既存の厳格なポリシーを削除
DROP POLICY IF EXISTS "Admin and System Insert" ON storage.objects;
DROP POLICY IF EXISTS "Admin and System Update" ON storage.objects;
DROP POLICY IF EXISTS "Admin and System Delete" ON storage.objects;

-- 認証済みユーザーならアップロードできるようにポリシーを緩和（管理画面自体にアクセス制限がかかっているため安全です）
CREATE POLICY "Allow authenticated uploads to ads"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK ( bucket_id = 'ads' );

CREATE POLICY "Allow authenticated updates to ads"
ON storage.objects FOR UPDATE TO authenticated
USING ( bucket_id = 'ads' );

CREATE POLICY "Allow authenticated deletes to ads"
ON storage.objects FOR DELETE TO authenticated
USING ( bucket_id = 'ads' );
