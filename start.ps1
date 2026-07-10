Write-Host "=== La Gaonerita - Iniciando ===" -ForegroundColor Green

$serverPath = Join-Path $PSScriptRoot "server"
$clientPath = Join-Path $PSScriptRoot "client"

Write-Host "Iniciando servidor backend..." -ForegroundColor Cyan
$serverJob = Start-Job -ScriptBlock { Set-Location -LiteralPath $using:serverPath; node index.js }

Start-Sleep -Seconds 2

Write-Host "Iniciando frontend..." -ForegroundColor Cyan
$clientJob = Start-Job -ScriptBlock { Set-Location -LiteralPath $using:clientPath; npx vite --host }

Write-Host "`n=== La Gaonerita está corriendo ===" -ForegroundColor Green
Write-Host "Frontend:  http://localhost:5173" -ForegroundColor Yellow
Write-Host "Backend:   http://localhost:3001" -ForegroundColor Yellow
Write-Host "Admin:     admin@laganerita.com / admin123" -ForegroundColor Yellow
Write-Host "Cocina:    http://localhost:5173/kitchen" -ForegroundColor Yellow
Write-Host "`nPresiona Ctrl+C para detener" -ForegroundColor Red

try {
    while ($true) { Start-Sleep -Seconds 10 }
} finally {
    Stop-Job $serverJob -ErrorAction SilentlyContinue
    Stop-Job $clientJob -ErrorAction SilentlyContinue
    Remove-Job $serverJob -ErrorAction SilentlyContinue
    Remove-Job $clientJob -ErrorAction SilentlyContinue
}
