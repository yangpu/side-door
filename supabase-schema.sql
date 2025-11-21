-- Side Door 稍后阅读数据库架构

-- 1. 创建 articles 表
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  author TEXT,
  published_date TEXT,
  length INTEGER,
  language TEXT,
  summary TEXT,
  content TEXT NOT NULL,
  content_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_url ON articles(url);

-- 2. 创建 article_images 表
CREATE TABLE IF NOT EXISTS article_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  original_url TEXT NOT NULL,
  storage_path TEXT,
  storage_url TEXT,
  alt_text TEXT,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_article_images_article_id ON article_images(article_id);

-- 3. 创建 Storage Bucket (需要在 Supabase 控制台手动创建，或使用以下 SQL)
-- 注意：此部分需要在 Supabase 控制台的 Storage 部分手动创建名为 'article-images' 的 bucket
-- 并设置为 public 访问

-- 4. 创建更新 updated_at 的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. 为 articles 表创建触发器
DROP TRIGGER IF EXISTS update_articles_updated_at ON articles;
CREATE TRIGGER update_articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. 启用 Row Level Security (RLS)
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_images ENABLE ROW LEVEL SECURITY;

-- 7. 创建策略 (允许所有操作，适用于开发环境)
-- 注意：在生产环境中，应该根据实际需求设置更严格的策略

-- articles 表策略
DROP POLICY IF EXISTS "Allow all operations on articles" ON articles;
CREATE POLICY "Allow all operations on articles"
  ON articles
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- article_images 表策略
DROP POLICY IF EXISTS "Allow all operations on article_images" ON article_images;
CREATE POLICY "Allow all operations on article_images"
  ON article_images
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 8. 添加注释
COMMENT ON TABLE articles IS '稍后阅读文章表';
COMMENT ON TABLE article_images IS '文章图片表';
COMMENT ON COLUMN articles.id IS '文章唯一标识';
COMMENT ON COLUMN articles.title IS '文章标题';
COMMENT ON COLUMN articles.url IS '原文链接';
COMMENT ON COLUMN articles.author IS '作者';
COMMENT ON COLUMN articles.published_date IS '发布日期';
COMMENT ON COLUMN articles.length IS '文章字数';
COMMENT ON COLUMN articles.language IS '文章语言';
COMMENT ON COLUMN articles.summary IS '文章摘要(HTML格式)';
COMMENT ON COLUMN articles.content IS '文章内容(HTML格式)';
COMMENT ON COLUMN articles.content_text IS '文章纯文本内容';
COMMENT ON COLUMN article_images.original_url IS '原始图片URL';
COMMENT ON COLUMN article_images.storage_path IS 'Supabase Storage中的路径';
COMMENT ON COLUMN article_images.storage_url IS 'Supabase Storage的公开URL';
