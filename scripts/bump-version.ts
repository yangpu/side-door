/**
 * 自动递增 package.json 版本号
 * 每次 build 时自动将 patch 版本号 +1
 * 例如: 0.26.0 -> 0.26.1
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const packagePath = resolve(process.cwd(), 'package.json');

try {
  // 读取 package.json
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
  const currentVersion = packageJson.version;
  
  // 解析版本号
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
  // 递增 patch 版本
  const newVersion = `${major}.${minor}.${patch + 1}`;
  
  // 更新 package.json
  packageJson.version = newVersion;
  writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
  
  console.log(`✅ 版本号已更新: ${currentVersion} -> ${newVersion}`);
} catch (error) {
  console.error('❌ 版本号更新失败:', error);
  process.exit(1);
}
