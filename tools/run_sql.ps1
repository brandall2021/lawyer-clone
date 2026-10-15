param(
    [Parameter(Mandatory=$true)][string]$Database,
    [Parameter(Mandatory=$true)][string]$SqlFile,
    [string]$Output
)
$ErrorActionPreference = 'Stop'

# Credenciales: desde variables de entorno o desde tools\creds.local.ps1 (no commiteado).
$credFile = Join-Path $PSScriptRoot 'creds.local.ps1'
if (Test-Path $credFile) { . $credFile }
foreach ($v in @('LT_USER','LT_DOMAIN','LT_PASS')) {
    if (-not [Environment]::GetEnvironmentVariable($v)) {
        Write-Error "Falta la variable $v. Definila por entorno o crea tools\creds.local.ps1 (gitignored)."
        exit 3
    }
}
if (-not $env:LT_SERVER) { $env:LT_SERVER = '192.168.35.54,1433' }

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

try {
    $sql = [System.IO.File]::ReadAllText($SqlFile)
    $cs  = "Server=$env:LT_SERVER;Database=$Database;Integrated Security=SSPI;TrustServerCertificate=True;Encrypt=False;Connect Timeout=30;Application Name=lt-export"
    $cn  = New-Object System.Data.SqlClient.SqlConnection $cs
    $cn.Open()
    $cmd = $cn.CreateCommand()
    $cmd.CommandTimeout = 600
    $cmd.CommandText = $sql

    $reader = $cmd.ExecuteReader()
    $sets = New-Object System.Collections.ArrayList
    do {
        $rows = New-Object System.Collections.ArrayList
        while ($reader.Read()) {
            $o = [ordered]@{}
            for ($i=0; $i -lt $reader.FieldCount; $i++) {
                $name = $reader.GetName($i)
                if ($reader.IsDBNull($i)) { $o[$name] = $null }
                else {
                    $t = $reader.GetFieldType($i)
                    if ($t -eq [byte[]]) { $o[$name] = [Convert]::ToBase64String([byte[]]$reader.GetValue($i)) }
                    else { $o[$name] = $reader.GetValue($i) }
                }
            }
            [void]$rows.Add([pscustomobject]$o)
        }
        [void]$sets.Add($rows)
    } while ($reader.NextResult())
    $reader.Close(); $cn.Close()

    $json = $sets | ConvertTo-Json -Depth 6 -Compress
    if ($Output) { [System.IO.File]::WriteAllText($Output, ($sets | ConvertTo-Json -Depth 6)) }
    else { Write-Output $json }
}
finally {
    $ctx.Undo()
    [void][NativeCred2]::CloseHandle($tok)
}
