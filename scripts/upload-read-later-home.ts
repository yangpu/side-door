/**
 * 上传稍后阅读主页到 Supabase Storage
 * 
 * 使用方法:
 * 1. 先构建项目: npm run build 或 npm run dev
 * 2. 运行此脚本: npx tsx scripts/upload-read-later-home.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://rimhmaeecdcrhuqbisjv.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpbWhtYWVlY2Rjcmh1cWJpc2p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTgwNDYsImV4cCI6MjA3OTAzNDA0Nn0.rSiGYktT3oESNSGRTY8S2hF_0_aoS6xNzzfh4d71BQY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const BUCKET_NAME = 'public-pages';
const FILE_NAME = 'read-later-home.html';

async function uploadReadLaterHome() {
  try {
    console.log('🚀 开始上传稍后阅读主页...');

    // 1. 检查构建产物是否存在
    const buildPath = path.join(process.cwd(), '.output', 'chrome-mv3', 'read-later-home.html');
    
    if (!fs.existsSync(buildPath)) {
      console.error('❌ 错误: 找不到构建产物');
      console.log('   请先运行: npm run build');
      console.log('   期望路径:', buildPath);
      process.exit(1);
    }

    // 2. 读取文件
    console.log('📖 读取构建产物...');
    const fileBuffer = fs.readFileSync(buildPath);
    console.log('   文件大小:', (fileBuffer.length / 1024).toFixed(2), 'KB');

    // 3. 检查 bucket 是否存在
    console.log('🔍 检查 Storage Bucket...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ 无法列出 buckets:', listError.message);
      process.exit(1);
    }

    const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);
    
    if (!bucketExists) {
      console.log('📦 创建新的 public bucket:', BUCKET_NAME);
      const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['text/html', 'application/javascript', 'text/css'],
      });

      if (createError) {
        console.error('❌ 创建 bucket 失败:', createError.message);
        console.log('   请在 Supabase Dashboard 手动创建名为 "public-pages" 的公开 bucket');
        process.exit(1);
      }
    }

    // 4. 删除旧文件（如果存在）
    console.log('🗑️  检查并删除旧文件...');
    const { error: removeError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([FILE_NAME]);
    
    if (removeError && removeError.message !== 'Object not found') {
      console.warn('⚠️  删除旧文件时出现警告:', removeError.message);
    }

    // 5. 上传新文件
    console.log('⬆️  上传新文件...');
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(FILE_NAME, fileBuffer, {
        contentType: 'text/html',
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('❌ 上传失败:', uploadError.message);
      process.exit(1);
    }

    // 6. 获取公开 URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(FILE_NAME);

    console.log('\n✅ 上传成功!');
    console.log('📍 公开访问地址:', urlData.publicUrl);
    console.log('\n💡 提示: 你现在可以通过上述链接访问稍后阅读主页了！');
    console.log('   如果页面显示异常，请检查:');
    console.log('   1. Supabase Storage 的 CORS 设置');
    console.log('   2. Bucket 的公开访问权限');
    console.log('   3. 相关资源文件是否也需要上传');
  } catch (error) {
    console.error('❌ 发生错误:', error);
    process.exit(1);
  }
}

// 运行上传
uploadReadLaterHome();
