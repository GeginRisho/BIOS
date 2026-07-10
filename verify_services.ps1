# BIOS Microservices Health Checker
# Queries every localhost service endpoint to confirm successful bootstrap.

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

Write-Host "==========================================" -ForegroundColor Green
Write-Host "VERIFYING BIOS SERVICES HEALTH..." -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

$AllHealthy = $true

foreach ($Svc in $Services) {
    $Name = $Svc.Name
    $Port = $Svc.Port
    $Url = "http://127.0.0.1:$Port/health"
    
    try {
        $Response = Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec 10
        Write-Host "[ONLINE] $Name (Port $Port) -> Status: Healthy" -ForegroundColor Green
    }
    catch {
        Write-Host "[OFFLINE] $Name (Port $Port) -> Failed to reach. (Checked: $Url)" -ForegroundColor Red
        $AllHealthy = $false
        
        # Output end of error log if available
        $ErrFile = ".\logs\$Name.err"
        if (Test-Path $ErrFile) {
            Write-Host "--- Last 5 lines of $Name.err ---" -ForegroundColor DarkRed
            Get-Content -Path $ErrFile -Tail 5 | Write-Host -ForegroundColor DarkRed
            Write-Host "---------------------------------" -ForegroundColor DarkRed
        }
    }
}

Write-Host "==========================================" -ForegroundColor Green
if ($AllHealthy) {
    Write-Host "SUCCESS: All 11 microservices are healthy!" -ForegroundColor Green
} else {
    Write-Host "WARNING: Some microservices are offline." -ForegroundColor Yellow
}
Write-Host "==========================================" -ForegroundColor Green
