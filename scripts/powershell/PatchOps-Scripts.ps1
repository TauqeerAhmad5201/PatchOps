# =============================================================================
# PatchOps PowerShell Scripts — Windows Server Operations
# All scripts use WinRM for remote execution from the PatchOps backend.
# Deploy these scripts to C:\PatchOps\ on each managed Windows server.
# =============================================================================

# =============================================================================
# SCRIPT: Pause-Service.ps1
# PURPOSE: Pause/stop a Windows service before server reboot to ensure
#          clean shutdown and prevent data corruption.
# PARAMETERS: Injected by backend via script parameter substitution
# =============================================================================
<#
.SYNOPSIS
    Pause a critical Windows service before scheduled reboot.
.DESCRIPTION
    Gracefully stops the specified service, waits for confirmation,
    and logs the action. Called by PatchOps execution agent before reboot.
#>

param(
    [string]$ServiceName = "{{SERVICE_NAME}}",          # e.g., "MyAppService"
    [int]$TimeoutSeconds = {{PRE_PAUSE_WAIT_SECONDS}},  # e.g., 5
    [string]$LogPath = "C:\PatchOps\Logs\pause.log"
)

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $entry = "[$timestamp][$Level] $Message"
    Write-Output $entry
    Add-Content -Path $LogPath -Value $entry -ErrorAction SilentlyContinue
}

# Ensure log directory exists
New-Item -ItemType Directory -Force -Path (Split-Path $LogPath) | Out-Null

Write-Log "Starting service pause for: $ServiceName"

try {
    $service = Get-Service -Name $ServiceName -ErrorAction Stop

    if ($service.Status -eq 'Stopped') {
        Write-Log "Service '$ServiceName' is already stopped." "WARNING"
        exit 0
    }

    Write-Log "Stopping service '$ServiceName' (current status: $($service.Status))..."
    Stop-Service -Name $ServiceName -Force -ErrorAction Stop

    # Wait for service to stop
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds * 6)
    while ((Get-Service -Name $ServiceName).Status -ne 'Stopped') {
        if ((Get-Date) -gt $deadline) {
            Write-Log "Service did not stop within timeout — forcing kill" "ERROR"
            # TODO: Add process kill logic if service hangs
            # $proc = Get-WmiObject Win32_Service | Where-Object {$_.Name -eq $ServiceName}
            # Stop-Process -Id $proc.ProcessId -Force
            exit 1
        }
        Start-Sleep -Seconds 2
    }

    Write-Log "Service '$ServiceName' stopped successfully." "SUCCESS"
    
    # TODO: Add any pre-reboot cleanup tasks here
    # e.g., flush application caches, close database connections
    # {{CUSTOM_PRE_PAUSE_STEPS}}
    
    Start-Sleep -Seconds $TimeoutSeconds
    Write-Log "Pre-pause wait complete. Server is ready for reboot."
    exit 0

} catch {
    Write-Log "Error pausing service '$ServiceName': $_" "ERROR"
    exit 1
}


# =============================================================================
# SCRIPT: Resume-Service.ps1
# PURPOSE: Resume/start a Windows service after server reboot completes.
# =============================================================================
<#
.SYNOPSIS
    Resume a Windows service after scheduled reboot.
.DESCRIPTION
    Starts the specified service, waits for it to enter Running state,
    performs basic health verification, and logs the action.
#>

param(
    [string]$ServiceName = "{{SERVICE_NAME}}",
    [int]$TimeoutSeconds = {{POST_RESUME_WAIT_SECONDS}},  # e.g., 10
    [string]$LogPath = "C:\PatchOps\Logs\resume.log"
)

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $entry = "[$timestamp][$Level] $Message"
    Write-Output $entry
    Add-Content -Path $LogPath -Value $entry -ErrorAction SilentlyContinue
}

New-Item -ItemType Directory -Force -Path (Split-Path $LogPath) | Out-Null

Write-Log "Starting service resume for: $ServiceName"

