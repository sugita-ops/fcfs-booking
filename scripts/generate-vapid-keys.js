#!/usr/bin/env node

/**
 * VAPID鍵生成スクリプト
 *
 * Web Push通知に必要なVAPID (Voluntary Application Server Identification) 鍵ペアを生成します。
 *
 * 使い方:
 *   npm run generate-vapid
 *
 * 出力:
 *   - 公開鍵 (NEXT_PUBLIC_VAPID_PUBLIC_KEY)
 *   - 秘密鍵 (VAPID_PRIVATE_KEY)
 *   - .env.local に追記する内容を表示
 */

const crypto = require('crypto');

// ANSIカラーコード
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * VAPID鍵ペアを生成（Web Crypto互換フォーマット）
 */
function generateVapidKeys() {
  // ECDH P-256カーブで鍵ペア生成（Web Push標準）
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: {
      type: 'spki',
      format: 'der',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'der',
    },
  });

  // DER形式からBase64 URL-safeエンコーディングに変換
  const publicKeyBase64 = urlBase64Encode(publicKey);
  const privateKeyBase64 = urlBase64Encode(privateKey);

  return {
    publicKey: publicKeyBase64,
    privateKey: privateKeyBase64,
  };
}

/**
 * Base64 URL-safeエンコーディング（RFC 4648）
 */
function urlBase64Encode(buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * メイン実行
 */
function main() {
  log('\n==============================================', 'cyan');
  log('  VAPID鍵ペア生成スクリプト', 'cyan');
  log('==============================================\n', 'cyan');

  log('🔑 VAPID鍵ペアを生成中...', 'yellow');

  try {
    const { publicKey, privateKey } = generateVapidKeys();

    log('\n✅ VAPID鍵ペアの生成が完了しました！\n', 'green');

    // 公開鍵表示
    log('📢 公開鍵 (NEXT_PUBLIC_VAPID_PUBLIC_KEY):', 'cyan');
    log(`${publicKey}\n`, 'bold');

    // 秘密鍵表示
    log('🔒 秘密鍵 (VAPID_PRIVATE_KEY):', 'cyan');
    log(`${privateKey}\n`, 'bold');

    // .env.local に追記する内容
    log('==============================================', 'cyan');
    log('📝 .env.local に以下を追記してください:', 'yellow');
    log('==============================================\n', 'cyan');

    console.log('# VAPID Keys for Push Notifications');
    console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKey}`);
    console.log(`VAPID_PRIVATE_KEY=${privateKey}`);

    log('\n==============================================', 'cyan');
    log('⚠️  注意事項:', 'yellow');
    log('==============================================', 'cyan');
    log('1. 秘密鍵は絶対に公開しないでください', 'yellow');
    log('2. .env.local は .gitignore に含まれています', 'yellow');
    log('3. 本番環境では別の鍵ペアを使用してください', 'yellow');
    log('4. 公開鍵はフロントエンドで使用します', 'yellow');
    log('5. 秘密鍵はサーバーサイドで使用します（将来対応）', 'yellow');
    log('==============================================\n', 'cyan');

    log('✅ セットアップ完了！', 'green');
    log('次のステップ: .env.local を作成/更新して、上記の環境変数を追加してください。\n', 'cyan');
  } catch (error) {
    log('\n❌ エラーが発生しました:', 'red');
    console.error(error);
    process.exit(1);
  }
}

// スクリプト実行
main();
