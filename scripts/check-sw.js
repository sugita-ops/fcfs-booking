#!/usr/bin/env node

/**
 * Service Worker 検証スクリプト
 *
 * このスクリプトは本番環境でService Workerとキャッシュの状態を確認します。
 *
 * 使い方:
 *   npm run check-sw
 *
 * 確認項目:
 *   - Service Workerファイル (public/sw.js) の存在
 *   - manifest.json の存在
 *   - Service Worker設定の確認 (next.config.mjs)
 *   - キャッシュ対象ファイルの存在確認
 */

const fs = require('fs');
const path = require('path');

// プロジェクトルート
const rootDir = path.join(__dirname, '..');

// ANSIカラーコード
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// ログヘルパー
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkmark() {
  return `${colors.green}✓${colors.reset}`;
}

function crossmark() {
  return `${colors.red}✗${colors.reset}`;
}

function warning() {
  return `${colors.yellow}⚠${colors.reset}`;
}

// ファイル存在チェック
function checkFileExists(filePath, description) {
  const fullPath = path.join(rootDir, filePath);
  const exists = fs.existsSync(fullPath);

  if (exists) {
    const stats = fs.statSync(fullPath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    log(`  ${checkmark()} ${description}: ${filePath} (${sizeKB} KB)`, 'green');
    return true;
  } else {
    log(`  ${crossmark()} ${description}: ${filePath} が見つかりません`, 'red');
    return false;
  }
}

// Service Worker設定の確認
function checkServiceWorkerConfig() {
  const configPath = path.join(rootDir, 'next.config.mjs');

  if (!fs.existsSync(configPath)) {
    log(`  ${crossmark()} next.config.mjs が見つかりません`, 'red');
    return false;
  }

  const config = fs.readFileSync(configPath, 'utf8');

  // Serwist設定の確認
  const hasSerwist = config.includes('@serwist/next');
  const hasSwSrc = config.includes("swSrc: 'src/app/sw.ts'");
  const hasSwDest = config.includes("swDest: 'public/sw.js'");
  const hasDisableDev = config.includes("disable: process.env.NODE_ENV === 'development'");

  if (hasSerwist) {
    log(`  ${checkmark()} Serwist設定が検出されました`, 'green');
  } else {
    log(`  ${crossmark()} Serwist設定が見つかりません`, 'red');
    return false;
  }

  if (hasSwSrc && hasSwDest) {
    log(`  ${checkmark()} Service Workerのソース/出力設定OK`, 'green');
  } else {
    log(`  ${warning()} Service Workerの設定に不足があるかもしれません`, 'yellow');
  }

  if (hasDisableDev) {
    log(`  ${checkmark()} 開発環境でのService Worker無効化設定OK`, 'green');
  } else {
    log(`  ${warning()} 開発環境での無効化設定が見つかりません`, 'yellow');
  }

  return true;
}

// Service Workerソースファイルの確認
function checkServiceWorkerSource() {
  const swPath = path.join(rootDir, 'src/app/sw.ts');

  if (!fs.existsSync(swPath)) {
    log(`  ${crossmark()} Service Workerソースファイルが見つかりません: src/app/sw.ts`, 'red');
    return false;
  }

  const swContent = fs.readFileSync(swPath, 'utf8');

  // キャッシュ戦略の確認
  const strategies = {
    CacheFirst: swContent.includes("handler: 'CacheFirst'"),
    NetworkFirst: swContent.includes("handler: 'NetworkFirst'"),
    StaleWhileRevalidate: swContent.includes("handler: 'StaleWhileRevalidate'"),
  };

  log(`  ${checkmark()} Service Workerソースファイル: src/app/sw.ts`, 'green');

  let strategyCount = 0;
  Object.entries(strategies).forEach(([name, exists]) => {
    if (exists) {
      log(`    - ${name} 戦略が設定されています`, 'cyan');
      strategyCount++;
    }
  });

  if (strategyCount >= 3) {
    log(`  ${checkmark()} 3種類以上のキャッシュ戦略が設定されています`, 'green');
  } else {
    log(`  ${warning()} キャッシュ戦略が ${strategyCount} 種類のみです（推奨: 3種類以上）`, 'yellow');
  }

  // オフラインフォールバックの確認
  const hasOfflineFallback = swContent.includes("'/offline'") || swContent.includes('"/offline"');
  if (hasOfflineFallback) {
    log(`  ${checkmark()} オフラインページへのフォールバック設定あり`, 'green');
  } else {
    log(`  ${warning()} オフラインページへのフォールバック設定が見つかりません`, 'yellow');
  }

  return true;
}

// キャッシュ対象ファイルの確認
function checkCacheTargets() {
  const targets = [
    { path: 'public/manifest.json', description: 'PWA Manifest' },
    { path: 'public/icons', description: 'アイコンディレクトリ' },
    { path: 'src/app/offline/page.tsx', description: 'オフラインページ' },
  ];

  let allExists = true;

  targets.forEach(({ path: filePath, description }) => {
    const exists = checkFileExists(filePath, description);
    if (!exists) allExists = false;
  });

  // アイコンファイルの詳細確認
  const iconsDir = path.join(rootDir, 'public/icons');
  if (fs.existsSync(iconsDir)) {
    const iconFiles = fs.readdirSync(iconsDir).filter(f => f.endsWith('.png'));
    if (iconFiles.length > 0) {
      log(`    ${iconFiles.length} 個のアイコンファイルが見つかりました`, 'cyan');
      iconFiles.forEach(file => {
        log(`      - ${file}`, 'cyan');
      });
    }
  }

  return allExists;
}

// package.jsonの依存関係確認
function checkDependencies() {
  const packagePath = path.join(rootDir, 'package.json');

  if (!fs.existsSync(packagePath)) {
    log(`  ${crossmark()} package.json が見つかりません`, 'red');
    return false;
  }

  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

  const requiredDeps = {
    '@serwist/next': 'Serwist Next.js統合',
    'serwist': 'Serwist本体',
  };

  let allInstalled = true;

  Object.entries(requiredDeps).forEach(([pkg, description]) => {
    if (deps[pkg]) {
      log(`  ${checkmark()} ${description}: ${pkg}@${deps[pkg]}`, 'green');
    } else {
      log(`  ${crossmark()} ${description} (${pkg}) がインストールされていません`, 'red');
      allInstalled = false;
    }
  });

  return allInstalled;
}

// ビルドチェック
function checkBuild() {
  const swPath = path.join(rootDir, 'public/sw.js');

  if (fs.existsSync(swPath)) {
    const stats = fs.statSync(swPath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    log(`  ${checkmark()} ビルド済みService Worker: public/sw.js (${sizeKB} KB)`, 'green');
    return true;
  } else {
    log(`  ${warning()} public/sw.js が見つかりません`, 'yellow');
    log(`    本番ビルドを実行してください: npm run build`, 'yellow');
    return false;
  }
}

// メイン実行
function main() {
  log('\n==============================================', 'cyan');
  log('  Service Worker 検証スクリプト', 'cyan');
  log('==============================================\n', 'cyan');

  let allPassed = true;

  // 1. 依存関係チェック
  log('📦 1. 依存関係チェック', 'blue');
  if (!checkDependencies()) allPassed = false;
  console.log('');

  // 2. 設定ファイルチェック
  log('⚙️  2. Service Worker設定チェック', 'blue');
  if (!checkServiceWorkerConfig()) allPassed = false;
  console.log('');

  // 3. ソースファイルチェック
  log('📝 3. Service Workerソースファイルチェック', 'blue');
  if (!checkServiceWorkerSource()) allPassed = false;
  console.log('');

  // 4. キャッシュ対象ファイルチェック
  log('📂 4. キャッシュ対象ファイルチェック', 'blue');
  if (!checkCacheTargets()) allPassed = false;
  console.log('');

  // 5. ビルドチェック
  log('🔨 5. ビルド状態チェック', 'blue');
  const isBuilt = checkBuild();
  console.log('');

  // 結果サマリー
  log('==============================================', 'cyan');
  if (allPassed && isBuilt) {
    log('✅ すべてのチェックが完了しました！', 'green');
    log('\n本番環境でテストする場合:', 'cyan');
    log('  1. npm run build', 'cyan');
    log('  2. npm start', 'cyan');
    log('  3. ブラウザのDevToolsでService Workerを確認', 'cyan');
  } else if (allPassed && !isBuilt) {
    log('⚠️  設定は正しいですが、ビルドが必要です', 'yellow');
    log('\n次のステップ:', 'cyan');
    log('  1. npm run build  (Service Workerを生成)', 'cyan');
    log('  2. npm start      (本番モードで起動)', 'cyan');
    log('  3. ブラウザのDevToolsでService Workerを確認', 'cyan');
  } else {
    log('❌ いくつかの問題が見つかりました', 'red');
    log('上記のエラーを修正してください。', 'red');
    process.exit(1);
  }
  log('==============================================\n', 'cyan');
}

// スクリプト実行
main();
