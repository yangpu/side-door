/**
 * 使用原生 fetch API 上传文件到 Supabase Storage
 * 绕过 Supabase SDK 的潜在问题
 */

import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://rimhmaeecdcrhuqbisjv.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                     process.env.VITE_SUPABASE_ANON_KEY || 
                     'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpbWhtYWVlY2Rjcmh1cWJpc2p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTgwNDYsImV4cCI6MjA3OTAzNDA0Nn0.rSiGYktT3oESNSGRTY8S2hF_0_aoS6xNzzfh4d71BQY';

const BUCKET_NAME = 'public-pages';
const FILE_NAME = 'read-later.html';
const SOURCE_FILE = 'public/read-later-standalone.html';

async function uploadWithFetch() {
  try {
    console.log('🚀 使用 REST API 上传稍后阅读主页...\n');

    const usingServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    console.log('🔑 密钥类型:', usingServiceRole ? 'Service Role Key ✅' : 'Anon Key ⚠️\n');

    // 1. 读取文件
    const sourcePath = path.join(process.cwd(), SOURCE_FILE);
    
    if (!fs.existsSync(sourcePath)) {
      console.error('❌ 找不到源文件:', sourcePath);
      process.exit(1);
    }

    console.log('📖 读取文件...');
    const fileContent = fs.readFileSync(sourcePath, 'utf-8');
    console.log('   文件大小:', (Buffer.byteLength(fileContent, 'utf-8') / 1024).toFixed(2), 'KB\n');

    // 2. 先尝试删除旧文件
    console.log('🗑️  删除旧文件（如果存在）...');
    const deleteUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${FILE_NAME}`;
    
    const deleteResponse = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY,
      },
    });

    if (deleteResponse.ok) {
      console.log('   ✅ 已删除旧文件\n');
    } else if (deleteResponse.status === 404) {
      console.log('   ℹ️  没有旧文件需要删除\n');
    } else {
      const errorText = await deleteResponse.text();
      console.log('   ⚠️  删除时出现警告:', deleteResponse.status, errorText, '\n');
    }

    // 3. 上传新文件（使用正确的 Content-Type header）
    console.log('⬆️  上传文件...');
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${FILE_NAME}`;
    
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY,
        'Content-Type': 'text/html; charset=utf-8',
        'x-upsert': 'false', // 已经删除旧文件了
      },
      body: fileContent,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('❌ 上传失败!');
      console.error('   状态码:', uploadResponse.status);
      console.error('   错误信息:', errorText);
      
      if (uploadResponse.status === 403 || uploadResponse.status === 401) {
        console.log('\n💡 这是权限问题！解决方案:');
        console.log('\n方案 1: 使用 Service Role Key');
        console.log('   export SUPABASE_SERVICE_ROLE_KEY="你的service_role密钥"');
        console.log('\n方案 2: 配置 Storage RLS 策略');
        console.log('   执行 sql/setup-storage-upload-policy.sql');
      } else if (uploadResponse.status === 404) {
        console.log('\n💡 Bucket 不存在！');
        console.log('   请在 Supabase Dashboard 创建 public-pages bucket');
      }
      
      process.exit(1);
    }

    const result = await uploadResponse.json();
    console.log('   ✅ 上传成功!\n');

    // 4. 生成公开 URL
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${FILE_NAME}`;

    console.log('='.repeat(80));
    console.log('✅ 部署成功！');
    console.log('='.repeat(80));
    console.log('\n📍 稍后阅读主页 URL:');
    console.log('   ' + publicUrl);
    console.log('\n💡 使用提示:');
    console.log('   • 在浏览器中打开上面的链接');
    console.log('   • 应该看到渲染后的网页（不是源代码）');
    console.log('   • 添加到书签，随时访问');
    console.log('\n🔍 验证:');
    console.log('   1. 清除浏览器缓存或使用无痕模式');
    console.log('   2. 打开 URL，应该看到完整的网页');
    console.log('   3. 开发者工具 → Network → 检查 Content-Type 应为 text/html');
    console.log('\n' + '='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ 发生错误:', error);
    if (error instanceof Error) {
      console.error('   详细:', error.message);
    }
    process.exit(1);
  }
}

uploadWithFetch();
