$ErrorActionPreference = "Stop"

$ContainerName = "prelegal"

$existing = docker ps -a --format '{{.Names}}' | Where-Object { $_ -eq $ContainerName }
if ($existing) {
    Write-Host "Stopping and removing $ContainerName..."
    docker rm -f $ContainerName | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "docker rm failed with exit code $LASTEXITCODE" }
    Write-Host "Stopped."
} else {
    Write-Host "$ContainerName is not running."
}
