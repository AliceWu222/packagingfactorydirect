$log = 'C:\Users\Administrator\AccioWork\2026-07-18-05-34-49\verify-v105.txt'
Remove-Item $log -ErrorAction SilentlyContinue
$css = (Invoke-WebRequest -UseBasicParsing 'https://www.packagingfactorydirect.com/assets/css/style.css?v=v105').Content
Add-Content -Encoding UTF8 $log "css_size=$($css.Length)"
$pat = 'min-width:761px\)\{\.floating \.floating-chat'
Add-Content -Encoding UTF8 $log "desktop_hide_rule_present=$($css -match [regex]::Escape('.floating-chat') -and $css -match 'display:none')"
$img = (Invoke-WebRequest -UseBasicParsing 'https://www.packagingfactorydirect.com/assets/img/company/04-warehouse-shipping-area.webp').Content
Add-Content -Encoding UTF8 $log "company_img_bytes=$($img.Length)"
Add-Content -Encoding UTF8 $log "img_compressed=$($img.Length -lt 200000)"
$r = Invoke-WebRequest -UseBasicParsing -Method Head 'https://www.packagingfactorydirect.com/assets/img/company/04-warehouse-shipping-area.webp'
Add-Content -Encoding UTF8 $log "img_cache=$($r.Headers['Cache-Control'])"
Get-Content $log
