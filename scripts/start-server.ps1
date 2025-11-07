Param(
    [int]$Port = 4000,
    [switch]$NoFirewallRule,
    [switch]$Background,
    [string]$NodePath = "node"
)

$ErrorActionPreference = 'Stop'

function Write-Info($msg) { Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "[ERROR] $msg" -ForegroundColor Red }

# Resolve script root
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptRoot '..')
Set-Location $RepoRoot

# Ensure logs directory exists
if (-not (Test-Path -Path "logs")) { New-Item -ItemType Directory -Path "logs" | Out-Null }

# Check Node availability
try {
    $nodeVersion = & $NodePath -v 2>$null
    if (-not $nodeVersion) { throw "Node not found" }
    Write-Info "Using Node version $nodeVersion"
} catch {
    Write-Err "Node.js not found. Install from https://nodejs.org/ or ensure path is correct (pass -NodePath)."
    exit 1
}

# Install dependencies (none declared, but run npm install to prepare future deps)
if (Test-Path -Path "package.json") {
    Write-Info "Preparing dependencies (none declared). Skipping npm install if npm unavailable.";
    $npmPath = Join-Path "${ScriptRoot}" '..' | Join-Path -ChildPath '' # ensure variable exists
    if (Get-Command npm -ErrorAction SilentlyContinue) {
        npm install | Out-Null
    } else {
        Write-Warn "npm command not found in current session PATH. Ensure PATH refreshed or manually run 'npm install' later if dependencies are added."
    }
}

# Add firewall rule if needed
if (-not $NoFirewallRule) {
    $ruleName = "Wumpy MUD $Port"
    $existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
    if (-not $existing) {
        Write-Info "Adding inbound firewall rule for TCP port $Port";
        New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow | Out-Null
    } else {
        Write-Info "Firewall rule already exists: $ruleName"
    }
}

# Launch server
$serverScript = "src/server.js"
if (-not (Test-Path -Path $serverScript)) {
    Write-Err "Cannot find $serverScript. Aborting."; exit 1
}

if ($Background) {
    $outLog = "logs/server.out.log"
    $errLog = "logs/server.err.log"
    Write-Info "Starting server in background on port $Port (logs: $outLog, $errLog)"
    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = $NodePath
    $startInfo.Arguments = $serverScript
    $startInfo.WorkingDirectory = $RepoRoot
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $startInfo.UseShellExecute = $false
    $startInfo.EnvironmentVariables["PORT"] = "$Port"
    $process = [System.Diagnostics.Process]::Start($startInfo)
    $process.BeginOutputReadLine()
    $process.BeginErrorReadLine()
    Write-Info "PID: $($process.Id)"
    Write-Info "Press Ctrl+C to end monitoring; process stays running."
} else {
    Write-Info "Starting foreground server on port $Port"
    $env:PORT = "$Port"
    & $NodePath $serverScript
}
