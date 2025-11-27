#!/bin/bash

# 快速测试脚本 - 使用 Service Role Key 上传

echo "⚠️  请先设置你的 Service Role Key！"
echo ""
echo "1. 访问: https://app.supabase.com"
echo "2. 你的项目 → Settings → API"
echo "3. 复制 'service_role' 密钥"
echo ""
echo "然后运行以下命令:"
echo ""
echo "export SUPABASE_SERVICE_ROLE_KEY=\"粘贴你的service_role密钥\""
echo "npm run upload:standalone"
echo ""
echo "或者直接在下面替换 YOUR_SERVICE_ROLE_KEY_HERE 后运行此脚本"
echo ""

# 取消下面一行的注释，并替换为你的 service_role key
# export SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY_HERE"

# 如果已设置，则运行上传
if [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "✅ 检测到 Service Role Key，开始上传..."
    npm run upload:standalone
else
    echo "❌ 未检测到 SUPABASE_SERVICE_ROLE_KEY 环境变量"
    echo "请先设置后再运行"
fi
