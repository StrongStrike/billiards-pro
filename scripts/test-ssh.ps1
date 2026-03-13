param(
  [string]$ConfigPath = "ssh-access.local.json",
  [string]$RemoteCommand = "echo CONNECTED && whoami && hostname && pwd && uname -a",
  [switch]$VerboseMode
)

$ErrorActionPreference = "Stop"

$config = Get-Content -Raw -Path $ConfigPath | ConvertFrom-Json
$hostValue = [string]$config.ssh.host

if ($hostValue -match '^(?<user>[^@]+)@(?<host>.+)$') {
  $sshUser = $Matches.user
  $sshHost = $Matches.host
} else {
  $sshUser = [string]$config.ssh.username
  $sshHost = $hostValue
}

if ([string]::IsNullOrWhiteSpace($sshUser) -or [string]::IsNullOrWhiteSpace($sshHost)) {
  throw "ssh.username yoki ssh.host to'ldirilmagan"
}

$tempDir = Join-Path $env:TEMP ("billiards-ssh-" + [guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $tempDir | Out-Null

try {
  $encryptedKeyPath = Join-Path $tempDir "id_rsa_encrypted"
  $plainKeyPath = Join-Path $tempDir "id_rsa"
  $sshArgs = @()

  if ($VerboseMode) {
    Write-Output "step=write-key"
  }
  [System.IO.File]::WriteAllText($encryptedKeyPath, [string]$config.ssh.privateKey)
  if ($VerboseMode) {
    Write-Output "step=decrypt-key"
  }
  ssh-keygen -p -P ([string]$config.ssh.passphrase) -N "" -f $encryptedKeyPath | Out-Null
  Move-Item -Path $encryptedKeyPath -Destination $plainKeyPath

  if ($VerboseMode) {
    Write-Output "step=ssh user=$sshUser host=$sshHost port=$([int]$config.ssh.port)"
    $sshArgs += "-v"
  }
  $sshArgs += @(
    "-o", "StrictHostKeyChecking=no",
    "-o", "UserKnownHostsFile=/dev/null",
    "-o", "ConnectTimeout=15",
    "-p", ([int]$config.ssh.port),
    "-i", $plainKeyPath,
    "$sshUser@$sshHost",
    $RemoteCommand
  )
  & ssh @sshArgs

  exit $LASTEXITCODE
} finally {
  if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
  }
}
