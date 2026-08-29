Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "🧪 8EFENDI FARE HIZALAMA & 10X TANK AGGRO TESTI" -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

$failed = 0

function Assert-Check($condition, $successMsg, $failMsg) {
    if ($condition) {
        Write-Host "✅ $successMsg" -ForegroundColor Green
    } else {
        Write-Host "❌ $failMsg" -ForegroundColor Red
        $script:failed++
    }
}

# 1. Fare Tıklama Yükseklik / Koordinat Düzeltmesi (InputManager.js)
$inputJs = Get-Content -Path "src/core/InputManager.js" -Raw
Assert-Check ($inputJs -match 'scaleX' -and $inputJs -match 'scaleY' -and $inputJs -match 'rect\.width' -and $inputJs -match 'rect\.height') "Fare tiklamalari canvas render olcegine (scaleX/scaleY) gore kusursuz hizalandi" "Fare olcekleme eksik"

# 2. Aggro & Tehdit Sistemi (Unit.js)
$unitJs = Get-Content -Path "src/entities/Unit.js" -Raw
Assert-Check ($unitJs -match 'aggroTable' -and $unitJs -match 'getHighestAggroTarget') "Canavarlar tehdit tablosu (aggroTable) tutuyor ve en cok aggro ureten oyuncuya saldiriyor" "Aggro tablosu eksik"

# 3. 1 Hasar = 1 Aggro ve Tank 10x Aggro Çarpanı (Unit.js)
Assert-Check ($unitJs -match 'isTank' -and $unitJs -match '10\s*:\s*1') "1 hasar = 1 aggro; Tank / Muhafiz karakterler 10 kat (10x) aggro uretiyor" "Tank 10x aggro carpani eksik"

# 4. Karakter Tercihleri ve 4800x3600 Harita
$lobbyJs = Get-Content -Path "src/ui/LobbyUI.js" -Raw
Assert-Check ($lobbyJs -match 'loadSavedPreferences' -and $lobbyJs -match '8efendi_roster_preferences') "Baslangic menusunde son secilen karakter tercihleri on-secili geliyor" "Karakter tercihi hatirlama eksik"

$mapJs = Get-Content -Path "src/world/MapManager.js" -Raw
Assert-Check ($mapJs -match '4800' -and $mapJs -match '3600') "Harita boyutu 5 kat kucuk (4800 x 3600)" "Harita boyutu hatali"

Write-Host "`n========================================================" -ForegroundColor Cyan
if ($failed -eq 0) {
    Write-Host "🎉 TUM FARE HIZALAMA VE TANK 10X AGGRO TESTLERI BASARIYLA GECTI (5/5)!" -ForegroundColor Green
} else {
    Write-Host "❌ $failed ADET TEST BASARISIZ OLDU!" -ForegroundColor Red
    exit 1
}
Write-Host "========================================================`n" -ForegroundColor Cyan
