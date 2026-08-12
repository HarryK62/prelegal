$ErrorActionPreference = "Stop"

$ImageName = "prelegal"
$ContainerName = "prelegal"
$RepoRoot = Split-Path -Parent $PSScriptRoot

Set-Location $RepoRoot

Write-Host "Building $ImageName image..."
docker build -t $ImageName .
if ($LASTEXITCODE -ne 0) { throw "docker build failed with exit code $LASTEXITCODE" }

$existing = docker ps -a --format '{{.Names}}' | Where-Object { $_ -eq $ContainerName }
if ($existing) {
    Write-Host "Removing existing $ContainerName container..."
    docker rm -f $ContainerName | Out-Null
}

Write-Host "Starting $ContainerName on http://localhost:8000 ..."
docker run -d --name $ContainerName -p 8000:8000 $ImageName
if ($LASTEXITCODE -ne 0) { throw "docker run failed with exit code $LASTEXITCODE" }

Write-Host "Prelegal is running at http://localhost:8000"
