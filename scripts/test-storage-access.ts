/**
 * 测试 Supabase Storage 访问权限
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://rimhmaeecdcrhuqbisjv.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.VITE_SUPABASE_ANON_KEY || 
                    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpbWhtYWVlY2Rjcmh1cWJpc2p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTgwNDYsImV4cCI6MjA3OTAzNDA0Nn0.rSiGYktT3oESNSGRTY8S2hF_0_aoS6xNzzfh4d71BQY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testStorageAccess() {
  console.log('🔍 测试 Supabase Storage 访问权限...\n');

  // 检测使用的密钥类型
  const usingServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  console.log('🔑 当前使用的密钥类型:', usingServiceRole ? 'Service Role Key ✅' : 'Anon Key ⚠️');
  
  if (!usingServiceRole) {
    console.log('   警告: 使用 Anon Key 可能因 RLS 策略而失败\n');
  } else {
    console.log('   Service Role Key 可以绕过 RLS 策略\n');
  }

  // 测试 1: 列出 buckets
  console.log('测试 1: 列出所有 buckets...');
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.log('❌ 失败:', listError.message);
  } else {
    console.log('✅ 成功! 找到', buckets?.length || 0, '个 buckets');
    if (buckets) {
      buckets.forEach(b => {
        console.log(`   - ${b.name} (${b.public ? 'public' : 'private'})`);
      });
    }
  }
  console.log('');

  // 测试 2: 检查 public-pages bucket
  console.log('测试 2: 检查 public-pages bucket...');
  const bucketExists = buckets?.some(b => b.name === 'public-pages');
  console.log(bucketExists ? '✅ public-pages bucket 存在' : '❌ public-pages bucket 不存在');
  console.log('');

  if (!bucketExists) {
    console.log('⚠️  请先在 Supabase Dashboard 创建 public-pages bucket\n');
    process.exit(1);
  }

  // 测试 3: 列出 bucket 中的文件
  console.log('测试 3: 列出 public-pages 中的文件...');
  const { data: files, error: listFilesError } = await supabase.storage
    .from('public-pages')
    .list();
  
  if (listFilesError) {
    console.log('❌ 失败:', listFilesError.message);
  } else {
    console.log('✅ 成功! 找到', files?.length || 0, '个文件');
    if (files && files.length > 0) {
      files.forEach(f => {
        console.log(`   - ${f.name}`);
      });
    }
  }
  console.log('');

  // 测试 4: 尝试上传一个测试文件
  console.log('测试 4: 尝试上传测试文件...');
  const testContent = 'Test file content';
  const testFileName = 'test.txt';
  
  const { error: uploadError } = await supabase.storage
    .from('public-pages')
    .upload(testFileName, testContent, {
      contentType: 'text/plain',
      upsert: true,
    });
  
  if (uploadError) {
    console.log('❌ 上传失败:', uploadError.message);
    console.log('\n💡 这很可能是 RLS 策略问题！');
    console.log('\n解决方案:');
    console.log('1. 使用 Service Role Key:');
    console.log('   export SUPABASE_SERVICE_ROLE_KEY="你的service_role密钥"');
    console.log('\n2. 或配置 Storage RLS 策略:');
    console.log('   在 Supabase Dashboard → SQL Editor');
    console.log('   执行 sql/setup-storage-upload-policy.sql\n');
  } else {
    console.log('✅ 上传成功!');
    
    // 清理测试文件
    console.log('\n清理: 删除测试文件...');
    const { error: deleteError } = await supabase.storage
      .from('public-pages')
      .remove([testFileName]);
    
    if (deleteError) {
      console.log('⚠️  删除测试文件失败:', deleteError.message);
    } else {
      console.log('✅ 测试文件已删除');
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('测试完成！');
  console.log('='.repeat(70));
}

testStorageAccess().catch(error => {
  console.error('\n❌ 发生错误:', error);
  process.exit(1);
});
