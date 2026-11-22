$ErrorActionPreference = 'SilentlyContinue'

Write-Host 'My Flow toolchain check' -ForegroundColor Cyan
Write-Host ''

$tools = @(
  @{ Name = 'node'; Label = 'Node.js' },
  @{ Name = 'npm'; Label = 'npm' },
  @{ Name = 'go'; Label = 'Go' },
  @{ Name = 'java'; Label = 'JDK' },
  @{ Name = 'gradle'; Label = 'Gradle' },
  @{ Name = 'docker'; Label = 'Docker CLI' },
  @{ Name = 'git'; Label = 'Git' }
)

foreach ($tool in $tools) {
  $command = Get-Command $tool.Name
  if ($command) {
    Write-Host ("  [OK]      {0,-12} {1}" -f $tool.Label, $command.Source)
  } else {
    Write-Host ("  [MISSING] {0,-12}" -f $tool.Label) -ForegroundColor Yellow
  }
}

Write-Host ''
if ($env:ANDROID_HOME) {
  Write-Host "  [OK]      ANDROID_HOME $env:ANDROID_HOME"
} else {
  Write-Host '  [MISSING] ANDROID_HOME is not set' -ForegroundColor Yellow
}

$dockerDaemon = docker version --format '{{.Server.Version}}' 2>$null
if ($LASTEXITCODE -eq 0 -and $dockerDaemon) {
  Write-Host "  [OK]      Docker daemon $dockerDaemon"
} else {
  Write-Host '  [MISSING] Docker daemon is not running' -ForegroundColor Yellow
}
