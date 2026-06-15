param(
  [string]$EnvId = "cloud1-d6gdqbdio41425733",
  [string]$DevToolsCli = "D:\微信web开发者工具\cli.bat"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$configPath = Join-Path $projectRoot "utils\cloud-config.js"
$functionName = "carbonApi"

if (-not (Test-Path $DevToolsCli)) {
  throw "WeChat DevTools CLI not found: $DevToolsCli"
}

if (-not $EnvId.Trim()) {
  throw "EnvId cannot be empty"
}

$config = @"
const CLOUD_ENV_ID = '$EnvId'
const CLOUD_FUNCTION_NAME = '$functionName'

module.exports = {
  CLOUD_ENV_ID,
  CLOUD_FUNCTION_NAME
}
"@

Set-Content -LiteralPath $configPath -Value $config -Encoding UTF8

& $DevToolsCli cloud functions deploy `
  --env $EnvId `
  --names $functionName `
  --remote-npm-install `
  --project $projectRoot `
  --lang zh

if ($LASTEXITCODE -ne 0) {
  throw "Cloud function deploy failed with exit code: $LASTEXITCODE"
}

Write-Output "Cloud env written: $configPath"
Write-Output "Cloud function deploy submitted: $functionName"
