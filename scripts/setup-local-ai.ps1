$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$workspacePath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$runtimePath = Join-Path $workspacePath '.data\ollama'
$binaryPath = Join-Path $runtimePath 'bin'
New-Item -ItemType Directory -Force -Path $runtimePath, $binaryPath | Out-Null
$ollamaExecutable = Join-Path $binaryPath 'ollama.exe'
if (-not (Test-Path -LiteralPath (Join-Path $binaryPath 'fittrack-install-complete'))) {
  $archivePath = Join-Path $runtimePath 'ollama-windows-amd64.zip'
  Write-Output 'Downloading official Ollama v0.40.16 (about 1.6 GB)...'
  & curl.exe --fail --location --retry 3 --silent --show-error 'https://github.com/ollama/ollama/releases/download/v0.40.16/ollama-windows-amd64.zip' --output $archivePath
  if ($LASTEXITCODE -ne 0) { throw 'Ollama download failed.' }
  if ((Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLower() -ne '50fcf5ad54277f2fa5d173ebfc93bcb017adbc0c9ef2314daabc96ca9e6aa64e') { throw 'Ollama checksum did not match the official release.' }
  Write-Output 'Checksum verified. Extracting local runtime...'
  Expand-Archive -LiteralPath $archivePath -DestinationPath $binaryPath -Force
  Set-Content -LiteralPath (Join-Path $binaryPath 'fittrack-install-complete') -Value '0.40.16'
}
& (Join-Path $PSScriptRoot 'start-local-ai.ps1')
Write-Output 'Downloading the free Qwen3-VL 2B vision/instruction model (about 1.9 GB)...'
$pull = Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:11434/api/pull' -ContentType 'application/json' -Body '{"model":"qwen3-vl:2b-instruct","stream":false}' -TimeoutSec 3600
if ($pull.status -ne 'success') { throw 'Model download did not finish. Check .data/ollama/server.err.log.' }
Write-Output 'Local AI model is installed. No API key or paid AI account is needed.'
& $ollamaExecutable list
