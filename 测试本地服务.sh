#!/bin/bash

# 快速测试本地稍后阅读服务

echo "🚀 启动稍后阅读主页服务..."
echo ""

# 启动服务（后台）
npm run serve:read-later &
SERVER_PID=$!

echo "等待服务启动..."
sleep 3

# 测试服务
echo ""
echo "📡 测试服务连接..."
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ 服务运行正常！"
    echo ""
    echo "🌐 访问地址:"
    echo "   http://localhost:3001"
    echo ""
    echo "🔍 健康检查:"
    curl -s http://localhost:3001/health | python3 -m json.tool || echo "OK"
    echo ""
    echo "💡 按 Ctrl+C 停止服务"
    echo ""
    
    # 等待用户中断
    wait $SERVER_PID
else
    echo "❌ 服务启动失败"
    echo ""
    echo "可能的原因:"
    echo "  1. 端口 3001 已被占用"
    echo "  2. 缺少依赖文件"
    echo ""
    echo "尝试手动运行: npm run serve:read-later"
    
    kill $SERVER_PID 2>/dev/null
    exit 1
fi
