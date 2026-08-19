$ErrorActionPreference = 'Stop'
$dir = 'C:\Users\Administrator\AccioWork\2026-07-18-05-34-49\packagingfactorydirect_site'
$out = Join-Path $dir 'pfd-v104.out.log'
$err = Join-Path $dir 'pfd-v104.err.log'
$p = Start-Process -FilePath 'npx' -ArgumentList @('next','start','-p','3023') -WorkingDirectory $dir -RedirectStandardOutput $out -RedirectStandardError $err -PassThru -WindowStyle Hidden
Set-Content -Path (Join-Path $dir 'pfd-v104.pid') -Value $p.Id
Start-Sleep -Seconds 6
try { (Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:3023/' -TimeoutSec 30).StatusCode } catch { 'ERR' }
