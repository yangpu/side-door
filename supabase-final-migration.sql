-- Side Door 稍后阅读 - 最终迁移脚本
-- 执行此文件以完成所有数据库优化

-- ========================================
-- 1. 创建 article-images bucket（如果不存在）
-- ========================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'article-images',
  'article-images',
  true,
  52428800,  -- 50MB
  ARRAY[
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
    'image/webp', 'image/svg+xml', 'image/bmp',
    'video/mp4', 'video/webm',
    'audio/mpeg', 'audio/mp3', 'audio/wav'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
    'image/webp', 'image/svg+xml', 'image/bmp',
    'video/mp4', 'video/webm',
    'audio/mpeg', 'audio/mp3', 'audio/wav'
  ];

-- ========================================
-- 2. 删除旧的Storage RLS策略
-- ========================================

-- article-files bucket
DROP POLICY IF EXISTS "Allow public read access to article-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to insert article-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update article-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete article-files" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for article-files" ON storage.objects;
DROP POLICY IF EXISTS "Public insert access for article-files" ON storage.objects;
DROP POLICY IF EXISTS "Public update access for article-files" ON storage.objects;
DROP POLICY IF EXISTS "Public delete access for article-files" ON storage.objects;

-- article-images bucket
DROP POLICY IF EXISTS "Public read access for article-images" ON storage.objects;
DROP POLICY IF EXISTS "Public insert access for article-images" ON storage.objects;
DROP POLICY IF EXISTS "Public update access for article-images" ON storage.objects;
DROP POLICY IF EXISTS "Public delete access for article-images" ON storage.objects;

-- ========================================
-- 3. 创建新的公开RLS策略（允许匿名用户）
-- ========================================

-- article-files bucket 策略
CREATE POLICY "Public read access for article-files"
ON storage.objects FOR SELECT
USING (bucket_id = 'article-files');

CREATE POLICY "Public insert access for article-files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'article-files');

CREATE POLICY "Public update access for article-files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'article-files')
WITH CHECK (bucket_id = 'article-files');

CREATE POLICY "Public delete access for article-files"
ON storage.objects FOR DELETE
USING (bucket_id = 'article-files');

-- article-images bucket 策略
CREATE POLICY "Public read access for article-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'article-images');

CREATE POLICY "Public insert access for article-images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'article-images');

CREATE POLICY "Public update access for article-images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'article-images')
WITH CHECK (bucket_id = 'article-images');

CREATE POLICY "Public delete access for article-images"
ON storage.objects FOR DELETE
USING (bucket_id = 'article-images');

-- ========================================
-- 4. 删除不再使用的 article_images 表
-- ========================================
DROP TABLE IF EXISTS article_images CASCADE;

-- ========================================
-- 5. 验证配置
-- ========================================

-- 验证 buckets
SELECT id, name, public, file_size_limit
FROM storage.buckets
WHERE id IN ('article-files', 'article-images');

-- 验证 Storage 策略
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN roles = '{}'::name[] THEN '所有用户（包括匿名）'
    ELSE roles::text
  END as roles,
  permissive
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND (policyname LIKE '%article-files%' OR policyname LIKE '%article-images%')
ORDER BY policyname;

-- 验证 article_images 表已删除
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'article_images';
-- 应该返回空结果
