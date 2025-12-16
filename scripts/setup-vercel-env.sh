#!/bin/bash

# Vercel環境変数設定スクリプト
# 使い方: ./scripts/setup-vercel-env.sh

echo "=========================================="
echo "  Vercel 環境変数設定スクリプト"
echo "=========================================="
echo ""

# VAPID公開鍵
VAPID_PUBLIC_KEY="MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAESyFj2T0l_cLwb6qoPvzAnWjhkHkUn_jtaWq6IZVC4KD16KbTx81niU9VBE48pajKQfqopXrpJe5ZloPZu9jHyg"

# VAPID秘密鍵
VAPID_PRIVATE_KEY="MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgzvR38CjcEkS8TTsLMmlPWYfcRXjj7MGvQsqFYmOq6l2hRANCAARLIWPZPSX9wvBvqqg-_MCdaOGQeRSf-O1parohlULgoPXoptPHzWeJT1UETjylqMpB-qileukl7lmWg9m72MfK"

# ログイン確認
echo "🔐 Vercelログイン状態を確認中..."
if ! vercel whoami &> /dev/null; then
  echo "❌ Vercelにログインしていません。"
  echo ""
  echo "次のコマンドでログインしてください:"
  echo "  vercel login"
  echo ""
  echo "ログイン完了後、再度このスクリプトを実行してください。"
  exit 1
fi

VERCEL_USER=$(vercel whoami)
echo "✅ ログイン中: $VERCEL_USER"
echo ""

# プロジェクト確認
echo "📁 プロジェクトをリンク中..."
if [ ! -f ".vercel/project.json" ]; then
  echo "⚠️  プロジェクトがリンクされていません。"
  echo "次のコマンドでリンクしてください:"
  echo "  vercel link"
  echo ""
  exit 1
fi

echo "✅ プロジェクトリンク済み"
echo ""

# 環境変数設定
echo "🔧 環境変数を設定中..."
echo ""

# NEXT_PUBLIC_VAPID_PUBLIC_KEY
echo "  [1/2] NEXT_PUBLIC_VAPID_PUBLIC_KEY を設定中..."
vercel env add NEXT_PUBLIC_VAPID_PUBLIC_KEY production preview development <<EOF
$VAPID_PUBLIC_KEY
EOF

if [ $? -eq 0 ]; then
  echo "  ✅ NEXT_PUBLIC_VAPID_PUBLIC_KEY 設定完了"
else
  echo "  ⚠️  既に存在するかエラーが発生しました"
fi
echo ""

# VAPID_PRIVATE_KEY
echo "  [2/2] VAPID_PRIVATE_KEY を設定中..."
vercel env add VAPID_PRIVATE_KEY production preview development <<EOF
$VAPID_PRIVATE_KEY
EOF

if [ $? -eq 0 ]; then
  echo "  ✅ VAPID_PRIVATE_KEY 設定完了"
else
  echo "  ⚠️  既に存在するかエラーが発生しました"
fi
echo ""

echo "=========================================="
echo "✅ 環境変数設定が完了しました！"
echo "=========================================="
echo ""
echo "次のステップ:"
echo "  1. vercel --prod でデプロイ"
echo "  または"
echo "  2. GitHub経由で自動デプロイ"
echo ""
