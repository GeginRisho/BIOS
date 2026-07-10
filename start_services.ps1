# BIOS Backend Services Bootstrapper
# Boots all 11 FastAPI microservices on their designated localhost ports.

$ErrorActionPreference = "Stop"

# Ensure logs directory exists
$LogDir = Join-Path $PSScriptRoot "logs"
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
}

Write-Host "==========================================" -ForegroundColor Green
Write-Host "BOOTING BIOS ENTERPRISE MICROSERVICES..." -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

$Services = @(
    @{ Name = "auth_service"; Port = 8001 }
    @{ Name = "business_service"; Port = 8002 }
    @{ Name = "kg_service"; Port = 8003 }
    @{ Name = "twin_service"; Port = 8004 }
    @{ Name = "crawler_service"; Port = 8005 }
    @{ Name = "prediction_service"; Port = 8007 }
    @{ Name = "simulation_service"; Port = 8008 }
    @{ Name = "agent_service"; Port = 8009 }
    @{ Name = "search_service"; Port = 8010 }
    @{ Name = "notification_service"; Port = 8011 }
    @{ Name = "report_service"; Port = 8012 }
)

foreach ($Svc in $Services) {
    $Name = $Svc.Name
    $Port = $Svc.Port
    
    # Compute absolute paths relative to script root
    $LogOut = Join-Path $LogDir "$Name.log"
    $LogErr = Join-Path $LogDir "$Name.err"
    $PyPath = Join-Path $PSScriptRoot "venv\Scripts\python.exe"
    
    Write-Host "Starting $Name on port $Port..." -ForegroundColor Cyan
    
    Start-Process -FilePath $PyPath `
                  -ArgumentList "-m uvicorn backend.services.$Name.main:app --port $Port --host 127.0.0.1" `
                  -WorkingDirectory $PSScriptRoot `
                  -RedirectStandardOutput $LogOut `
                  -RedirectStandardError $LogErr `
                  -NoNewWindow
}

Write-Host "------------------------------------------" -ForegroundColor Green
Write-Host "All 11 microservices successfully launched." -ForegroundColor Green
Write-Host "Logs are stored in: $LogDir" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
