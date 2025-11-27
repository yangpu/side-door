# 🔧 修复 Content-Type - 在 Supabase Dashboard 手动操作

## 问题

文件已上传成功，但浏览器显示 HTML 源代码而不是渲染后的网页。

## 原因

文件的 **Content-Type** 元数据不正确（可能是 `text/plain` 或 `application/octet-stream`），而不是 `text/html`。

---

## ✅ 快速修复（2分钟）

### 方法 1：在 Supabase Dashboard 修改元数据

1. **打开 Storage**
   - 访问：https://app.supabase.com
   - 选择你的项目
   - 点击左侧 **Storage**

2. **找到文件**
   - 点击 `public-pages` bucket
   - 找到 `read-later.html` 文件

3. **更新元数据**
   - 点击文件右侧的 **⋮** (三个点)
   - 选择 **"Edit metadata"** 或 **"Update"**
   - 找到 **Content-Type** 或 **MIME Type** 字段
   - 修改为：`text/html`
   - 点击 **Save** 或 **Update**

4. **验证修复**
   - 清除浏览器缓存（Ctrl+Shift+Delete 或 Cmd+Shift+Delete）
   - 或使用无痕模式
   - 重新打开：https://rimhmaeecdcrhuqbisjv.supabase.co/storage/v1/object/public/public-pages/read-later.html
   - 应该看到渲染后的网页了！

---

### 方法 2：使用 Supabase SQL 直接修改

如果 Dashboard 中没有修改元数据的选项，可以通过 SQL：

1. **打开 SQL Editor**
   - Supabase Dashboard → SQL Editor → New query

2. **执行以下 SQL**

```sql
-- 更新文件的 Content-Type
UPDATE storage.objects
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{mimetype}',
  '"text/html"'
)
WHERE bucket_id = 'public-pages' 
  AND name = 'read-later.html';
```

3. **点击 Run**

4. **验证**
   - 刷新浏览器（强制刷新：Ctrl+Shift+R 或 Cmd+Shift+R）
   - 应该正常显示了

---

### 方法 3：重新上传（带正确的 Content-Type）

**暂时先用手动方法修复**，我正在开发一个能正确设置 Content-Type 的上传脚本。

---

## 🔍 如何验证 Content-Type

### 使用浏览器开发者工具

1. 打开页面：https://rimhmaeecdcrhuqbisjv.supabase.co/storage/v1/object/public/public-pages/read-later.html
2. 按 **F12** 打开开发者工具
3. 切换到 **Network** 标签
4. 刷新页面（F5）
5. 点击 `read-later.html` 请求
6. 查看 **Response Headers**
7. 找到 `Content-Type`
   - ❌ 错误：`text/plain` 或 `application/octet-stream`
   - ✅ 正确：`text/html` 或 `text/html; charset=utf-8`

---

## 💡 为什么会这样？

Supabase Storage 的 Content-Type 设置比较特殊：

1. **不是从请求头读取**：即使上传时设置了 `Content-Type` header，也可能被忽略
2. **需要元数据设置**：Content-Type 存储在数据库的 `metadata` 字段中
3. **扩展名判断**：有时会根据文件扩展名自动判断，但 `.html` 可能被错误识别

---

## 🎯 现在就去修复

**推荐方法 1**（最简单）：
1. 打开 https://app.supabase.com
2. Storage → public-pages → read-later.html
3. 点击 ⋮ → Edit metadata
4. Content-Type 改为 `text/html`
5. 保存

**2分钟搞定！** 🚀

修复后记得清除缓存或用无痕模式测试！
