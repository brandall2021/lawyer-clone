param(
    [string]$CoreFile = 'C:\Users\brandall\Documents\Default Project\lawyer-clone\db-export\pg\core.txt',
    [string]$DataDir  = 'C:\Users\brandall\Documents\Default Project\lawyer-clone\db-export\data',
    [string]$SqlOut   = 'C:\Users\brandall\Documents\Default Project\lawyer-clone\db-export\pg\load_core.sql',
    [string]$Psql     = 'D:\pg\pgsql\bin\psql.exe',
    [string]$Conn     = 'postgresql://postgres:postgres@localhost:5432/lawyer_clone'
)
$ErrorActionPreference = 'Stop'

$tables = @()
foreach ($ln in (Get-Content $CoreFile)) {
    if ($ln -match '^\s*([A-Za-z0-9_]+)\s+(\d+)\s*$') { $tables += $Matches[1] }
}

$lines = New-Object System.Collections.ArrayList
[void]$lines.Add('BEGIN;')
foreach ($t in $tables) {
    $csv = Join-Path $DataDir "$t.csv"
    if (-not (Test-Path $csv)) { Write-Output ("  {0,-14} MISSING csv" -f $t); continue }
    $csvPosix = ($csv -replace '\\','/')
    [void]$lines.Add("TRUNCATE TABLE `"$t`";")
    [void]$lines.Add("\copy `"$t`" FROM '$csvPosix' WITH (FORMAT csv, NULL '')")
}
[void]$lines.Add('COMMIT;')
[void]$lines.Add(@'
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT c.table_name, c.column_name FROM information_schema.columns c WHERE c.is_identity='YES' AND c.table_schema='public' LOOP
    EXECUTE format('SELECT setval(pg_get_serial_sequence(%L,%L), COALESCE((SELECT MAX(%I) FROM %I),1))', format('public.%I', r.table_name), r.column_name, r.column_name, r.table_name);
  END LOOP;
END $$;
'@)
[System.IO.File]::WriteAllLines($SqlOut, $lines)
Write-Output ("wrote {0} ({1} tables)" -f $SqlOut, $tables.Count)

$sw = [System.Diagnostics.Stopwatch]::StartNew()
& $Psql @($Conn, '-v','ON_ERROR_STOP=1','-f', $SqlOut) 2>&1 | Out-String -Width 140
$sw.Stop()
Write-Output ("psql -f done in {0:n1}s" -f $sw.Elapsed.TotalSeconds)
