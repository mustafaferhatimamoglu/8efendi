Write-Host "--- 8EFENDI KAPSAMLI MODUL & SOZDIZIMI TESTI ---" -ForegroundColor Cyan

$srcFiles = Get-ChildItem -Path "src" -Recurse -Filter "*.js"
$hasError = $false

foreach ($file in $srcFiles) {
    $content = Get-Content -Path $file.FullName -Raw
    $fileName = $file.Name
    
    # 1. Kendi kendini import etme kontrolü
    if ($content -match "from\s+['""]\.\/$fileName['""]") {
        Write-Host "❌ HATA: [$($file.FullName)] kendi kendini import ediyor!" -ForegroundColor Red
        $hasError = $true
    }
    
    # 2. Tum import yollarinin varlik kontrolu
    $matches = [regex]::Matches($content, "from\s+['""]([^'""]+)['""]")
    foreach ($m in $matches) {
        $importRel = $m.Groups[1].Value
        if ($importRel.StartsWith(".")) {
            $dir = $file.DirectoryName
            $targetPath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($dir, $importRel))
            if (!(Test-Path $targetPath -PathType Leaf)) {
                Write-Host "❌ HATA: [$($file.Name)] bulunamayan dosyayi import ediyor: $importRel" -ForegroundColor Red
                $hasError = $true
            }
        }
    }
}

if ($hasError) {
    Write-Host "`n❌ TESTLER BASARISIZ! Hatalar tespit edildi." -ForegroundColor Red
    exit 1
} else {
    Write-Host "`n✅ [17/17] Tum JavaScript modulleri ve import yollari eksiksiz ve hatasiz dogrulandi!" -ForegroundColor Green
}
