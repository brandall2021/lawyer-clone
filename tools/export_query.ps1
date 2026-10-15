param(
    [Parameter(Mandatory=$true)][string]$SqlFile,
    [Parameter(Mandatory=$true)][string]$OutFile,
    [string]$Database = 'LawyerTools50'
)
$ErrorActionPreference = 'Stop'

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

public static class LtCsv2 {
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
            sb.Append("\\x");
            byte[] b = (byte[])v;
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
public class NativeCred3 {
  [DllImport("advapi32.dll", SetLastError=true, CharSet=CharSet.Unicode)]
  public static extern bool LogonUser(string user, string domain, string password, int logonType, int logonProvider, out IntPtr token);
  [DllImport("kernel32.dll", SetLastError=true)]
  public static extern bool CloseHandle(IntPtr h);
}
"@

$tok = [IntPtr]::Zero
if (-not [NativeCred3]::LogonUser($env:LT_USER, $env:LT_DOMAIN, $env:LT_PASS, 9, 0, [ref]$tok)) {
    Write-Error ("LogonUser failed: {0}" -f (New-Object System.ComponentModel.Win32Exception([Runtime.InteropServices.Marshal]::GetLastWin32Error())).Message)
    exit 2
}
$id  = New-Object System.Security.Principal.WindowsIdentity($tok)
$ctx = $id.Impersonate()

try {
    $sql = [System.IO.File]::ReadAllText($SqlFile)
    $cs  = "Server=$env:LT_SERVER;Database=$Database;Integrated Security=SSPI;TrustServerCertificate=True;Encrypt=False;Connect Timeout=30;Application Name=lt-export"
    $cn  = New-Object System.Data.SqlClient.SqlConnection $cs
    $cn.Open()
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $n = [LtCsv2]::Export($cn, $sql, $OutFile)
    $cn.Close()
    $sw.Stop()
    Write-Output ("exported {0} rows to {1} in {2:n1}s" -f $n, $OutFile, $sw.Elapsed.TotalSeconds)
}
finally {
    $ctx.Undo()
    [void][NativeCred3]::CloseHandle($tok)
}
