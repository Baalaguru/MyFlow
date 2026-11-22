$root = Split-Path -Parent $PSScriptRoot

Write-Host 'Starting My Flow development services' -ForegroundColor Cyan

Start-Process -FilePath 'powershell' -ArgumentList '-NoExit', "-File `"$(Join-Path $root 'scripts\dev-server.ps1')`""
Start-Process -FilePath 'powershell' -ArgumentList '-NoExit', "-File `"$(Join-Path $root 'scripts\dev-web.ps1')`""

Write-Host 'Server: http://127.0.0.1:8080/healthz'
Write-Host 'Web:    http://127.0.0.1:5173'
