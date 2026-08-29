$uploads = @(
    @{ src = "C:/Users/murat/.gemini/antigravity/brain/c67aa7bf-eaaf-4754-b599-ce25d2ca7c92/.user_uploaded/media_1788012741796.png"; dst = "assets/monsters/medusa.png"; name = "Medusa" },
    @{ src = "C:/Users/murat/.gemini/antigravity/brain/c67aa7bf-eaaf-4754-b599-ce25d2ca7c92/.user_uploaded/media_1788012777088.png"; dst = "assets/monsters/lord_yarkan.png"; name = "LordYarkan" },
    @{ src = "C:/Users/murat/.gemini/antigravity/brain/c67aa7bf-eaaf-4754-b599-ce25d2ca7c92/.user_uploaded/media_1788012836180.png"; dst = "assets/monsters/tiger_girl.png"; name = "TigerGirl" },
    @{ src = "C:/Users/murat/.gemini/antigravity/brain/c67aa7bf-eaaf-4754-b599-ce25d2ca7c92/.user_uploaded/media_1788013018245.png"; dst = "assets/monsters/chackji.png"; name = "Chackji" },
    @{ src = "C:/Users/murat/.gemini/antigravity/brain/c67aa7bf-eaaf-4754-b599-ce25d2ca7c92/.user_uploaded/media_1788013210301.png"; dst = "assets/monsters/siren.png"; name = "Siren" }
)

foreach ($item in $uploads) {
    if (Test-Path $item.src) {
        Copy-Item -Path $item.src -Destination $item.dst -Force
        Write-Host "✅ Copied $($item.name) to $($item.dst)" -ForegroundColor Green
    } else {
        Write-Host "❌ File not found: $($item.src)" -ForegroundColor Red
    }
}
