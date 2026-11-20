$ErrorActionPreference = 'Stop'
$workspacePath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$pathsFile = Join-Path $workspacePath '.data\toolchains\paths.json'
if (Test-Path -LiteralPath $pathsFile) {
  $paths = Get-Content -LiteralPath $pathsFile -Raw | ConvertFrom-Json
  $env:JAVA_HOME = $paths.javaHome
  $env:ANDROID_HOME = $paths.sdkRoot
  $env:ANDROID_SDK_ROOT = $paths.sdkRoot
}
$env:GRADLE_USER_HOME = Join-Path $workspacePath '.data\gradle'
Push-Location $workspacePath
try {
  & npm.cmd run mobile:sync
  if ($LASTEXITCODE -ne 0) { throw 'Mobile asset build failed.' }
} finally { Pop-Location }
Push-Location (Join-Path $workspacePath 'android')
try {
  & .\gradlew.bat assembleDebug --no-daemon
  if ($LASTEXITCODE -ne 0) { throw 'Android build failed.' }
  $outputPath = Join-Path $workspacePath 'releases'
  New-Item -ItemType Directory -Force -Path $outputPath | Out-Null
  Copy-Item -LiteralPath '.\app\build\outputs\apk\debug\app-debug.apk' -Destination (Join-Path $outputPath 'FitTrack-AI-Android.apk') -Force
  $apkHash = (Get-FileHash -LiteralPath (Join-Path $outputPath 'FitTrack-AI-Android.apk') -Algorithm SHA256).Hash.ToLower()
  Set-Content -LiteralPath (Join-Path $outputPath 'FitTrack-AI-Android.apk.sha256') -Value "$apkHash  FitTrack-AI-Android.apk"
  Write-Output 'Android APK created: releases\FitTrack-AI-Android.apk'
} finally { Pop-Location }
