$bossSrc = "C:/Users/murat/.gemini/antigravity/brain/c67aa7bf-eaaf-4754-b599-ce25d2ca7c92/.user_uploaded/media_1788011586392.png"
if (Test-Path $bossSrc) {
    Copy-Item $bossSrc "assets/monsters/boss_lord_yarkan.png"
    Write-Host "✅ Copied boss image to assets/monsters/boss_lord_yarkan.png"
} else {
    Write-Host "❌ Boss source not found"
}
