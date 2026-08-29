Add-Type -AssemblyName System.Drawing

$srcPath = "assets/maps/silkroad_map.jpg"
if (!(Test-Path $srcPath)) {
    Write-Host "Source image not found: $srcPath"
    exit 1
}

$srcImg = [System.Drawing.Bitmap]::FromFile($srcPath)
New-Item -ItemType Directory -Force -Path "assets/monsters" | Out-Null

function Crop-Monster($name, $x, $y, $w, $h) {
    # Ensure within bounds
    if ($x + $w -gt $srcImg.Width) { $w = $srcImg.Width - $x }
    if ($y + $h -gt $srcImg.Height) { $h = $srcImg.Height - $y }
    
    $rect = New-Object System.Drawing.Rectangle($x, $y, $w, $h)
    $cropped = $srcImg.Clone($rect, $srcImg.PixelFormat)
    $outPath = "assets/monsters/$name.png"
    $cropped.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $cropped.Dispose()
    Write-Host "✅ Saved $outPath ($w x $h at $x,$y)"
}

# Accurate coordinates of the framed monster portraits in the 804x604 image:
# 1. Mangyang (Lv 1)
Crop-Monster "mangyang" 557 425 58 66

# 2. Big-eyed Ghost (Lv 3)
Crop-Monster "big_eyed_ghost" 512 513 58 66

# 3. Small-eyed Ghost (Lv 2)
Crop-Monster "small_eyed_ghost" 630 513 58 66

# 4. Weasel (Lv 5) & Old Weasel (Lv 4)
Crop-Monster "weasel" 665 322 58 66
Crop-Monster "old_weasel" 728 322 58 66

# 5. Water Ghost (Lv 7) & Water Ghost slave (Lv 6)
Crop-Monster "water_ghost" 490 35 58 66
Crop-Monster "water_ghost_slave" 570 35 58 66

# 6. Stone Ghost (Lv 9) & Broken Stone Ghost (Lv 8)
Crop-Monster "stone_ghost" 650 16 58 66
Crop-Monster "broken_stone_ghost" 728 16 58 66

# 7. Tomb Stone (Lv 9) & Tomb Stone Ghost (Lv 8)
Crop-Monster "tomb_stone" 642 438 58 66
Crop-Monster "tomb_stone_ghost" 715 438 58 66

# 8. Yeoha (Lv 10) & Decayed Yeoha (Lv 10)
Crop-Monster "yeoha" 340 100 58 66
Crop-Monster "decayed_yeoha" 415 100 58 66

# 9. Tiger (Lv 14) & Young Tiger (Lv 13)
Crop-Monster "tiger" 205 280 58 66
Crop-Monster "young_tiger" 270 280 58 66

# 10. White Tiger (Lv 18) & Black Tiger (Lv 17)
Crop-Monster "white_tiger" 63 415 58 66
Crop-Monster "black_tiger" 133 415 58 66

# 11. Bandit (Lv 16) & Bandit Archer (Lv 12) (Center-Bottom)
Crop-Monster "bandit" 230 515 58 66
Crop-Monster "bandit_archer" 295 515 58 66

# 12. Bandit Subordinate (Lv 11) & Bandit Bowman (Lv 15)
Crop-Monster "bandit_subordinate" 370 485 58 66
Crop-Monster "bandit_bowman" 105 440 58 66

$srcImg.Dispose()
Write-Host "🎉 All monster images successfully extracted!"