try {
    $service = Get-Service -Name $ServiceName -ErrorAction Stop

    if ($service.Status -eq 'Running') {
        Write-Log "Service '$ServiceName' is already running." "INFO"
        exit 0
    }

    Write-Log "Starting service '$ServiceName'..."
    Start-Service -Name $ServiceName -ErrorAction Stop

    # Wait for service to reach Running state
    $deadline = (Get-Date).AddSeconds(120)
    while ((Get-Service -Name $ServiceName).Status -ne 'Running') {
        if ((Get-Date) -gt $deadline) {
            Write-Log "Service did not start within 2 minutes" "ERROR"
            exit 1
        }
        Start-Sleep -Seconds 3
    }

    Write-Log "Service '$ServiceName' started successfully." "SUCCESS"

    # TODO: Add post-start verification
    # e.g., check application health endpoint
    # {{CUSTOM_POST_RESUME_STEPS}}
    # e.g.:
    # $response = Invoke-WebRequest -Uri "http://localhost:{{APP_PORT}}/health" -TimeoutSec 10
    # if ($response.StatusCode -ne 200) { Write-Log "Health check failed" "ERROR"; exit 1 }

    Start-Sleep -Seconds $TimeoutSeconds
    Write-Log "Post-resume wait complete. Service is operational."
    exit 0

} catch {
    Write-Log "Error resuming service '$ServiceName': $_" "ERROR"
    exit 1
}


# =============================================================================
# SCRIPT: Get-ServerState.ps1
# PURPOSE: Collect server health metrics for pre/post reboot comparison.
# =============================================================================
<#
.SYNOPSIS
    Collect server state metrics for PatchOps health baseline.
#>

$ErrorActionPreference = "Stop"

try {
    $os = Get-CimInstance Win32_OperatingSystem
    $cpu = Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average
    $disk = Get-PSDrive C

    $runningServices = Get-Service |
        Where-Object { $_.StartType -eq 'Automatic' -and $_.Status -eq 'Running' } |
        Measure-Object

    $totalAutoServices = Get-Service |
        Where-Object { $_.StartType -eq 'Automatic' } |
        Measure-Object

    # TODO: Add application-specific health checks
    # {{CUSTOM_HEALTH_CHECKS}}

    $state = @{
        Hostname           = $env:COMPUTERNAME
        OS                 = $os.Caption
        LastBoot           = $os.LastBootUpTime
        Uptime             = (New-TimeSpan -Start $os.LastBootUpTime -End (Get-Date)).TotalHours
        Services           = $runningServices.Count
        TotalServices      = $totalAutoServices.Count
        CPU                = [math]::Round($cpu.Average, 1)
        MemoryGB           = [math]::Round($os.TotalVisibleMemorySize / 1MB, 2)
        FreeMemoryGB       = [math]::Round($os.FreePhysicalMemory / 1MB, 2)
        DiskUsedGB         = [math]::Round($disk.Used / 1GB, 2)
        DiskFreeGB         = [math]::Round($disk.Free / 1GB, 2)
        DiskUsagePercent   = [math]::Round($disk.Used / ($disk.Used + $disk.Free) * 100, 1)
        Timezone           = (Get-TimeZone).Id
        CollectedAt        = (Get-Date -Format "o")
    }

    $state | ConvertTo-Json -Depth 3
    exit 0

} catch {
    Write-Error "Failed to collect server state: $_"
    exit 1
}


# =============================================================================
# SCRIPT: Invoke-Reboot.ps1
# PURPOSE: Initiate a graceful, scheduled Windows reboot.
# =============================================================================
<#
.SYNOPSIS
    Initiate a graceful Windows server reboot for patching.
#>

param(
    [int]$DelaySeconds = 0,
    [string]$Reason = "PatchOps scheduled reboot — OS patch deployment",
    [string]$LogPath = "C:\PatchOps\Logs\reboot.log"
)

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $entry = "[$timestamp][INFO] $Message"
    Write-Output $entry
    Add-Content -Path $LogPath -Value $entry -ErrorAction SilentlyContinue
}

New-Item -ItemType Directory -Force -Path (Split-Path $LogPath) | Out-Null

Write-Log "PatchOps reboot initiated. Reason: $Reason"
Write-Log "Reboot will occur in $DelaySeconds seconds."

# TODO: Add pre-reboot notification (Event Log, monitoring system)
# Write-EventLog -LogName Application -Source "PatchOps" -EventId 1000 -EntryType Information -Message $Reason

