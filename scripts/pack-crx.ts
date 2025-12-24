/**
 * CRX 打包脚本
 * 
 * 将构建好的扩展打包为 CRX2 格式
 * 
 * 使用方法:
 *   npx tsx scripts/pack-crx.ts
 * 
 * 输出:
 *   .output/side-door-{version}.crx
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, relative, dirname } from 'path';
import { createSign, generateKeyPairSync, createPrivateKey, createPublicKey } from 'crypto';

const ROOT_DIR = join(dirname(new URL(import.meta.url).pathname), '..');
const OUTPUT_DIR = join(ROOT_DIR, '.output');
const CHROME_MV3_DIR = join(OUTPUT_DIR, 'chrome-mv3');
const KEY_FILE = join(ROOT_DIR, 'extension.pem');

// 读取 manifest 获取版本号
function getVersion(): string {
  const manifestPath = join(CHROME_MV3_DIR, 'manifest.json');
  if (!existsSync(manifestPath)) {
    throw new Error('manifest.json 不存在，请先运行 npm run build');
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  return manifest.version;
}

// 生成或读取私钥
function getOrCreatePrivateKey(): Buffer {
  if (existsSync(KEY_FILE)) {
    console.log('📂 使用现有私钥:', KEY_FILE);
    return readFileSync(KEY_FILE);
  }
  
  console.log('🔑 生成新的私钥...');
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  
  writeFileSync(KEY_FILE, privateKey);
  console.log('✅ 私钥已保存到:', KEY_FILE);
  console.log('⚠️  请妥善保管此私钥，用于后续更新扩展');
  
  return Buffer.from(privateKey);
}

// 递归获取目录中的所有文件
function getAllFiles(dir: string, baseDir: string = dir): string[] {
  const files: string[] = [];
  const entries = readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...getAllFiles(fullPath, baseDir));
    } else {
      files.push(relative(baseDir, fullPath));
    }
  }
  
  return files.sort();
}

// CRC32 计算
let crc32Table: number[] | null = null;
function getCrc32Table(): number[] {
  if (crc32Table) return crc32Table;
  
  crc32Table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crc32Table[i] = c >>> 0;
  }
  return crc32Table;
}

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  const table = getCrc32Table();
  
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xff];
  }
  
  return (crc ^ 0xffffffff) >>> 0;
}

// 创建 ZIP 文件内容
function createZipBuffer(sourceDir: string): Buffer {
  const files = getAllFiles(sourceDir);
  const chunks: Buffer[] = [];
  const centralDirectory: Buffer[] = [];
  let offset = 0;
  
  for (const file of files) {
    const filePath = join(sourceDir, file);
    const content = readFileSync(filePath);
    const fileName = Buffer.from(file.replace(/\\/g, '/'));
    
    // Local file header
    const localHeader = Buffer.alloc(30 + fileName.length);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    
    const fileCrc = crc32(content);
    localHeader.writeUInt32LE(fileCrc, 14);
    localHeader.writeUInt32LE(content.length, 18);
    localHeader.writeUInt32LE(content.length, 22);
    localHeader.writeUInt16LE(fileName.length, 26);
    localHeader.writeUInt16LE(0, 28);
    fileName.copy(localHeader, 30);
    
    // Central directory header
    const centralHeader = Buffer.alloc(46 + fileName.length);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(fileCrc, 16);
    centralHeader.writeUInt32LE(content.length, 20);
    centralHeader.writeUInt32LE(content.length, 24);
    centralHeader.writeUInt16LE(fileName.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    fileName.copy(centralHeader, 46);
    
    chunks.push(localHeader, content);
    centralDirectory.push(centralHeader);
    offset += localHeader.length + content.length;
  }
  
  const centralDirStart = offset;
  const centralDirSize = centralDirectory.reduce((sum, buf) => sum + buf.length, 0);
  
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(files.length, 8);
  endRecord.writeUInt16LE(files.length, 10);
  endRecord.writeUInt32LE(centralDirSize, 12);
  endRecord.writeUInt32LE(centralDirStart, 16);
  endRecord.writeUInt16LE(0, 20);
  
  return Buffer.concat([...chunks, ...centralDirectory, endRecord]);
}

// 创建 CRX2 文件
function createCrx2(zipBuffer: Buffer, privateKeyPem: Buffer): Buffer {
  // 解析私钥并获取公钥
  const privateKey = createPrivateKey(privateKeyPem);
  const publicKey = createPublicKey(privateKey);
  const publicKeyDer = publicKey.export({ type: 'spki', format: 'der' }) as Buffer;
  
  // 创建签名 (对 ZIP 内容签名)
  const sign = createSign('RSA-SHA1');
  sign.update(zipBuffer);
  const signature = sign.sign(privateKey);
  
  // CRX2 格式:
  // - Magic number: "Cr24" (4 bytes)
  // - Version: 2 (4 bytes, little-endian)
  // - Public key length (4 bytes, little-endian)
  // - Signature length (4 bytes, little-endian)
  // - Public key
  // - Signature
  // - ZIP archive
  
  const crxMagic = Buffer.from('Cr24');
  const crxVersion = Buffer.alloc(4);
  crxVersion.writeUInt32LE(2, 0);
  
  const publicKeyLength = Buffer.alloc(4);
  publicKeyLength.writeUInt32LE(publicKeyDer.length, 0);
  
  const signatureLength = Buffer.alloc(4);
  signatureLength.writeUInt32LE(signature.length, 0);
  
  return Buffer.concat([
    crxMagic,
    crxVersion,
    publicKeyLength,
    signatureLength,
    publicKeyDer,
    signature,
    zipBuffer,
  ]);
}

// 主函数
async function main() {
  console.log('');
  console.log('='.repeat(60));
  console.log('📦 SideDoor CRX 打包工具');
  console.log('='.repeat(60));
  console.log('');
  
  // 检查构建目录
  if (!existsSync(CHROME_MV3_DIR)) {
    console.error('❌ 错误: 构建目录不存在');
    console.error('   请先运行: npm run build');
    process.exit(1);
  }
  
  const version = getVersion();
  console.log(`📋 版本: ${version}`);
  console.log(`📂 源目录: ${CHROME_MV3_DIR}`);
  
  // 获取私钥
  const privateKey = getOrCreatePrivateKey();
  
  // 创建 ZIP
  console.log('');
  console.log('📦 创建 ZIP 包...');
  const zipBuffer = createZipBuffer(CHROME_MV3_DIR);
  console.log(`   ZIP 大小: ${(zipBuffer.length / 1024 / 1024).toFixed(2)} MB`);
  
  // 保存 ZIP 文件
  const zipPath = join(OUTPUT_DIR, `side-door-${version}.zip`);
  writeFileSync(zipPath, zipBuffer);
  console.log(`✅ ZIP 已保存: ${zipPath}`);
  
  // 创建 CRX
  console.log('');
  console.log('🔐 创建 CRX 包...');
  const crxBuffer = createCrx2(zipBuffer, privateKey);
  console.log(`   CRX 大小: ${(crxBuffer.length / 1024 / 1024).toFixed(2)} MB`);
  
  // 保存 CRX 文件
  const crxPath = join(OUTPUT_DIR, `side-door-${version}.crx`);
  writeFileSync(crxPath, crxBuffer);
  console.log(`✅ CRX 已保存: ${crxPath}`);
  
  console.log('');
  console.log('='.repeat(60));
  console.log('✅ 打包完成!');
  console.log('');
  console.log('📥 安装方式:');
  console.log('   1. 打开 Chrome 浏览器');
  console.log('   2. 访问 chrome://extensions/');
  console.log('   3. 开启"开发者模式"');
  console.log('   4. 将 CRX 文件拖放到页面中');
  console.log('');
  console.log('   或者通过 web 服务下载:');
  console.log('   npm run serve');
  console.log('   访问 http://localhost:8080');
  console.log('   点击"安装扩展"按钮');
  console.log('='.repeat(60));
  console.log('');
}

main().catch(console.error);
