# La Gaonerita - Lanzador
# Inicia backend y frontend (si no estan corriendo) y abre la pagina en el navegador.

$root = $PSScriptRoot

function Test-Port($port) {
    try {
        $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

if (-not (Test-Port 3001)) {
    Write-Host "Iniciando servidor backend (puerto 3001)..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList '-NoExit', '-Command', "`$host.UI.RawUI.WindowTitle = 'La Gaonerita - Backend'; Set-Location -LiteralPath '$root\server'; node index.js" -WindowStyle Minimized
}

if (-not (Test-Port 5173)) {
    Write-Host "Iniciando frontend (puerto 5173)..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList '-NoExit', '-Command', "`$host.UI.RawUI.WindowTitle = 'La Gaonerita - Frontend'; Set-Location -LiteralPath '$root\client'; npx vite --host" -WindowStyle Minimized
}

# Esperar a que el frontend responda (max 20 segundos)
for ($i = 0; $i -lt 40; $i++) {
    if (Test-Port 5173) { break }
    Start-Sleep -Milliseconds 500
}

Start-Process "http://localhost:5173"
