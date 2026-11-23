<#
.SYNOPSIS
Repeatable phase-gate smoke test for My Flow.

.DESCRIPTION
Checks the API (health + versioned health + migrations), the web shell, and the
Android toolchain. Run from the repository root after starting the services:

    docker compose -f deployments/docker-compose.yml up --build -d
    npm --prefix apps/web run dev
    .\scripts\smoke.ps1

 surfaces are reported as PASS, FAIL, or NOT APPLICABLE. A FAIL is a phase blocker.
#>
param(
  [string]$ApiUrl = 'http://127.0.0.1:8080',
  [string]$WebUrl = 'http://127.0.0.1:5173',
  [int]$TimeoutSeconds = 8,
  [switch]$SkipAndroid
)

$ErrorActionPreference = 'Stop'
$results = [System.Collections.Generic.List[object]]::new()

function Add-Result {
  param([string]$Surface, [string]$Status, [string]$Detail)
  $results.Add([pscustomobject]@{ Surface = $Surface; Status = $Status; Detail = $Detail })
}

function Invoke-Check {
  param([string]$Url)
  try {
    return Invoke-RestMethod -Uri $Url -TimeoutSec $TimeoutSeconds
  } catch {
    return $null
  }
}

function Invoke-ExpectedNotFound {
  param([string]$Url)
  $raw = & curl.exe -sS -i -L --max-time $TimeoutSeconds $Url 2>$null
  $joined = [string]::Join("`n", [string[]]$raw)
  $statusLine = @($raw | Where-Object { $_ -match '^HTTP/\S+\s+\d+' } | Select-Object -Last 1)[0]
  $status = 0
  if ($statusLine -match 'HTTP/\S+\s+(\d+)') {
    $status = [int]$Matches[1]
  }
  return [pscustomobject]@{ Status = $status; Body = $joined }
}

# --- Contracts --------------------------------------------------------------
try {
  $contractOutput = & node (Join-Path $PSScriptRoot 'validate-contracts.mjs') 2>&1
  if ($LASTEXITCODE -eq 0) {
    Add-Result 'Contracts' 'PASS' ([string]$contractOutput).Trim()
  } else {
    Add-Result 'Contracts' 'FAIL' ([string]$contractOutput).Trim()
  }
} catch {
  Add-Result 'Contracts' 'FAIL' "Contract validation could not run: $($_.Exception.Message)"
}

# --- Server -----------------------------------------------------------------
$health = Invoke-Check "$ApiUrl/healthz"
$versioned = Invoke-Check "$ApiUrl/v1/health"
if ($health -and $versioned -and $health.status -eq 'ok' -and $versioned.status -eq 'ok') {
  Add-Result 'Server /healthz + /v1/health' 'PASS' "status=$($health.status) database=$($health.database) version=$($health.version) time=$($health.time)"
} else {
  Add-Result 'Server /healthz + /v1/health' 'FAIL' 'Health endpoints did not both return status=ok'
}

$notFound = Invoke-ExpectedNotFound "$ApiUrl/v1"
if ($notFound.Status -eq 404 -and $notFound.Body -match '"code"\s*:\s*"not_found"') {
  Add-Result 'Server /v1 envelope' 'PASS' "HTTP $($notFound.Status), JSON not_found envelope returned"
} else {
  Add-Result 'Server /v1 envelope' 'FAIL' "Unexpected /v1 response: HTTP $($notFound.Status)"
}

$migrationCheck = $null
try {
  $migrationCheck = docker compose -f deployments/docker-compose.yml exec -T postgres psql -U myflow -d myflow -tAc "SELECT count(*) FROM schema_migrations;" 2>$null
} catch {
  $migrationCheck = $null
}
if ($LASTEXITCODE -eq 0 -and [int]$migrationCheck -ge 1) {
  Add-Result 'Server migrations' 'PASS' "applied_migrations=$($migrationCheck.Trim())"
} else {
  Add-Result 'Server migrations' 'FAIL' 'Migration table unavailable or empty'
}

# --- Web --------------------------------------------------------------------
try {
  $page = Invoke-WebRequest -Uri $WebUrl -TimeoutSec $TimeoutSeconds -UseBasicParsing
  if ($page.StatusCode -eq 200 -and $page.Content -match 'My Flow') {
    Add-Result 'Web shell' 'PASS' "HTTP $($page.StatusCode), title present at $WebUrl"
  } else {
    Add-Result 'Web shell' 'FAIL' "Unexpected response from $WebUrl"
  }
} catch {
  Add-Result 'Web shell' 'FAIL' "Web client unreachable: $($_.Exception.Message)"
}

# --- Android ----------------------------------------------------------------
if ($SkipAndroid) {
  Add-Result 'Android debug build' 'NOT APPLICABLE' 'Skipped by -SkipAndroid'
} elseif (-not $env:ANDROID_HOME -or -not (Test-Path -LiteralPath $env:ANDROID_HOME)) {
  Add-Result 'Android debug build' 'NOT APPLICABLE' 'ANDROID_HOME is not set; no SDK, emulator, or device available'
} else {
  $gradlew = Join-Path $PSScriptRoot '..\apps\android\gradlew.bat'
  $gradleCmd = Get-Command gradle -ErrorAction SilentlyContinue
  if (-not (Test-Path -LiteralPath $gradlew) -and -not $gradleCmd) {
    Add-Result 'Android debug build' 'FAIL' 'ANDROID_HOME is set but neither Gradle wrapper nor gradle command is available'
  } else {
    Push-Location (Join-Path $PSScriptRoot '..\apps\android')
    $prevEap = $ErrorActionPreference
    $hadNativePref = Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue
    $prevNativePref = $PSNativeCommandUseErrorActionPreference
    try {
      $ErrorActionPreference = 'Continue'
      if ($hadNativePref) { $PSNativeCommandUseErrorActionPreference = $false }
      if (Test-Path -LiteralPath $gradlew) {
        $gradleOutput = & .\gradlew.bat :app:installDebug 2>&1
      } else {
        $gradleOutput = & gradle :app:installDebug 2>&1
      }
      $gradleExit = $LASTEXITCODE
    } finally {
      $ErrorActionPreference = $prevEap
      if ($hadNativePref) { $PSNativeCommandUseErrorActionPreference = $prevNativePref }
      Pop-Location
    }
    if ($gradleExit -eq 0) {
      Add-Result 'Android debug build' 'PASS' 'installDebug succeeded; launch and widget check must still be done on device'
    } else {
      $tail = (($gradleOutput | ForEach-Object { [string]$_ }) | Select-Object -Last 5) -join '; '
      Add-Result 'Android debug build' 'FAIL' "Android :app:installDebug failed: $tail"
    }
  }
}

$results | Format-Table -AutoSize

$failures = @($results | Where-Object Status -eq 'FAIL')
if ($failures.Count -gt 0) {
  Write-Error "Phase gate blocked: $($failures.Count) surface(s) failed."
  exit 1
}
Write-Host 'Phase gate smoke checks passed. Browser interaction and cold-start offline checks remain manual.' -ForegroundColor Green
