param(
  [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)

$ErrorActionPreference = 'Stop'

$approvedPatterns = @(
  'MIT',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  '0BSD',
  'CC0-1.0',
  'Unlicense',
  'Python-2.0',
  'MPL-2.0',
  'BlueOak-1.0.0',
  'EPL-2.0'
)

$blockedPatterns = @(
  'AGPL',
  'GPL',
  'LGPL',
  'SSPL',
  'BUSL',
  'Commons Clause'
)

$manualReviewedUnknown = New-Object 'System.Collections.Generic.HashSet[string]'
$exceptionsPath = Join-Path $Root 'docs/09-license-exceptions.json'
if (Test-Path -LiteralPath $exceptionsPath) {
  $exceptions = Get-Content -LiteralPath $exceptionsPath -Raw | ConvertFrom-Json
  foreach ($exception in @($exceptions.manualReviewedUnknown)) {
    if ($exception.package -and $exception.version -and $exception.reason) {
      $manualReviewedUnknown.Add("$($exception.package)@$($exception.version)") | Out-Null
    }
  }
}

$packageFiles = @()
foreach ($workspace in @('backend', 'dashboard-app')) {
  $nodeModules = Join-Path $Root "$workspace/node_modules"
  if (Test-Path -LiteralPath $nodeModules) {
    $packageFiles += Get-ChildItem -LiteralPath $nodeModules -Recurse -Filter package.json -File |
      Where-Object { $_.FullName -notmatch '\\node_modules\\\.bin\\' }
  }
}

if ($packageFiles.Count -eq 0) {
  Write-Error 'License scan failed: node_modules is missing. Run pnpm install first.'
}

$issues = New-Object System.Collections.Generic.List[string]
$seen = New-Object System.Collections.Generic.HashSet[string]

foreach ($file in $packageFiles) {
  try {
    $package = Get-Content -LiteralPath $file.FullName -Raw | ConvertFrom-Json
  } catch {
    continue
  }

  $name = [string]$package.name
  $version = [string]$package.version
  if (-not $name -or -not $version) {
    continue
  }

  $key = "${name}@${version}"
  if (-not $seen.Add($key)) {
    continue
  }

  $license = [string]$package.license
  $licenseText = if ($license) { $license } else { 'UNKNOWN' }

  if ($licenseText -eq 'UNKNOWN' -and $manualReviewedUnknown.Contains($key)) {
    continue
  }

  foreach ($blocked in $blockedPatterns) {
    if ($licenseText -match [regex]::Escape($blocked)) {
      $issues.Add("${key}: blocked license ${licenseText}")
      continue 2
    }
  }

  $isApproved = $false
  foreach ($approved in $approvedPatterns) {
    if ($licenseText -match [regex]::Escape($approved)) {
      $isApproved = $true
      break
    }
  }

  if (-not $isApproved) {
    $issues.Add("${key}: unreviewed license ${licenseText}")
  }
}

if ($issues.Count -gt 0) {
  Write-Error ("License scan failed:`n" + ($issues -join "`n"))
}

Write-Host "License scan passed for $($seen.Count) installed packages."
