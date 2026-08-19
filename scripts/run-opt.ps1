$ErrorActionPreference = 'Stop'
$root = 'C:\Users\Administrator\AccioWork\2026-07-18-05-34-49\packagingfactorydirect_site'
$names = @('hero-1.webp','hero-2.webp','hero-3.webp','hero-4.webp','hero-5.webp','mobile-hero-products-1.webp','mobile-hero-products-2.webp','mobile-hero-products-3.webp','mobile-hero-products-4.webp','mobile-hero-products-5.webp')
$paths = @()
foreach ($n in $names) {
  $p = Join-Path (Join-Path $root 'assets\img\hero') $n
  if (Test-Path $p) { $paths += $p }
}
$output = node "$root\scripts\opt-webp-multi.mjs" $paths 2>&1
foreach ($line in $output) {
  Write-Output $line
  if ($line -match '"tmp":"([^"]+)"') {
    $tmp = $Matches[1]
    $final = $tmp.Substring(0, $tmp.Length - 9)  # strip ".opt.webp"
    Copy-Item -Force $tmp $final
    Remove-Item -Force $tmp
  }
}
