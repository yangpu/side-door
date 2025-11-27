/**
 * 上传独立的稍后阅读主页到 Supabase Storage
 * 
 * 这个脚本会上传 public/read-later-standalone.html 文件
 * 无需先构建项目，可以直接运行
 * 
 * 使用方法:
 * npx tsx scripts/upload-standalone.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://rimhmaeecdcrhuqbisjv.supabase.co';

// 优先使用 Service Role Key (用于管理操作，绕过 RLS)
// 如果没有设置，则回退到 Anon Key（但可能因 RLS 策略失败）
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.VITE_SUPABASE_ANON_KEY || 
                    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpbWhtYWVlY2Rjcmh1cWJpc2p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTgwNDYsImV4cCI6MjA3OTAzNDA0Nn0.rSiGYktT3oESNSGRTY8S2hF_0_aoS6xNzzfh4d71BQY';

// 检查是否使用了 Service Role Key
const usingServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!usingServiceRole) {
  console.log('⚠️  警告: 未检测到 SUPABASE_SERVICE_ROLE_KEY 环境变量');
  console.log('   使用 Anon Key 可能会因 RLS 策略而上传失败');
  console.log('   建议设置环境变量: SUPABASE_SERVICE_ROLE_KEY=你的service_role密钥\n');
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET_NAME = 'public-pages';
const FILE_NAME = 'read-later.html';
const SOURCE_FILE = 'public/read-later-standalone.html';

async function uploadStandalone() {
  try {
    console.log('🚀 开始上传稍后阅读主页...\n');

    // 1. 检查源文件是否存在
    const sourcePath = path.join(process.cwd(), SOURCE_FILE);
    
    if (!fs.existsSync(sourcePath)) {
      console.error('❌ 错误: 找不到源文件');
      console.log('   期望路径:', sourcePath);
      process.exit(1);
    }

    // 2. 读取文件
    console.log('📖 读取文件...');
    const fileContent = fs.readFileSync(sourcePath, 'utf-8');
    console.log('   文件大小:', (Buffer.byteLength(fileContent, 'utf-8') / 1024).toFixed(2), 'KB');

    // 3. 跳过 bucket 检查，直接尝试上传
    // （因为 listBuckets() 可能受 RLS 限制，而用户已手动创建 bucket）
    console.log('\n✅ 假定 bucket "public-pages" 已存在（已手动创建）');

    // 4. 先删除旧文件（如果存在），确保 metadata 更新
    console.log('\n🗑️  检查并删除旧文件...');
    const { error: removeError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([FILE_NAME]);
    
    if (removeError && !removeError.message.includes('not found')) {
      console.log('   ⚠️  删除旧文件时出现警告:', removeError.message);
    } else if (!removeError) {
      console.log('   ✅ 已删除旧文件');
    } else {
      console.log('   ℹ️  没有旧文件需要删除');
    }

    // 5. 上传新文件（使用正确的 Content-Type）
    console.log('\n⬆️  上传文件到 Supabase Storage...');
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(FILE_NAME, fileContent, {
        contentType: 'text/html; charset=utf-8',
        cacheControl: '3600',
        upsert: false, // 不使用 upsert，因为我们已经手动删除了
      });

    if (uploadError) {
      console.error('❌ 上传失败:', uploadError.message);
      
      // 检查是否是 bucket 不存在的问题
      if (uploadError.message.includes('not found') || uploadError.message.includes('does not exist')) {
        console.log('\n💡 Bucket 不存在，请手动创建:');
        console.log('   1. 访问 https://app.supabase.com');
        console.log('   2. 选择你的项目');
        console.log('   3. 进入 Storage → New bucket');
        console.log('   4. 名称: public-pages');
        console.log('   5. ✅ 勾选 "Public bucket"');
        console.log('   6. 创建后重新运行此命令');
        process.exit(1);
      }
      
      if (uploadError.message.includes('already exists')) {
        console.log('\n💡 文件已存在，尝试删除后重新上传...');
        const { error: removeError } = await supabase.storage
          .from(BUCKET_NAME)
          .remove([FILE_NAME]);
        
        if (removeError) {
          console.error('❌ 删除旧文件失败:', removeError.message);
          process.exit(1);
        }

        // 重新上传
        const { error: retryError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(FILE_NAME, fileContent, {
            contentType: 'text/html; charset=utf-8',
            cacheControl: '3600',
          });

        if (retryError) {
          console.error('❌ 重新上传失败:', retryError.message);
          process.exit(1);
        }
      } else {
        console.log('\n💡 RLS 策略阻止了上传，有两种解决方案:');
        console.log('\n方案 1: 使用 Service Role Key (推荐)');
        console.log('   1. 访问 Supabase Dashboard → Settings → API');
        console.log('   2. 复制 "service_role" 密钥（⚠️ 保密！）');
        console.log('   3. 设置环境变量:');
        console.log('      export SUPABASE_SERVICE_ROLE_KEY="你的service_role密钥"');
        console.log('   4. 重新运行: npm run upload:standalone');
        console.log('\n方案 2: 配置 Storage RLS 策略');
        console.log('   1. 访问 Supabase Dashboard → SQL Editor');
        console.log('   2. 执行文件: sql/setup-storage-upload-policy.sql');
        console.log('   3. 重新运行: npm run upload:standalone');
        console.log('\n详细说明: 查看 sql/setup-storage-upload-policy.sql 文件');
        process.exit(1);
      }
    }

    console.log('   ✅ 上传成功');

    // 6. 获取公开 URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(FILE_NAME);

    console.log('\n' + '='.repeat(80));
    console.log('✅ 部署成功！');
    console.log('='.repeat(80));
    console.log('\n📍 稍后阅读主页 URL:');
    console.log('   ' + urlData.publicUrl);
    console.log('\n💡 使用提示:');
    console.log('   • 将此链接添加到浏览器书签，随时访问你的稍后阅读列表');
    console.log('   • 可以在任何设备上通过此链接访问');
    console.log('   • 支持暗色/浅色主题切换');
    console.log('   • 每次修改源文件后，重新运行此脚本更新');
    console.log('\n🔍 验证部署:');
    console.log('   1. 在浏览器中打开上面的 URL');
    console.log('   2. 应该看到渲染后的网页（而不是 HTML 源代码）');
    console.log('   3. 如果看到源代码，说明 Content-Type 未生效');
    console.log('      → 请在 Supabase Dashboard 手动删除文件后重新运行');
    console.log('\n⚙️  如果页面显示异常，请检查:');
    console.log('   1. Supabase 项目是否正常运行');
    console.log('   2. Storage bucket 是否设置为 public');
    console.log('   3. 文件中的 SUPABASE_URL 和 SUPABASE_ANON_KEY 是否正确');
    console.log('   4. 浏览器开发者工具 → Network → 检查 Content-Type 响应头');
    console.log('\n' + '='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ 发生错误:', error);
    process.exit(1);
  }
}

// 运行上传
uploadStandalone();
