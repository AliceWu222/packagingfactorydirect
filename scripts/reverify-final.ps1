$log = 'C:\Users\Administrator\AccioWork\2026-07-18-05-34-49\reverify-final.txt'
Remove-Item $log -ErrorAction SilentlyContinue
function Get-Html($u) {
  try { return (Invoke-WebRequest -UseBasicParsing $u -TimeoutSec 60 -MaximumRedirection 5).Content } catch { return "ERR: $($_.Exception.Message)" }
}
# 1. Homepage title
$h = Get-Html 'https://www.packagingfactorydirect.com/'
$t = [regex]::Match($h, '<title[^>]*>([^<]*)</title>')
Add-Content -Encoding UTF8 $log "[1] 首页 title = $($t.Groups[1].Value.Trim())"
Add-Content -Encoding UTF8 $log "[1] 首页 h1 数量 = $(([regex]::Matches($h, '<h1[ >]')).Count)"
Add-Content -Encoding UTF8 $log "[1] 首页 FSC 徽章 = $($h -match 'C144065')"
Add-Content -Encoding UTF8 $log "[1] 首页证书链接 = $($h -match 'certifications.html')"
# 2. robots
$rb = Get-Html 'https://www.packagingfactorydirect.com/robots.txt'
Add-Content -Encoding UTF8 $log "[2] robots sitemap 声明数 = $(([regex]::Matches($rb, 'Sitemap:')).Count)"
Add-Content -Encoding UTF8 $log "[2] robots AI 爬虫放行(GPTBot/ClaudeBot/PerplexityBot/Google-Extended) = $($rb -match 'GPTBot' -and $rb -match 'ClaudeBot' -and $rb -match 'PerplexityBot' -and $rb -match 'Google-Extended')"
# 3. public sitemap deleted -> /sitemap.xml should redirect to index
$sm = Get-Html 'https://www.packagingfactorydirect.com/sitemap.xml'
Add-Content -Encoding UTF8 $log "[3] /sitemap.xml 可达(重定向后) = $($sm -match 'sitemapindex|sitemap')"
$si = Get-Html 'https://www.packagingfactorydirect.com/sitemap-index.xml'
Add-Content -Encoding UTF8 $log "[3] sitemap-index.xml 正常 = $($si -match 'sitemapindex')"
# 4. contact form
$c = Get-Html 'https://www.packagingfactorydirect.com/contact.html'
Add-Content -Encoding UTF8 $log "[4] contact formsubmit = $($c -match 'formsubmit.co')"
Add-Content -Encoding UTF8 $log "[4] contact Submit RFQ = $($c -match 'Submit RFQ')"
# 5. thank-you
$th = Get-Html 'https://www.packagingfactorydirect.com/thank-you.html'
Add-Content -Encoding UTF8 $log "[5] thank-you.html = $($th -match 'Thank You')"
# 6. certifications
$cer = Get-Html 'https://www.packagingfactorydirect.com/certifications.html'
Add-Content -Encoding UTF8 $log "[6] 认证页 FSC C144065 = $($cer -match 'C144065')"
Add-Content -Encoding UTF8 $log "[6] 认证页 FDA XNO250418226BX2-1 = $($cer -match 'XNO250418226BX2-1')"
# 7. guide
$g = Get-Html 'https://www.packagingfactorydirect.com/blog/custom-packaging-buyers-guide-2026-china-factory-direct.html'
Add-Content -Encoding UTF8 $log "[7] 行业指南 200 = $($g -match 'Buyer.s Guide 2026')"
# 8. IndexNow key file
$k = Get-Html 'https://www.packagingfactorydirect.com/9f3c7a2e51b84d60a8c4e1d9f2b7a5c3.txt'
Add-Content -Encoding UTF8 $log "[8] IndexNow key 文件 = $($k -match '9f3c7a2e51b84d60a8c4e1d9f2b7a5c3')"
# 9. llms.txt
$ll = Get-Html 'https://www.packagingfactorydirect.com/llms.txt'
Add-Content -Encoding UTF8 $log "[9] llms.txt = $($ll -match 'Packaging Factory Direct')"
# 10. ai-index blogGuides count
$ai = Get-Html 'https://www.packagingfactorydirect.com/ai-index.json'
$guideRef = $ai -match 'custom-packaging-buyers-guide-2026-china-factory-direct'
Add-Content -Encoding UTF8 $log "[10] ai-index.json 含新指南 = $guideRef"
Get-Content $log
