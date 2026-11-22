$root = Split-Path -Parent $PSScriptRoot
$server = Join-Path $root 'server'

if (-not (Get-Command go -ErrorAction SilentlyContinue)) {
  Write-Error 'Go is not installed. See docs/setup.md.'
  exit 1
}

Write-Host 'Starting API at http://127.0.0.1:8080 (DATABASE_URL is optional for local-only mode)' -ForegroundColor Cyan
Push-Location $server
try {
  if (-not (Test-Path (Join-Path $server 'go.sum'))) {
    go mod tidy
  }
  go run ./cmd/api
} finally {
  Pop-Location
}
