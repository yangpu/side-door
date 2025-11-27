-- ====================================================================
-- 修复 read-later.html 的 Content-Type
-- ====================================================================
-- 
-- 如果上传后页面显示源代码，执行此脚本修复 Content-Type
-- 
-- 使用方法:
-- 1. 登录 Supabase Dashboard
-- 2. 进入 SQL Editor
-- 3. 复制并执行此脚本
-- 4. 刷新浏览器页面
-- ====================================================================

-- 更新文件的 Content-Type 元数据
UPDATE storage.objects
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{mimetype}',
  '"text/html"'
)
WHERE bucket_id = 'public-pages' 
  AND name = 'read-later.html';

-- 验证更新
SELECT 
  name,
  metadata->>'mimetype' as content_type,
  created_at,
  updated_at
FROM storage.objects
WHERE bucket_id = 'public-pages' 
  AND name = 'read-later.html';

-- ====================================================================
-- 执行后应该看到:
-- name: read-later.html
-- content_type: text/html
-- ====================================================================
