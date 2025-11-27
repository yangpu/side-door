/**
 * 使用 Supabase Management API 上传文件并设置正确的元数据
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

async function uploadWithMetadata() {
  try {
    console.log('🚀 上传并设置正确的 Content-Type...\n');

    const usingServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!usingServiceRole) {
      console.log('⚠️  警告: 未使用 Service Role Key，可能会失败');
      console.log('   建议: export SUPABASE_SERVICE_ROLE_KEY="你的密钥"\n');
    }

    // 读取文件
    const sourcePath = path.join(process.cwd(), SOURCE_FILE);
    if (!fs.existsSync(sourcePath)) {
      console.error('❌ 找不到源文件:', sourcePath);
      process.exit(1);
    }

    console.log('📖 读取文件...');
    const fileContent = fs.readFileSync(sourcePath, 'utf-8');
    const fileSize = Buffer.byteLength(fileContent, 'utf-8');
    console.log('   大小:', (fileSize / 1024).toFixed(2), 'KB\n');

    // 删除旧文件
    console.log('🗑️  删除旧文件...');
    const deleteUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${FILE_NAME}`;
    await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    });
    console.log('   ✅ 完成\n');

    // 上传新文件 - 方法 1: 尝试使用 cacheControl header
    console.log('⬆️  上传文件（方法 1）...');
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${FILE_NAME}`;
    
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY,
        'cache-control': 'max-age=3600',
        'content-type': 'text/html; charset=utf-8',
      },
      body: fileContent,
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      console.error('❌ 上传失败:', error);
      process.exit(1);
    }

    console.log('   ✅ 文件已上传\n');

    // 更新元数据 - 使用 POST update
    console.log('📝 更新文件元数据...');
    const updateUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${FILE_NAME}`;
    
    const updateResponse = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cacheControl: 'max-age=3600',
        contentType: 'text/html; charset=utf-8',
      }),
    });

    if (!updateResponse.ok) {
      console.log('   ⚠️  元数据更新可能失败，但文件已上传');
      console.log('   需要手动设置 Content-Type\n');
    } else {
      console.log('   ✅ 元数据已更新\n');
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${FILE_NAME}`;

    console.log('='.repeat(80));
    console.log('✅ 上传完成！');
    console.log('='.repeat(80));
    console.log('\n📍 URL:', publicUrl);
    console.log('\n🔍 验证步骤:');
    console.log('   1. 在终端运行以下命令检查 Content-Type:');
    console.log(`      curl -I ${publicUrl} | grep content-type`);
    console.log('\n   2. 应该显示: content-type: text/html');
    console.log('\n   3. 如果还是 text/plain，请执行:');
    console.log('      sql/fix-content-type.sql');
    console.log('\n' + '='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ 错误:', error);
    process.exit(1);
  }
}

uploadWithMetadata();
