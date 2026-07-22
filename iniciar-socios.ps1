# La Gaonerita - Lanzador (socios)
# Inicia backend, app de clientes, app de personal y app de socios (si no estan corriendo) y abre la pagina de socios en el navegador.

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
    Write-Host "Iniciando app de clientes (puerto 5173)..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList '-NoExit', '-Command', "`$host.UI.RawUI.WindowTitle = 'La Gaonerita - Clientes'; Set-Location -LiteralPath '$root\client'; npx vite --host" -WindowStyle Minimized
}

if (-not (Test-Port 5174)) {
    Write-Host "Iniciando app de personal (puerto 5174)..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList '-NoExit', '-Command', "`$host.UI.RawUI.WindowTitle = 'La Gaonerita - Personal'; Set-Location -LiteralPath '$root\staff'; npx vite --host" -WindowStyle Minimized
}

if (-not (Test-Port 5175)) {
    Write-Host "Iniciando app de socios (puerto 5175)..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList '-NoExit', '-Command', "`$host.UI.RawUI.WindowTitle = 'La Gaonerita - Socios'; Set-Location -LiteralPath '$root\socios'; npx vite --host" -WindowStyle Minimized
}

# Esperar a que la app de socios responda (max 20 segundos)
for ($i = 0; $i -lt 40; $i++) {
    if (Test-Port 5175) { break }
    Start-Sleep -Milliseconds 500
}

Start-Process "http://localhost:5175/login"
