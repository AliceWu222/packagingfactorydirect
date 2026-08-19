$log = 'C:\Users\Administrator\AccioWork\2026-07-18-05-34-49\verify-final.txt'
Remove-Item $log -ErrorAction SilentlyContinue
Start-Sleep -Seconds 5
function Get-Html($u) {
  try { return (Invoke-WebRequest -UseBasicParsing $u -TimeoutSec 60 -MaximumRedirection 5).Content } catch { return '' }
}
# 1. Homepage title
$h = Get-Html 'https://www.packagingfactorydirect.com/'
$t = [regex]::Match($h, '<title[^>]*>([^<]*)</title>')
Add-Content -Encoding UTF8 $log "home_title=[$($t.Groups[1].Value.Trim())]"
Add-Content -Encoding UTF8 $log "home_h1=$(([regex]::Matches($h, '<h1[ >]')).Count)"
Add-Content -Encoding UTF8 $log "home_has_fsc_badge=$($h -match 'C144065')"
# 2. Contact form
$c = Get-Html 'https://www.packagingfactorydirect.com/contact.html'
Add-Content -Encoding UTF8 $log "contact_formsubmit=$($c -match 'formsubmit.co')"
Add-Content -Encoding UTF8 $log "contact_submit_btn=$($c -match 'Submit RFQ')"
# 3. Thank-you page
$th = Get-Html 'https://www.packagingfactorydirect.com/thank-you.html'
Add-Content -Encoding UTF8 $log "thankyou=$($th -match 'Thank You')"
# 4. Guide
$g = Get-Html 'https://www.packagingfactorydirect.com/blog/custom-packaging-buyers-guide-2026-china-factory-direct.html'
Add-Content -Encoding UTF8 $log "guide_ok=$($g -match 'Buyer.s Guide 2026')"
# 5. Certifications
$cer = Get-Html 'https://www.packagingfactorydirect.com/certifications.html'
Add-Content -Encoding UTF8 $log "cert_fsc=$($cer -match 'C144065')"
Add-Content -Encoding UTF8 $log "cert_fda=$($cer -match 'XNO250418226BX2-1')"
# 6. IndexNow key file
$k = Get-Html 'https://www.packagingfactorydirect.com/9f3c7a2e51b84d60a8c4e1d9f2b7a5c3.txt'
Add-Content -Encoding UTF8 $log "indexnow_key=$($k -match '9f3c7a2e51b84d60a8c4e1d9f2b7a5c3')"
# 7. robots sitemap single
$rb = Get-Html 'https://www.packagingfactorydirect.com/robots.txt'
$sm = ([regex]::Matches($rb, 'Sitemap:')).Count
Add-Content -Encoding UTF8 $log "robots_sitemap_decl=$sm"
# 8. sitemap index reachable
$si = Get-Html 'https://www.packagingfactorydirect.com/sitemap-index.xml'
Add-Content -Encoding UTF8 $log "sitemap_index=$($si -match 'sitemapindex')"
# 9. llms.txt
$ll = Get-Html 'https://www.packagingfactorydirect.com/llms.txt'
Add-Content -Encoding UTF8 $log "llms_txt=$($ll -match 'Packaging Factory Direct')"
Get-Content $log
