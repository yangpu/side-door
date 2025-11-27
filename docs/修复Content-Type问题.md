# 🔧 修复 HTML 显示为源代码的问题

## 问题现象

打开 URL 后，浏览器显示的是 HTML 源代码，而不是渲染后的网页：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    ...
```

## 原因分析

这是因为文件的 **Content-Type** 设置不正确。Supabase Storage 返回的是 `text/plain` 而不是 `text/html`，导致浏览器将其当作普通文本显示。

## ✅ 解决方案

### 方法 1：重新运行上传脚本（推荐）

我已经修复了上传脚本，现在会：
1. 先删除旧文件
2. 用正确的 `Content-Type: text/html` 重新上传

**操作步骤**：

```bash
# 如果使用 Service Role Key
export SUPABASE_SERVICE_ROLE_KEY="你的密钥"
npm run upload:standalone

# 或者如果已配置 RLS 策略
npm run upload:standalone
```

脚本会自动删除旧文件并重新上传。

### 方法 2：在 Supabase Dashboard 手动删除后重新上传

1. **删除旧文件**
   - 访问：https://app.supabase.com
   - 选择你的项目
   - Storage → public-pages
   - 找到 `read-later.html`
   - 点击右侧的 ⋮ (三个点) → Delete

2. **重新上传**
   ```bash
   npm run upload:standalone
   ```

### 方法 3：手动上传并设置 Content-Type

1. **手动上传**
   - Supabase Dashboard → Storage → public-pages
   - Upload file → 选择 `public/read-later-standalone.html`
   - 上传前，展开 "Advanced options"
   - **Content-Type**: 设置为 `text/html`
   - Upload

2. **重命名文件**（如果需要）
   - 上传后文件名可能是 `read-later-standalone.html`
   - 重命名为 `read-later.html`

## 🔍 如何验证修复成功

1. **清除浏览器缓存**
   - Chrome/Edge: Ctrl+Shift+Delete (Windows) 或 Cmd+Shift+Delete (Mac)
   - 或者使用无痕/隐私模式

2. **打开 URL**
   ```
   https://rimhmaeecdcrhuqbisjv.supabase.co/storage/v1/object/public/public-pages/read-later.html
   ```

3. **应该看到**
   - ✅ 渲染后的网页，带有样式和布局
   - ✅ "SideDoor 稍后阅读" 标题
   - ✅ 文章列表（如果有保存的文章）

4. **检查 Content-Type**（可选）
   - 打开浏览器开发者工具 (F12)
   - 切换到 **Network** 标签
   - 刷新页面
   - 点击 `read-later.html` 请求
   - 查看 **Response Headers**
   - 应该看到：`Content-Type: text/html; charset=utf-8`

## 📊 Content-Type 对比

| Content-Type | 浏览器行为 | 问题 |
|-------------|-----------|------|
| ❌ `text/plain` | 显示源代码 | 当前问题 |
| ❌ `application/octet-stream` | 下载文件 | 错误设置 |
| ✅ `text/html` | 渲染网页 | 正确！ |

## 💡 预防措施

以后更新文件时，**始终使用脚本上传**：

```bash
npm run upload:standalone
```

脚本会确保：
- ✅ 正确的 Content-Type
- ✅ 正确的缓存控制
- ✅ UTF-8 编码
- ✅ 覆盖旧文件

**避免**手动在 Dashboard 上传，除非你记得设置 Content-Type。

## ❓ 还是不行？

### 尝试强制刷新浏览器

- Windows/Linux: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

### 检查文件是否真的更新了

访问 URL 并在末尾加上时间戳参数：
```
https://rimhmaeecdcrhuqbisjv.supabase.co/storage/v1/object/public/public-pages/read-later.html?t=12345
```

每次更改数字，浏览器会重新下载。

### 查看 Supabase Storage 元数据

在 Supabase Dashboard → Storage → public-pages → read-later.html:
- 点击文件名查看详情
- 检查 **metadata** 中的 `mimetype`
- 应该是 `text/html`

---

## 🎉 完成

修复后，你的稍后阅读主页应该可以正常显示了！
