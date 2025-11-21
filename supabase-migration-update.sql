-- 更新 articles 表结构，添加新字段
-- 注意：此脚本已自动执行，仅供参考

-- 1. 添加 cover_image 字段（文章首图）
ALTER TABLE articles ADD COLUMN IF NOT EXISTS cover_image TEXT;

-- 2. 添加 ai_summary 字段（AI 生成的摘要）
ALTER TABLE articles ADD COLUMN IF NOT EXISTS ai_summary TEXT;

-- 3. 添加 html_file_path 字段（存储在 Supabase Storage 的 HTML 文件路径）
ALTER TABLE articles ADD COLUMN IF NOT EXISTS html_file_path TEXT;

-- 4. 添加 html_file_url 字段（HTML 文件的公开 URL）
ALTER TABLE articles ADD COLUMN IF NOT EXISTS html_file_url TEXT;

-- 5. 添加 pdf_file_path 字段（存储在 Supabase Storage 的 PDF 文件路径）
ALTER TABLE articles ADD COLUMN IF NOT EXISTS pdf_file_path TEXT;

-- 6. 添加 pdf_file_url 字段（PDF 文件的公开 URL）
ALTER TABLE articles ADD COLUMN IF NOT EXISTS pdf_file_url TEXT;

-- 7. 清理重复的 URL 记录（只保留最新的）
WITH duplicates AS (
  SELECT id, url, created_at,
         ROW_NUMBER() OVER (PARTITION BY url ORDER BY created_at DESC) as rn
  FROM articles
  WHERE url IN (
    SELECT url FROM articles GROUP BY url HAVING COUNT(*) > 1
  )
)
DELETE FROM articles
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- 8. 为 url 字段添加唯一索引（用于 upsert）
CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_url_unique ON articles(url);

-- 9. 创建 article-files 存储桶（用于存储 HTML/PDF 文件）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'article-files',
  'article-files',
  true,
  52428800, -- 50MB
  ARRAY['text/html', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- 10. 设置存储桶策略
DROP POLICY IF EXISTS "Allow public read access to article-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public insert access to article-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update access to article-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete access to article-files" ON storage.objects;

CREATE POLICY "Allow public read access to article-files"
ON storage.objects FOR SELECT
USING (bucket_id = 'article-files');

CREATE POLICY "Allow public insert access to article-files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'article-files');

CREATE POLICY "Allow public update access to article-files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'article-files')
WITH CHECK (bucket_id = 'article-files');

CREATE POLICY "Allow public delete access to article-files"
ON storage.objects FOR DELETE
USING (bucket_id = 'article-files');