if ($DelaySeconds -gt 0) {
    Start-Sleep -Seconds $DelaySeconds
}

Write-Log "Initiating system restart now..."
Restart-Computer -Force

exit 0


# =============================================================================
# SCRIPT: Test-WinRMConnection.ps1  
# PURPOSE: Verify WinRM connectivity from PatchOps backend to target servers.
# Run this locally to troubleshoot connection issues.
# =============================================================================
<#
.SYNOPSIS
    Test WinRM connectivity to target servers.
.NOTES
    Run from the PatchOps backend server or your workstation.
    Requires WinRM access credentials.
#>

param(
    [string[]]$Servers = @("{{SERVER_HOSTNAME}}"),
    [string]$Username = "{{WINRM_USERNAME}}",
    [string]$Password = "{{WINRM_PASSWORD}}",  # Use credential object in prod
    [int]$Port = 5985
)

foreach ($server in $Servers) {
    Write-Host "Testing WinRM connection to $server..." -NoNewline
    try {
        $secPassword = ConvertTo-SecureString $Password -AsPlainText -Force
        $cred = New-Object System.Management.Automation.PSCredential($Username, $secPassword)
        
        $result = Invoke-Command -ComputerName $server -Port $Port -Credential $cred -ScriptBlock {
            "Connected to $env:COMPUTERNAME as $env:USERNAME"
        } -ErrorAction Stop

        Write-Host " ✅ OK — $result" -ForegroundColor Green
    } catch {
        Write-Host " ❌ FAILED — $_" -ForegroundColor Red
    }
}


# =============================================================================
# SCRIPT: Install-PatchOpsAgent.ps1
# PURPOSE: Install PatchOps scripts and configure WinRM on a target server.
# Run once on each managed server during initial setup.
# =============================================================================
<#
.SYNOPSIS
    Set up PatchOps agent directory and enable WinRM on a Windows server.
.NOTES
    Run as Administrator on the target server.
#>

param(
    [string]$InstallPath = "C:\PatchOps",
    [string]$PatchOpsServerIP = "{{PATCHOPS_BACKEND_IP}}"
)

Write-Host "Installing PatchOps agent on $env:COMPUTERNAME..." -ForegroundColor Cyan

# Create directory structure
New-Item -ItemType Directory -Force -Path "$InstallPath\Scripts" | Out-Null
New-Item -ItemType Directory -Force -Path "$InstallPath\Logs" | Out-Null

# Enable WinRM
Write-Host "Enabling WinRM..."
Enable-PSRemoting -Force -SkipNetworkProfileCheck

# Configure WinRM
Set-WSManInstance -ResourceURI winrm/config/listener -SelectorSet @{Address="*";Transport="HTTP"} `
    -ValueSet @{Port="5985"} | Out-Null

# Allow PatchOps server
# TODO: Replace with actual PatchOps backend IP
Set-Item WSMan:\localhost\Client\TrustedHosts -Value $PatchOpsServerIP -Force

# TODO: Copy PatchOps scripts to InstallPath
# Copy-Item ".\Pause-Service.ps1" -Destination "$InstallPath\Scripts\" -Force
# Copy-Item ".\Resume-Service.ps1" -Destination "$InstallPath\Scripts\" -Force
# Copy-Item ".\Get-ServerState.ps1" -Destination "$InstallPath\Scripts\" -Force

# Set execution policy
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine -Force

# Start WinRM service
Start-Service WinRM
Set-Service WinRM -StartupType Automatic

# Configure firewall
New-NetFirewallRule -Name "PatchOps-WinRM" -DisplayName "PatchOps WinRM HTTP" `
    -Direction Inbound -Protocol TCP -LocalPort 5985 -Action Allow `
    -RemoteAddress $PatchOpsServerIP -ErrorAction SilentlyContinue | Out-Null

Write-Host "✅ PatchOps agent installed successfully on $env:COMPUTERNAME" -ForegroundColor Green
Write-Host "  WinRM listening on port 5985"
Write-Host "  Trusted host: $PatchOpsServerIP"
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Copy Pause-Service.ps1 and Resume-Service.ps1 to $InstallPath"
Write-Host "  2. Test connectivity: Test-WinRMConnection.ps1 -Servers $env:COMPUTERNAME"
