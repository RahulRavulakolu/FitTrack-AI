$ErrorActionPreference = 'Stop'
$workspacePath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Set-Location -LiteralPath $workspacePath
$toolPaths = Get-Content -LiteralPath '.data/toolchains/paths.json' -Raw | ConvertFrom-Json
$env:JAVA_HOME = $toolPaths.javaHome
$buildToolsPath = Join-Path $toolPaths.sdkRoot 'build-tools/36.0.0'
$apkPath = Join-Path $workspacePath 'releases/FitTrack-AI-Android.apk'
$signature = & (Join-Path $buildToolsPath 'apksigner.bat') verify --verbose --print-certs $apkPath
if ($LASTEXITCODE -ne 0) { throw 'APK signature verification failed.' }
$badging = & (Join-Path $buildToolsPath 'aapt.exe') dump badging $apkPath
if ($LASTEXITCODE -ne 0) { throw 'APK manifest verification failed.' }
if (-not ($badging -match "package: name='com.fittrack.ai'")) { throw 'Unexpected application ID.' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$apk = [System.IO.Compression.ZipFile]::OpenRead($apkPath)
try {
  $asset = $apk.GetEntry('assets/capacitor.config.json')
  if (-not $asset) { throw 'Capacitor configuration missing.' }
  $reader = New-Object System.IO.StreamReader($asset.Open())
  try { $configuration = $reader.ReadToEnd() | ConvertFrom-Json } finally { $reader.Dispose() }
  if ($configuration.server.url) { throw 'APK includes a remote live-reload URL.' }
  $requiredFiles = @('assets/public/index.html', 'assets/capacitor.plugins.json', 'classes.dex')
  foreach ($requiredFile in $requiredFiles) { if (-not $apk.GetEntry($requiredFile)) { throw "Missing APK content: $requiredFile" } }
  $bundledImages = @($apk.Entries | Where-Object { $_.FullName -like 'assets/public/exercises/*' }).Count
  if ($bundledImages -lt 30) { throw 'Exercise image assets are missing.' }
  if ($apk.Entries | Where-Object { $_.FullName -match '(^|/)(\.env|\.data)(/|$)' }) { throw 'Private development content was included.' }
} finally { $apk.Dispose() }
$report = @(
  'FitTrack AI Android package verification'
  'Build type: debug, for direct installation and testing; not a store release.'
  ('APK SHA-256: ' + (Get-FileHash -LiteralPath $apkPath -Algorithm SHA256).Hash.ToLower())
  ('APK bytes: ' + (Get-Item -LiteralPath $apkPath).Length)
  ''
  'SIGNATURE'
) + $signature + @('', 'APPLICATION') + @($badging | Where-Object { $_ -match '^(package:|sdkVersion:|targetSdkVersion:|application-label:|launchable-activity:|native-code:)' }) + @(
  ''
  "Bundled exercise images: $bundledImages"
  'Bundled UI, native plugin configuration and executable DEX: present.'
  'Remote live-reload server URL: absent.'
  'Private .env/.data content: absent.'
  ''
  'Validation limitations: no connected Android device/emulator; iOS not compiled on Windows.'
  'Camera, secure store, share sheet and phone runtime behavior need device validation.'
)
$report | Set-Content -LiteralPath 'releases/BUILD-VERIFICATION.txt'
$report
