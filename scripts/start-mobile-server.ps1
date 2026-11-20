$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Join-Path $PSScriptRoot '..')
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Install Node.js 24 or later, then run this launcher again.' }
if (-not (Test-Path -LiteralPath 'node_modules')) { throw 'Run npm ci in this folder once to install dependencies.' }
if (Test-Path -LiteralPath '.data/ollama/bin/ollama.exe') {
  & (Join-Path $PSScriptRoot 'start-local-ai.ps1')
} else { Write-Host 'Run Setup-Free-AI.cmd once to enable free local food scanning and chat.' }
$serverPort = if ($env:PORT) { $env:PORT } else { '4000' }
if (Test-Path -LiteralPath '.env') {
  $portSetting = Get-Content -LiteralPath '.env' | Where-Object { $_ -match '^PORT=\d+$' } | Select-Object -Last 1
  if ($portSetting) { $serverPort = $portSetting.Substring(5) }
}
Write-Host ''
Write-Host 'FitTrack AI mobile backend' -ForegroundColor Green
Write-Host 'Keep your phone and this computer on the same Wi-Fi.'
Write-Host 'In the phone app, use the address for your Wi-Fi connection:'
[System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces() | Where-Object { $_.OperationalStatus -eq 'Up' } | ForEach-Object {
  $adapterName = $_.Name
  $_.GetIPProperties().UnicastAddresses | Where-Object { $_.Address.AddressFamily -eq 'InterNetwork' -and -not [System.Net.IPAddress]::IsLoopback($_.Address) } | ForEach-Object { Write-Host ('  http://{0}:{1} ({2})' -f $_.Address, $serverPort, $adapterName) -ForegroundColor Cyan }
}
try {
  $health = Invoke-RestMethod -Uri "http://localhost:$serverPort/api/health" -TimeoutSec 3
  if ($health.status -eq 'ok') { Write-Host 'FitTrack server is already running. Keep its existing terminal open.'; exit 0 }
} catch {}
Write-Host 'Starting server. Keep this window open; press Ctrl+C to stop.'
& npm.cmd run dev:server
exit $LASTEXITCODE
