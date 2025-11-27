/**
 * 简化版上传脚本 - 手动在 Supabase Dashboard 设置 Content-Type
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

async function uploadSimple() {
  try {
    console.log('🚀 上传稍后阅读主页...\n');

    const usingServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    console.log('🔑 密钥类型:', usingServiceRole ? 'Service Role Key ✅' : 'Anon Key ⚠️\n');

    // 读取文件
    const sourcePath = path.join(process.cwd(), SOURCE_FILE);
    
    if (!fs.existsSync(sourcePath)) {
      console.error('❌ 找不到源文件:', sourcePath);
      process.exit(1);
    }

    console.log('📖 读取文件...');
    const fileBuffer = fs.readFileSync(sourcePath);
    console.log('   文件大小:', (fileBuffer.length / 1024).toFixed(2), 'KB\n');

    // 先删除旧文件
    console.log('🗑️  删除旧文件（如果存在）...');
    const deleteUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${FILE_NAME}`;
    
    const deleteResponse = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    });

    if (deleteResponse.ok) {
      console.log('   ✅ 已删除\n');
    } else {
      console.log('   ℹ️  无需删除\n');
    }

    // 上传新文件
    console.log('⬆️  上传文件...');
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${FILE_NAME}?contentType=text/html`;
    
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
      body: fileBuffer,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('❌ 上传失败:', uploadResponse.status, errorText);
      process.exit(1);
    }

    console.log('   ✅ 上传成功!\n');

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${FILE_NAME}`;

    console.log('='.repeat(80));
    console.log('✅ 部署成功！');
    console.log('='.repeat(80));
    console.log('\n📍 URL:', publicUrl);
    console.log('\n⚠️  重要: Content-Type 修复');
    console.log('   如果页面显示源代码，请按以下步骤修复:\n');
    console.log('   1. 访问 https://app.supabase.com');
    console.log('   2. 进入 Storage → public-pages');
    console.log('   3. 找到 read-later.html，点击右侧 ⋮');
    console.log('   4. 选择 "Update metadata"');
    console.log('   5. Content-Type 设置为: text/html');
    console.log('   6. 保存后刷新页面\n');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ 错误:', error);
    process.exit(1);
  }
}

uploadSimple();
