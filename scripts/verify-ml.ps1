$log = 'C:\Users\Administrator\AccioWork\2026-07-18-05-34-49\verify-ml.txt'
Remove-Item $log -ErrorAction SilentlyContinue
Start-Sleep -Seconds 6
function Get-Html($u) {
  try { return (Invoke-WebRequest -UseBasicParsing $u -TimeoutSec 60 -MaximumRedirection 5).Content } catch { return 'ERR' }
}
# 1. Lang homepages
foreach ($l in @('de','fr','es','ja','ar')) {
  $h = Get-Html "https://www.packagingfactorydirect.com/$l/"
  $lang = [regex]::Match($h, '<html[^>]*lang="([^"]+)"').Groups[1].Value
  $dir = [regex]::Match($h, '<html[^>]*dir="([^"]+)"').Groups[1].Value
  $ok = $h -notmatch '^ERR' -and $h -match '<h1'
  Add-Content -Encoding UTF8 $log "$l/ : ok=$ok lang=$lang dir=$dir len=$($h.Length)"
}
# 2. Lang product page
$p = Get-Html 'https://www.packagingfactorydirect.com/de/products/custom-paper-bags.html'
Add-Content -Encoding UTF8 $log "de/product ok=$($p -notmatch '^ERR' -and $p -match '<h1') len=$($p.Length)"
# 3. Hubs
foreach ($hub in @('materials','finishes','factory','samples')) {
  $h = Get-Html "https://www.packagingfactorydirect.com/$hub.html"
  Add-Content -Encoding UTF8 $log "$hub.html ok=$($h -notmatch '^ERR' -and $h -match '<h1')"
}
# 4. hreflang on English home
$en = Get-Html 'https://www.packagingfactorydirect.com/'
$hf = ([regex]::Matches($en, 'hrefLang="[^"]+"')).Count
Add-Content -Encoding UTF8 $log "en home hreflang tags=$hf"
$enP = Get-Html 'https://www.packagingfactorydirect.com/products/custom-paper-bags.html'
$hf2 = ([regex]::Matches($enP, 'hrefLang="[^"]+"')).Count
Add-Content -Encoding UTF8 $log "en product hreflang tags=$hf2"
# 5. sitemap contains lang
$sm = Get-Html 'https://www.packagingfactorydirect.com/sitemap-pages.xml'
Add-Content -Encoding UTF8 $log "sitemap has de=$($sm -match '/de/') fr=$($sm -match '/fr/') es=$($sm -match '/es/') ja=$($sm -match '/ja/') ar=$($sm -match '/ar/')"
Get-Content $log
