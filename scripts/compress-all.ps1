$ErrorActionPreference = 'Stop'
$root = 'C:\Users\Administrator\AccioWork\2026-07-18-05-34-49\packagingfactorydirect_site'
$paths = @(Get-ChildItem "$root\assets\img" -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.Length -gt 80000 } | ForEach-Object { $_.FullName })
Write-Output "images_to_compress=$($paths.Count)"
$output = node "$root\scripts\opt-webp-multi.mjs" $paths 2>&1
$totalBefore = 0
$totalAfter = 0
foreach ($line in $output) {
  if ($line -match '"before":(\d+),"after":(\d+)') {
    $totalBefore += [int]$Matches[1]
    $totalAfter += [int]$Matches[2]
  }
  if ($line -match '"tmp":"([^"]+)"') {
    $tmp = $Matches[1]
    $final = $tmp.Substring(0, $tmp.Length - 9)
    Copy-Item -Force $tmp $final
    Remove-Item -Force $tmp
  }
}
$savedMB = [math]::Round(($totalBefore - $totalAfter) / 1MB, 2)
$pct = [math]::Round((1 - $totalAfter / $totalBefore) * 100, 1)
Write-Output "TOTAL before=$([math]::Round($totalBefore/1MB,2))MB after=$([math]::Round($totalAfter/1MB,2))MB saved=${savedMB}MB (${pct}%)"
