-- 修复：为 articles 表的 url 字段添加唯一约束 + 创建 Storage Buckets
-- 这是解决 upsert 错误和文件上传错误所必需的
-- 请在 Supabase Dashboard 的 SQL Editor 中执行此脚本
-- 注意：此脚本已自动执行，仅供参考

-- 1. 清理重复的 URL 记录（只保留最新的）
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

-- 2. 为 url 字段添加唯一约束
CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_url_unique ON articles(url);

-- 3. 创建 article-files 存储桶（用于存储 HTML/PDF 文件）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'article-files',
  'article-files',
  true,
  52428800, -- 50MB
  ARRAY['text/html', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- 4. 设置 article-files 存储桶的访问策略
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
