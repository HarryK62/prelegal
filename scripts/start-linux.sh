#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

IMAGE_NAME="prelegal"
CONTAINER_NAME="prelegal"

echo "Building $IMAGE_NAME image..."
docker build -t "$IMAGE_NAME" .

if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  echo "Removing existing $CONTAINER_NAME container..."
  docker rm -f "$CONTAINER_NAME" >/dev/null
fi

echo "Starting $CONTAINER_NAME on http://localhost:8000 ..."
docker run -d --name "$CONTAINER_NAME" --env-file .env -p 8000:8000 "$IMAGE_NAME"

echo "Prelegal is running at http://localhost:8000"
