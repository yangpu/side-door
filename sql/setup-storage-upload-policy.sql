-- ====================================================================
-- SideDoor 稍后阅读主页 - Storage 上传权限设置
-- ====================================================================
-- 
-- 此脚本用于配置 Supabase Storage，允许通过 API 上传文件到 public-pages bucket
-- 
-- 使用方法:
-- 1. 登录 Supabase Dashboard
-- 2. 进入 SQL Editor
-- 3. 复制并执行此脚本
-- 
-- 注意:
-- - 此策略允许任何人上传文件到 public-pages bucket
-- - 如果只想自己上传，请使用方案2（Service Role Key）
-- ====================================================================

-- 允许匿名用户插入（上传）文件到 public-pages bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('public-pages', 'public-pages', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 创建允许上传的策略
CREATE POLICY "Allow public uploads to public-pages"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'public-pages');

-- 创建允许更新（覆盖）的策略
CREATE POLICY "Allow public updates to public-pages"
ON storage.objects
FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'public-pages')
WITH CHECK (bucket_id = 'public-pages');

-- 创建允许删除的策略
CREATE POLICY "Allow public deletes from public-pages"
ON storage.objects
FOR DELETE
TO anon, authenticated
USING (bucket_id = 'public-pages');

-- 创建允许读取的策略
CREATE POLICY "Allow public reads from public-pages"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'public-pages');

-- ====================================================================
-- 验证设置
-- ====================================================================
-- 
-- 设置完成后，重新运行:
-- npm run upload:standalone
-- 
-- 应该可以成功上传了！
-- ====================================================================
