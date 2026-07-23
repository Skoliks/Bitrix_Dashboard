param(
  [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)

$ErrorActionPreference = 'Stop'

$violations = New-Object System.Collections.Generic.List[string]
$artifactRoots = @(
  (Join-Path $Root 'backend/dist'),
  (Join-Path $Root 'dashboard-app/dist')
)

$sensitiveTextRules = @{
  'contains VibeCode token pattern' = 'vibe_(app|api|session)_[A-Za-z0-9._-]+'
  'contains CRM raw identifier field' = '"(ID|CATEGORY_ID|STAGE_ID|ASSIGNED_BY_ID|CONTACT_ID|COMPANY_ID)"\s*:'
  'contains CRM raw title field' = '"(TITLE|NAME|LAST_NAME|SECOND_NAME|FULL_NAME)"\s*:'
  'contains contact email field' = '"(EMAIL|EMAIL_WORK|EMAIL_HOME)"\s*:'
  'contains contact phone field' = '"(PHONE|PHONE_WORK|PHONE_MOBILE|CONTACT_PHONE)"\s*:'
  'contains monetary raw field' = '"(OPPORTUNITY|CURRENCY_ID|SUM|AMOUNT)"\s*:'
  'contains email-like literal' = '[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}'
}

function Get-DisplayPath {
  param([string]$Path)

  $rootPrefix = $Root.TrimEnd('\', '/')
  if ($Path.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    return $Path.Substring($rootPrefix.Length).TrimStart('\', '/')
  }

  return $Path
}

function Add-Violation {
  param([string]$Path, [string]$Rule)
  $violations.Add("$(Get-DisplayPath -Path $Path) $Rule")
}

foreach ($path in $artifactRoots) {
  if (-not (Test-Path -LiteralPath $path)) {
    Add-Violation -Path $path -Rule 'is missing; run production build first'
  }
}

if ($violations.Count -eq 0) {
  $forbiddenDirectoryNames = @(
    '.git',
    'b24-ai-starter',
    'coverage',
    'docs',
    'fixtures',
    'node_modules',
    'qa_reports',
    'templates-dashboard-vue',
    'tests'
  )

  $forbiddenFilePatterns = @(
    '.env',
    '.env.*',
    '*.log',
    '*.test.js',
    '*.spec.js',
    'eslint.config.js',
    'vitest.config.js'
  )

  foreach ($root in $artifactRoots) {
    Get-ChildItem -LiteralPath $root -Recurse -Directory | Where-Object {
      $forbiddenDirectoryNames -contains $_.Name
    } | ForEach-Object {
      Add-Violation -Path $_.FullName -Rule 'must not be included in production artifact'
    }

    foreach ($pattern in $forbiddenFilePatterns) {
      Get-ChildItem -LiteralPath $root -Recurse -File -Filter $pattern | ForEach-Object {
        Add-Violation -Path $_.FullName -Rule 'must not be included in production artifact'
      }
    }

    $textExtensions = @('.css', '.html', '.js', '.json', '.map', '.mjs', '.svg', '.txt')
    Get-ChildItem -LiteralPath $root -Recurse -File | Where-Object {
      $textExtensions -contains $_.Extension.ToLowerInvariant()
    } | ForEach-Object {
      $lineNumber = 0
      foreach ($line in [System.IO.File]::ReadLines($_.FullName)) {
        $lineNumber += 1
        foreach ($rule in $sensitiveTextRules.GetEnumerator()) {
          if ($line -match $rule.Value) {
            $violations.Add("$(Get-DisplayPath -Path $_.FullName):${lineNumber} $($rule.Key)")
          }
        }
      }
    }
  }
}

if ($violations.Count -gt 0) {
  Write-Error ("Artifact check failed:`n" + ($violations -join "`n"))
}

Write-Host 'Artifact check passed.'
