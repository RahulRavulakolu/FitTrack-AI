$ErrorActionPreference = 'Stop'
$workspacePath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Set-Location -LiteralPath $workspacePath
New-Item -ItemType Directory -Force -Path 'releases' | Out-Null
& tar.exe -a -c -f releases/FitTrack-AI-iOS-Project.zip --exclude=android/.gradle --exclude=android/local.properties --exclude='*/build' --exclude='*/DerivedData' --exclude='*/xcuserdata' --exclude='*.keystore' --exclude='*.jks' src server shared public scripts android ios docs package.json package-lock.json capacitor.config.ts tsconfig.json vite.config.ts vitest.config.ts playwright.config.ts index.html tests README.md .env.example .gitignore .prettierrc.json .prettierignore Dockerfile .dockerignore render.yaml Start-FitTrack-Server.cmd Setup-Free-AI.cmd
if ($LASTEXITCODE -ne 0) { throw 'Could not package mobile source.' }
$sourceHash = (Get-FileHash -LiteralPath 'releases/FitTrack-AI-iOS-Project.zip' -Algorithm SHA256).Hash.ToLower()
Set-Content -LiteralPath 'releases/FitTrack-AI-iOS-Project.zip.sha256' -Value "$sourceHash  FitTrack-AI-iOS-Project.zip"
Write-Output 'Mobile source prepared: releases/FitTrack-AI-iOS-Project.zip'
