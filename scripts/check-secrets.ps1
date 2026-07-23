param(
  [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)

$ErrorActionPreference = 'Stop'

$violations = New-Object System.Collections.Generic.List[string]

function Get-DisplayPath {
  param([string]$Path)

  $rootPrefix = $Root.TrimEnd('\', '/')
  if ($Path.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    return $Path.Substring($rootPrefix.Length).TrimStart('\', '/')
  }

  return $Path
}

function Add-Violation {
  param([string]$Path, [int]$Line, [string]$Rule)
  $relative = Get-DisplayPath -Path $Path
  $violations.Add("${relative}:${Line} ${Rule}")
}

function Test-TextFiles {
  param(
    [string[]]$Paths,
    [hashtable]$Rules,
    [switch]$Required
  )

  foreach ($path in $Paths) {
    if (-not (Test-Path -LiteralPath $path)) {
      if ($Required) {
        $relative = Get-DisplayPath -Path $path
        $violations.Add("${relative}:0 required scan path is missing; run build before security:scan")
      }
      continue
    }

    $files = Get-ChildItem -LiteralPath $path -Recurse -File |
      Where-Object {
        $_.FullName -notmatch '\\node_modules\\' -and
        $_.FullName -notmatch '\\.git\\' -and
        $_.FullName -notmatch '\\coverage\\'
      }

    foreach ($file in $files) {
      $lineNumber = 0
      foreach ($line in [System.IO.File]::ReadLines($file.FullName)) {
        $lineNumber += 1
        foreach ($rule in $Rules.GetEnumerator()) {
          if ($line -match $rule.Value) {
            Add-Violation -Path $file.FullName -Line $lineNumber -Rule $rule.Key
          }
        }
      }
    }
  }
}

$tokenRules = @{
  'hardcoded VibeCode token pattern' = 'vibe_(app|api|session)_[A-Za-z0-9._-]+'
}

$frontendStorageRules = @{
  'frontend storage access must not persist session data' = '\b(localStorage|sessionStorage)\s*\.'
}

Test-TextFiles -Paths @(
  (Join-Path $Root 'backend/dist/src')
) -Rules $tokenRules -Required

Test-TextFiles -Paths @(
  (Join-Path $Root 'dashboard-app/dist')
) -Rules $tokenRules -Required

Test-TextFiles -Paths @(
  (Join-Path $Root 'dashboard-app/src')
) -Rules $tokenRules

Test-TextFiles -Paths @(
  (Join-Path $Root 'dashboard-app/src')
) -Rules $frontendStorageRules

if ($violations.Count -gt 0) {
  Write-Error ("Secret scan failed:`n" + ($violations -join "`n"))
}

Write-Host 'Secret scan passed.'
