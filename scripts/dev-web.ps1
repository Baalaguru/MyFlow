$root = Split-Path -Parent $PSScriptRoot
$web = Join-Path $root 'apps\web'

if (-not (Test-Path (Join-Path $web 'node_modules'))) {
  Write-Host 'Installing web dependencies...' -ForegroundColor Cyan
  Push-Location $web
  npm install --no-audit --no-fund
  Pop-Location
}

Write-Host 'Starting web client at http://127.0.0.1:5173' -ForegroundColor Cyan
Push-Location $web
try {
  npm run dev
} finally {
  Pop-Location
}
