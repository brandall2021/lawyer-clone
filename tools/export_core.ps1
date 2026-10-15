param(
    [string]$CoreFile = 'C:\Users\brandall\Documents\Default Project\lawyer-clone\db-export\pg\core.txt',
    [string]$OutDir   = 'C:\Users\brandall\Documents\Default Project\lawyer-clone\db-export\data',
    [string]$Database = 'LawyerTools50',
    [string]$MetaFile = 'C:\Users\brandall\Documents\Default Project\lawyer-clone\db-export\schema\01_columns_keys.json'
)
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Path $OutDir -Force | Out-Null

# Credenciales: desde variables de entorno o desde tools\creds.local.ps1 (no commiteado).
$credFile = Join-Path $PSScriptRoot 'creds.local.ps1'
if (Test-Path $credFile) { . $credFile }
foreach ($v in @('LT_SERVER','LT_USER','LT_DOMAIN','LT_PASS')) {
    if (-not [Environment]::GetEnvironmentVariable($v)) {
        Write-Error "Falta la variable $v. Definila por entorno o crea tools\creds.local.ps1 (gitignored)."
        exit 3
    }
}

Add-Type -ReferencedAssemblies 'System.Data' -TypeDefinition @"
using System;
using System.Data.SqlClient;
using System.Globalization;
using System.IO;
using System.Text;

public static class LtCsv {
    static readonly CultureInfo Inv = CultureInfo.InvariantCulture;
    public static long Export(SqlConnection cn, string sql, string path) {
        long n = 0;
        using (var cmd = cn.CreateCommand()) {
            cmd.CommandTimeout = 3600;
            cmd.CommandText = sql;
            using (var reader = cmd.ExecuteReader()) {
                using (var sw = new StreamWriter(new FileStream(path, FileMode.Create, FileAccess.Write, FileShare.None, 1<<20), new UTF8Encoding(false), 1<<20)) {
                    int fc = reader.FieldCount;
                    var sb = new StringBuilder(8192);
                    while (reader.Read()) {
                        sb.Length = 0;
                        for (int i=0;i<fc;i++) {
                            if (i>0) sb.Append(',');
                            if (reader.IsDBNull(i)) continue;
                            sb.Append('"');
                            AppendVal(sb, reader.GetValue(i));
                            sb.Append('"');
                        }
                        sw.Write(sb.ToString());
                        sw.Write('\n');
                        n++;
                    }
                }
            }
        }
        return n;
    }
    static void AppendVal(StringBuilder sb, object v) {
        if (v is byte[]) {
            byte[] b = (byte[])v;
            sb.Append("\\x");
            for (int i=0;i<b.Length;i++) sb.Append(b[i].ToString("X2", Inv));
        } else if (v is bool) {
            sb.Append(((bool)v) ? "true" : "false");
        } else if (v is DateTime) {
            sb.Append(((DateTime)v).ToString("yyyy-MM-dd HH:mm:ss.fff", Inv));
        } else if (v is double) {
            sb.Append(((double)v).ToString("R", Inv));
        } else if (v is float) {
            sb.Append(((float)v).ToString("R", Inv));
        } else if (v is decimal) {
            sb.Append(((decimal)v).ToString(Inv));
        } else {
            string s = v.ToString();
            for (int i=0;i<s.Length;i++) { char c = s[i]; if (c=='"') sb.Append("\"\""); else sb.Append(c); }
        }
    }
}
"@

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class NativeCred2 {
  [DllImport("advapi32.dll", SetLastError=true, CharSet=CharSet.Unicode)]
  public static extern bool LogonUser(string user, string domain, string password, int logonType, int logonProvider, out IntPtr token);
  [DllImport("kernel32.dll", SetLastError=true)]
  public static extern bool CloseHandle(IntPtr h);
}
"@

$tok = [IntPtr]::Zero
if (-not [NativeCred2]::LogonUser($env:LT_USER, $env:LT_DOMAIN, $env:LT_PASS, 9, 0, [ref]$tok)) {
    Write-Error ("LogonUser failed: {0}" -f (New-Object System.ComponentModel.Win32Exception([Runtime.InteropServices.Marshal]::GetLastWin32Error())).Message)
    exit 2
}
$id  = New-Object System.Security.Principal.WindowsIdentity($tok)
$ctx = $id.Impersonate()

$utf8 = New-Object System.Text.UTF8Encoding($false)
$logPath = Join-Path $OutDir '_export.log'
$log = New-Object System.IO.StreamWriter($logPath, $false, $utf8)
$log.AutoFlush = $true
function Log([string]$m) {
    $line = ("{0} {1}" -f (Get-Date).ToString('HH:mm:ss'), $m)
    Write-Output $line
    $log.WriteLine($line)
}

try {
    $meta = Get-Content $MetaFile -Raw | ConvertFrom-Json
    $colMap = @{}
    foreach ($c in $meta[0]) {
        if (-not $colMap.ContainsKey($c.tbl)) { $colMap[$c.tbl] = New-Object System.Collections.ArrayList }
        [void]$colMap[$c.tbl].Add($c)
    }

    $tables = @()
    foreach ($ln in (Get-Content $CoreFile)) {
        if ($ln -match '^\s*([A-Za-z0-9_]+)\s+(\d+)\s*$') { $tables += $Matches[1] }
    }
    Log ("tables to export: {0}" -f $tables.Count)

    $cs = "Server=$env:LT_SERVER;Database=$Database;Integrated Security=SSPI;TrustServerCertificate=True;Encrypt=False;Connect Timeout=30;Application Name=lt-export"
    $cn = New-Object System.Data.SqlClient.SqlConnection $cs
    $cn.Open()

    $report = New-Object System.Collections.ArrayList
    foreach ($t in $tables) {
        $path = Join-Path $OutDir "$t.csv"
        if ((Test-Path $path) -and ((Get-Item $path).Length -gt 0)) {
            $lines = [System.IO.File]::ReadAllLines($path).Count
            $expected = 0
            foreach ($ln in (Get-Content $CoreFile)) { if ($ln -match "^\s*$([regex]::Escape($t))\s+(\d+)\s*$") { $expected = [int]$Matches[1] } }
            if ($lines -eq $expected) {
                Log ("  {0,-14} {1,8} rows  (skip, complete)" -f $t, $lines)
                [void]$report.Add([pscustomobject]@{ tbl=$t; rows=$lines })
                continue
            }
            Log ("  {0,-14} {1,8} rows  (incomplete, re-exporting)" -f $t, $lines)
        }
        $swT = [System.Diagnostics.Stopwatch]::StartNew()
        $tcols = $colMap[$t] | Sort-Object ord
        $collist = ($tcols | ForEach-Object { "[" + $_.col + "]" }) -join ','
        $sql = "SELECT $collist FROM [$t] WITH (NOLOCK)"
        $n = [LtCsv]::Export($cn, $sql, $path)
        $swT.Stop()
        Log ("  {0,-14} {1,8} rows  {2,6:n1}s" -f $t, $n, $swT.Elapsed.TotalSeconds)
        [void]$report.Add([pscustomobject]@{ tbl=$t; rows=$n })
    }
    $cn.Close()
    [System.IO.File]::WriteAllText((Join-Path $OutDir '_export_report.json'), ($report | ConvertTo-Json))
    Log "done"
}
finally {
    $ctx.Undo()
    [void][NativeCred2]::CloseHandle($tok)
    if ($log) { $log.Close() }
}
