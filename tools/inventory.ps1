$s = 'C:\Users\brandall\Documents\Default Project\lawyer-clone\db-export\schema'
$cols = (Get-Content "$s\01_columns_keys.json" -Raw | ConvertFrom-Json)[0]
$ov   = Get-Content "$s\00_overview.json" -Raw | ConvertFrom-Json
$code = Get-Content "$s\02_code.json" -Raw | ConvertFrom-Json

$ovMap = @{}
foreach ($r in $ov[0]) { $ovMap[$r.tbl] = $r }

$colCount = @{}
foreach ($c in $cols) { if ($colCount.ContainsKey($c.tbl)) { $colCount[$c.tbl]++ } else { $colCount[$c.tbl] = 1 } }

$tbls = ($cols.tbl | Sort-Object -Unique)
$lines = New-Object System.Collections.ArrayList
[void]$lines.Add("TABLES ($($tbls.Count))")
[void]$lines.Add(("{0,-28} {1,5} {2,10} {3,9}" -f 'table', 'cols', 'rows', 'MB'))
[void]$lines.Add(('-' * 56))
foreach ($t in $tbls) {
    $rows = if ($ovMap[$t]) { $ovMap[$t].nrows } else { 0 }
    $mb   = if ($ovMap[$t]) { $ovMap[$t].size_mb } else { 0 }
    [void]$lines.Add(("{0,-28} {1,5} {2,10} {3,9}" -f $t, $colCount[$t], $rows, $mb))
}
[void]$lines.Add('')
[void]$lines.Add("MODULES ($($code.Count))")
$typeName = @{ 'V'='VIEW'; 'P'='PROC'; 'TR'='TRIGGER'; 'FN'='FUNC'; 'IF'='FUNC'; 'TF'='FUNC' }
foreach ($grp in ($code | Group-Object otype | Sort-Object Name)) {
    $label = if ($typeName[$grp.Name]) { $typeName[$grp.Name] } else { $grp.Name }
    [void]$lines.Add("-- $label ($($grp.Count)) --")
    foreach ($m in ($grp.Group | Sort-Object oname)) { [void]$lines.Add("   " + $m.oname) }
}
$out = 'C:\Users\brandall\Documents\Default Project\lawyer-clone\db-export\schema\inventory.txt'
[System.IO.File]::WriteAllLines($out, $lines)
Write-Output "wrote $out : $($lines.Count) lines"
