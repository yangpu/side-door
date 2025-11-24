-- 创建 article-images bucket 及其 RLS 策略
-- 请在 Supabase 仪表板的 SQL 编辑器中执行此文件

-- 1. 创建 article-images bucket（用于存储文章中的图片、视频、音频）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'article-images',
  'article-images',
  true,  -- 公开访问
  52428800,  -- 50MB 限制
  ARRAY[
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/mp3',
    'audio/wav'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/mp3',
    'audio/wav'
  ];

-- 2. 删除可能存在的旧策略
DROP POLICY IF EXISTS "Public read access for article-images" ON storage.objects;
DROP POLICY IF EXISTS "Public insert access for article-images" ON storage.objects;
DROP POLICY IF EXISTS "Public update access for article-images" ON storage.objects;
DROP POLICY IF EXISTS "Public delete access for article-images" ON storage.objects;

-- 3. 创建公开访问策略（允许匿名用户）

-- 读取权限 - 任何人都可以读取
CREATE POLICY "Public read access for article-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'article-images');

-- 上传权限 - 任何人都可以上传（包括匿名用户）
CREATE POLICY "Public insert access for article-images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'article-images');

-- 更新权限 - 任何人都可以更新
CREATE POLICY "Public update access for article-images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'article-images')
WITH CHECK (bucket_id = 'article-images');

-- 删除权限 - 任何人都可以删除
CREATE POLICY "Public delete access for article-images"
ON storage.objects FOR DELETE
USING (bucket_id = 'article-images');

-- 4. 验证策略是否创建成功
SELECT 
  policyname,
  cmd,
  permissive,
  CASE 
    WHEN roles = '{}'::name[] THEN '所有用户（包括匿名）'
    ELSE roles::text
  END as roles
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%article-images%'
ORDER BY policyname;

-- 5. 验证 bucket 是否创建成功
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'article-images';
