$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$workspacePath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$toolchainPath = Join-Path $workspacePath '.data\toolchains'
$sdkPath = Join-Path $workspacePath '.data\android-sdk'
New-Item -ItemType Directory -Force -Path $toolchainPath, $sdkPath | Out-Null
$jdkPath = Join-Path $toolchainPath 'jdk'
if (-not (Test-Path -LiteralPath $jdkPath)) {
  Write-Output 'Downloading Eclipse Temurin JDK 21...'
  $release = Invoke-RestMethod -Uri 'https://api.adoptium.net/v3/assets/latest/21/hotspot?architecture=x64&image_type=jdk&os=windows&vendor=eclipse'
  $jdkPackage = $release[0].binary.package
  $jdkZip = Join-Path $toolchainPath 'jdk.zip'
  Invoke-WebRequest -Uri $jdkPackage.link -OutFile $jdkZip
  if ((Get-FileHash -LiteralPath $jdkZip -Algorithm SHA256).Hash.ToLower() -ne $jdkPackage.checksum.ToLower()) { throw 'JDK checksum mismatch.' }
  Expand-Archive -LiteralPath $jdkZip -DestinationPath $jdkPath -Force
}
$javaPath = (Get-ChildItem -LiteralPath $jdkPath -Directory | Select-Object -First 1).FullName
$env:JAVA_HOME = $javaPath
$env:ANDROID_HOME = $sdkPath
$env:ANDROID_SDK_ROOT = $sdkPath
$env:GRADLE_USER_HOME = Join-Path $workspacePath '.data\gradle'
$cmdlinePath = Join-Path $toolchainPath 'android-commandline'
$sdkManager = Join-Path $cmdlinePath 'cmdline-tools\bin\sdkmanager.bat'
if (-not (Test-Path -LiteralPath $sdkManager)) {
  Write-Output 'Downloading Android command-line tools...'
  $sdkZip = Join-Path $toolchainPath 'android-commandline.zip'
  Invoke-WebRequest -Uri 'https://dl.google.com/android/repository/commandlinetools-win-15859902_latest.zip' -OutFile $sdkZip
  $expectedSdkHash = '90ae805d20434428bffcb699c290860f19bb5f66a67e6b330067e3de801fb04a'
  if ((Get-FileHash -LiteralPath $sdkZip -Algorithm SHA256).Hash.ToLower() -ne $expectedSdkHash) { throw 'Android tools checksum mismatch.' }
  Expand-Archive -LiteralPath $sdkZip -DestinationPath $cmdlinePath -Force
}
Write-Output 'Accepting Android SDK licenses and installing Android API 36 build tools...'
$licenseResponses = ('y' + [Environment]::NewLine) * 20
$licenseResponses | & $sdkManager "--sdk_root=$sdkPath" --licenses
if ($LASTEXITCODE -ne 0) { throw 'Android SDK license step failed.' }
& $sdkManager "--sdk_root=$sdkPath" 'platform-tools' 'platforms;android-36' 'build-tools;36.0.0'
if ($LASTEXITCODE -ne 0) { throw 'Android SDK installation failed.' }
$escapedSdkPath = $sdkPath.Replace('\', '/').Replace(':', '\:')
[System.IO.File]::WriteAllText((Join-Path $workspacePath 'android\local.properties'), "sdk.dir=$escapedSdkPath`n")
@{ javaHome = $javaPath; sdkRoot = $sdkPath } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $toolchainPath 'paths.json')
Write-Output 'Android build tools are ready. Installed only inside this project .data directory.'
