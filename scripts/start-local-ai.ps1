$ErrorActionPreference = 'Stop'
$workspacePath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$runtimePath = Join-Path $workspacePath '.data\ollama'
$ollamaExecutable = Join-Path $runtimePath 'bin\ollama.exe'
if (-not (Test-Path -LiteralPath $ollamaExecutable)) { throw 'Run scripts/setup-local-ai.ps1 once to install the free local model.' }
$env:OLLAMA_HOST = '127.0.0.1:11434'
$env:OLLAMA_MODELS = Join-Path $runtimePath 'models'
$env:OLLAMA_NO_CLOUD = '1'
$env:OLLAMA_NUM_PARALLEL = '1'
$env:OLLAMA_MAX_LOADED_MODELS = '1'
$env:OLLAMA_CONTEXT_LENGTH = '4096'
try {
  $version = Invoke-RestMethod 'http://127.0.0.1:11434/api/version' -TimeoutSec 2
  Write-Output 'Local Ollama is already running.'
  return
} catch {}
$process = Start-Process -FilePath $ollamaExecutable -ArgumentList 'serve' -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtimePath 'server.out.log') -RedirectStandardError (Join-Path $runtimePath 'server.err.log')
Set-Content -LiteralPath (Join-Path $runtimePath 'server.pid') -Value $process.Id
for ($attempt = 0; $attempt -lt 30; $attempt++) {
  Start-Sleep -Milliseconds 500
  try { $null = Invoke-RestMethod 'http://127.0.0.1:11434/api/version' -TimeoutSec 2; Write-Output 'Free local AI is running on this computer (cloud features disabled).'; return } catch {}
}
throw 'Local Ollama did not start. Check .data/ollama/server.err.log.'
