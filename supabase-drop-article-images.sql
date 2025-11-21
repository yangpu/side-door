-- 删除不再使用的 article_images 表
-- 现在图片直接存储在 Storage 中，URL在content中引用

-- 1. 删除表（级联删除所有相关数据）
DROP TABLE IF EXISTS article_images CASCADE;

-- 2. 验证表已删除
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'article_images';
-- 应该返回空结果
