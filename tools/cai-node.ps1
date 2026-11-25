# Tai Node.js ban portable (khong can cai, khong can quyen admin) tu trang chinh thuc nodejs.org
# vao thu muc node\ canh ChayGame.bat. Co kiem tra ma SHA256 do nodejs.org cong bo.
# ChayGame.bat tu goi file nay khi may chua co Node.js va thu muc node\ bi thieu.
param(
  [string]$Dest = (Join-Path (Split-Path -Parent $PSScriptRoot) 'node'),
  [string]$Line = 'latest-v24.x'
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'   # thanh tien do lam Invoke-WebRequest cham hang chuc lan tren PowerShell 5
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$arch = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64' -or $env:PROCESSOR_ARCHITEW6432 -eq 'ARM64') { 'arm64' } else { 'x64' }
$base = "https://nodejs.org/dist/$Line"
# thu muc tam ten ngan, cung o dia voi thu muc game: ten ngan de khong vuot gioi han 260 ky tu cua Windows
# (thu vien npm ben trong long nhieu tang), cung o dia de doi ten thu muc thay vi chep
$tmp = Join-Path (Split-Path -Parent $Dest) ('_n' + [guid]::NewGuid().ToString('N').Substring(0, 6))
try {
  Write-Host "Dang lay danh sach ban Node.js tu nodejs.org ..."
  $sums = (Invoke-WebRequest "$base/SHASUMS256.txt" -UseBasicParsing).Content
  $m = [regex]::Match($sums, "(?m)^([0-9a-f]{64})\s+(node-v[\d.]+-win-$arch\.zip)\s*$")
  if (-not $m.Success) { throw "Khong tim thay ban Node.js cho Windows $arch" }
  $hash = $m.Groups[1].Value
  $file = $m.Groups[2].Value
  New-Item -ItemType Directory -Path $tmp | Out-Null
  $zip = Join-Path $tmp $file
  Write-Host "Dang tai $file (khoang 30 MB) ..."
  Invoke-WebRequest "$base/$file" -OutFile $zip -UseBasicParsing
  if ((Get-FileHash $zip -Algorithm SHA256).Hash.ToLower() -ne $hash) { throw 'File tai ve bi loi (sai ma SHA256), hay chay lai' }
  Write-Host "Dang giai nen ..."
  Expand-Archive -Path $zip -DestinationPath $tmp -Force
  $inner = Join-Path $tmp ($file -replace '\.zip$', '')
  if (-not (Test-Path (Join-Path $inner 'node.exe'))) { throw 'Giai nen khong thay node.exe' }
  if (Test-Path $Dest) { Remove-Item $Dest -Recurse -Force }
  for ($i = 1; $i -le 5; $i++) { # phan mem diet virus co the dang quet file vua giai nen: doi 1 giay roi thu lai
    try { [IO.Directory]::Move($inner, $Dest); break } catch { if ($i -eq 5) { throw }; Start-Sleep -Seconds 1 }
  }
  Write-Host "Xong: Node.js da nam trong $Dest"
  exit 0
} catch {
  Write-Host ("LOI: " + $_.Exception.Message)
  exit 1
} finally {
  if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue }
}
