# Takos API Test UI 開発用スクリプト
Write-Host "Takos API Test Extension UI を開発モードで起動中..." -ForegroundColor Green

# 依存関係のインストールチェック
if (!(Test-Path "node_modules")) {
    Write-Host "依存関係をインストールしています..." -ForegroundColor Yellow
    npm install
}

# 開発サーバーの起動
Write-Host "開発サーバーを起動中..." -ForegroundColor Blue
Write-Host "http://localhost:3001 でアクセスできます" -ForegroundColor Green

npm run dev
