param([switch]$Undo)
$ErrorActionPreference = 'Stop'
$workspacePath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$backupPath = Join-Path $workspacePath '.data\fittrack-firewall-backup.json'
$resultPath = Join-Path $workspacePath '.data\fittrack-firewall-result.txt'
$ruleName = 'FitTrackAI-Phone-4000'
$nodePath = 'C:\Program Files\nodejs\node.exe'
$phoneAddress = '192.168.0.3'
$computerAddress = '192.168.0.6'
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  $arguments = '-NoProfile -ExecutionPolicy Bypass -File "{0}"' -f $PSCommandPath
  if ($Undo) { $arguments += ' -Undo' }
  $process = Start-Process -FilePath 'powershell.exe' -Verb RunAs -WindowStyle Hidden -ArgumentList $arguments -Wait -PassThru
  if ($process.ExitCode -ne 0) { throw 'Administrator action failed or was cancelled. See .data/fittrack-firewall-result.txt if present.' }
  Get-Content -LiteralPath $resultPath
  exit 0
}
New-Item -ItemType Directory -Force -Path (Join-Path $workspacePath '.data') | Out-Null
try {
  if ($Undo) {
    if (Test-Path -LiteralPath $backupPath) {
      $backup = Get-Content -LiteralPath $backupPath -Raw | ConvertFrom-Json
      foreach ($item in $backup) { Set-NetFirewallRule -Name $item.Name -LocalPort @($item.LocalPort) }
    }
    Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue | Remove-NetFirewallRule
    Set-Content -LiteralPath $resultPath -Value 'Removed the FitTrack phone allowance and restored any saved rule settings.'
    exit 0
  }
  $wifi = Get-NetIPAddress -InterfaceAlias 'Wi-Fi' -AddressFamily IPv4
  if ($computerAddress -notin $wifi.IPAddress) { throw 'The Wi-Fi address changed. Recheck the computer and phone addresses before applying this rule.' }
  if (-not (Test-Path -LiteralPath $nodePath)) { throw 'The verified Node.js program was not found.' }
  $changes = @()
  foreach ($rule in @(Get-NetFirewallRule -PolicyStore PersistentStore -Direction Inbound -Action Block -Enabled True)) {
    $application = $rule | Get-NetFirewallApplicationFilter
    if ($application.Program -ine $nodePath) { continue }
    $ports = $rule | Get-NetFirewallPortFilter
    if ($ports.Protocol -notin @('TCP', '6')) { continue }
    if (@($ports.LocalPort).Count -eq 1 -and $ports.LocalPort -in @('Any', '0-65535')) {
      $changes += [pscustomobject]@{ Name = $rule.Name; LocalPort = @($ports.LocalPort) }
    } elseif (@($ports.LocalPort) -contains '0-3999' -and @($ports.LocalPort) -contains '4001-65535') {
      # A previous successful run already excluded the one service port.
    } else { throw 'A custom Node.js block rule needs manual review; no rules were changed.' }
  }
  if ($changes.Count -gt 0) {
    $previous = @()
    if (Test-Path -LiteralPath $backupPath) { $previous = @(Get-Content -LiteralPath $backupPath -Raw | ConvertFrom-Json) }
    @($previous + $changes | Sort-Object Name -Unique) | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $backupPath
  }
  try {
    foreach ($item in $changes) { Set-NetFirewallRule -Name $item.Name -LocalPort '0-3999','4001-65535' }
    if (Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue) {
      Set-NetFirewallRule -Name $ruleName -Enabled True -Direction Inbound -Action Allow -Profile Public -Protocol TCP -LocalPort 4000 -LocalAddress $computerAddress -RemoteAddress $phoneAddress -InterfaceAlias 'Wi-Fi' -Program $nodePath -EdgeTraversalPolicy Block
    } else {
      New-NetFirewallRule -Name $ruleName -DisplayName 'FitTrack AI - this phone only (TCP 4000)' -Description 'Allows 192.168.0.3 to reach the FitTrack development API at 192.168.0.6 on Wi-Fi. Undo with scripts/connect-phone.ps1 -Undo.' -Enabled True -Direction Inbound -Action Allow -Profile Public -Protocol TCP -LocalPort 4000 -LocalAddress $computerAddress -RemoteAddress $phoneAddress -InterfaceAlias 'Wi-Fi' -Program $nodePath -EdgeTraversalPolicy Block | Out-Null
    }
  } catch {
    foreach ($item in $changes) { Set-NetFirewallRule -Name $item.Name -LocalPort @($item.LocalPort) }
    throw
  }
  Set-Content -LiteralPath $resultPath -Value ("Added a phone-specific allowance for 192.168.0.3 to reach FitTrack at 192.168.0.6:4000 on Wi-Fi. Existing block rules adjusted: {0}. Other existing rules are unchanged. Firewall remains enabled." -f $changes.Count)
} catch {
  Set-Content -LiteralPath $resultPath -Value $_.Exception.Message
  exit 1
}
