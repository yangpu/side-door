-- 修复Storage RLS策略 - 允许匿名用户上传文件
-- 请在Supabase仪表板的SQL编辑器中执行此文件

-- ========================================
-- article-files bucket (HTML/PDF 文件)
-- ========================================

-- 1. 删除现有的 article-files 策略
DROP POLICY IF EXISTS "Allow public read access to article-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to insert article-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update article-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete article-files" ON storage.objects;

-- 2. 创建新的公开策略（允许匿名用户）
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

-- ========================================
-- article-images bucket (图片/视频/音频)
-- ========================================

-- 3. 删除现有的 article-images 策略
DROP POLICY IF EXISTS "Public read access for article-images" ON storage.objects;
DROP POLICY IF EXISTS "Public insert access for article-images" ON storage.objects;
DROP POLICY IF EXISTS "Public update access for article-images" ON storage.objects;
DROP POLICY IF EXISTS "Public delete access for article-images" ON storage.objects;

-- 4. 创建新的公开策略（允许匿名用户）
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
-- 验证策略
-- ========================================

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
