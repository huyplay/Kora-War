$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$env:MSBuildEnableWorkloadResolver = 'false'
$env:DOTNET_CLI_WORKLOAD_UPDATE_NOTIFY_DISABLE = 'true'
$env:DOTNET_CLI_HOME = Join-Path $repoRoot '.dotnet-home'
$env:NUGET_PACKAGES = Join-Path $repoRoot '.nuget\packages'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
Push-Location $repoRoot
try {
    & dotnet build backend/KoraWar.AssetApi --nologo
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    # dotnet run changes the host's working directory to the project directory.
    # Launch the DLL from the workspace so .env.local and local object paths agree with Node.
    & dotnet backend/KoraWar.AssetApi/bin/Debug/net10.0/KoraWar.AssetApi.dll
    exit $LASTEXITCODE
}
finally { Pop-Location }
