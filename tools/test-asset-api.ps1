$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$pgBin = 'C:\Program Files\PostgreSQL\17\bin'
if (-not (Test-Path (Join-Path $pgBin 'initdb.exe'))) { throw 'PostgreSQL 17 tools are required for the isolated integration test.' }
function Get-TestPort {
    $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
    $listener.Start()
    try { return $listener.LocalEndpoint.Port } finally { $listener.Stop() }
}
function Invoke-TestProcess([string] $file, [string[]] $arguments, [string] $logPrefix) {
    # Native PowerShell pipelines can wait forever on the postgres grandchild's inherited handles.
    # Dedicated output files keep startup and shutdown independent of that grandchild.
    $process = Start-Process -FilePath $file -ArgumentList $arguments -WindowStyle Hidden -PassThru -RedirectStandardOutput ($logPrefix + '.log') -RedirectStandardError ($logPrefix + '-error.log')
    $null = $process.Handle
    if (-not $process.WaitForExit(60000)) { Stop-Process -Id $process.Id -Force; throw 'Isolated test process timed out; inspect its logs.' }
    $process.Refresh()
    if ($process.ExitCode -ne 0) { throw 'Isolated test process failed; inspect its logs.' }
}
$testRoot = Join-Path $repoRoot ('.data\asset-api-test-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $testRoot | Out-Null
$testRoot = (Resolve-Path -LiteralPath $testRoot).Path
if (-not $testRoot.StartsWith((Join-Path $repoRoot '.data') + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe test directory.' }
$password = [guid]::NewGuid().ToString('N')
$passwordFile = Join-Path $testRoot 'pg-password.txt'
Set-Content -LiteralPath $passwordFile -Value $password -NoNewline
$api = $null
$pgStarted = $false
$pgData = Join-Path $testRoot 'pg'
$pgPort = Get-TestPort
$apiPort = Get-TestPort
$environmentKeys = @('KORA_POSTGRES_CONNECTION','KORA_ASSET_API_TOKEN','KORA_STORAGE_PROVIDER','KORA_OBJECT_ROOT','KORA_ASSET_LISTEN','KORA_ASSET_API_URL','KORA_TEST_ISOLATED','MSBuildEnableWorkloadResolver','DOTNET_CLI_WORKLOAD_UPDATE_NOTIFY_DISABLE','DOTNET_CLI_HOME','NUGET_PACKAGES')
$previousEnvironment = @{}
foreach ($key in $environmentKeys) { $previousEnvironment[$key] = [Environment]::GetEnvironmentVariable($key) }
try {
    Invoke-TestProcess (Join-Path $pgBin 'initdb.exe') @('-D', ('"' + $pgData + '"'), '-U', 'kora_test', ('--pwfile="' + $passwordFile + '"'), '--auth=scram-sha-256', '--encoding=UTF8', '--locale=C') (Join-Path $testRoot 'init')
    # Mark the cluster before starting so an interrupted startup also receives cleanup.
    $pgStarted = $true
    Invoke-TestProcess (Join-Path $pgBin 'pg_ctl.exe') @('-D', ('"' + $pgData + '"'), '-l', ('"' + (Join-Path $testRoot 'postgres.log') + '"'), '-o', ('"-p ' + $pgPort + ' -h 127.0.0.1"'), '-w', 'start') (Join-Path $testRoot 'pg-start')
    $env:KORA_POSTGRES_CONNECTION = 'Host=127.0.0.1;Port=' + $pgPort + ';Database=postgres;Username=kora_test;Password=' + $password
    $env:KORA_ASSET_API_TOKEN = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
    $env:KORA_STORAGE_PROVIDER = 'local'
    $env:KORA_OBJECT_ROOT = Join-Path $testRoot 'objects'
    $env:KORA_ASSET_LISTEN = 'http://127.0.0.1:' + $apiPort
    $env:KORA_ASSET_API_URL = $env:KORA_ASSET_LISTEN
    $env:KORA_TEST_ISOLATED = '1'
    $env:MSBuildEnableWorkloadResolver = 'false'
    $env:DOTNET_CLI_WORKLOAD_UPDATE_NOTIFY_DISABLE = 'true'
    $env:DOTNET_CLI_HOME = Join-Path $repoRoot '.dotnet-home'
    $env:NUGET_PACKAGES = Join-Path $repoRoot '.nuget\packages'
    # Launch the built DLL directly: stopping this tracked PID also stops the API host.
    $apiDll = Join-Path $repoRoot 'backend\KoraWar.AssetApi\bin\Debug\net10.0\KoraWar.AssetApi.dll'
    if (-not (Test-Path -LiteralPath $apiDll)) { throw 'Build the Asset API before running its isolated integration test.' }
    $api = Start-Process dotnet -ArgumentList @(('"' + $apiDll + '"')) -WorkingDirectory $repoRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $testRoot 'api.log') -RedirectStandardError (Join-Path $testRoot 'api-error.log')
    $ready = $false
    for ($i=0; $i -lt 60; $i++) {
        if ($api.HasExited) { throw 'Asset API exited early; see test api-error.log.' }
        try {
            $response = Invoke-RestMethod ($env:KORA_ASSET_LISTEN + '/internal/health') -Headers @{ 'X-Kora-Service-Token' = $env:KORA_ASSET_API_TOKEN } -TimeoutSec 1
            if ($response.ok) { $ready = $true; break }
        } catch { Start-Sleep -Milliseconds 250 }
    }
    if (-not $ready) { throw 'Asset API health timed out.' }
    Push-Location $repoRoot
    try { & npx tsx tools/check-asset-api.ts; if ($LASTEXITCODE -ne 0) { throw 'Asset API assertions failed.' } }
    finally { Pop-Location }
} finally {
    if ($api -and -not $api.HasExited) { Stop-Process -Id $api.Id -Force }
    try {
        if ($pgStarted -and (Test-Path -LiteralPath (Join-Path $pgData 'postmaster.pid'))) { Invoke-TestProcess (Join-Path $pgBin 'pg_ctl.exe') @('-D', ('"' + $pgData + '"'), '-m', 'fast', '-w', 'stop') (Join-Path $testRoot 'pg-stop') }
    } finally {
        Remove-Item -LiteralPath $passwordFile -Force -ErrorAction SilentlyContinue
        foreach ($key in $environmentKeys) { [Environment]::SetEnvironmentVariable($key, $previousEnvironment[$key]) }
    }
}
# Test files/logs remain in ignored .data for diagnosing failures. No existing database is touched.
