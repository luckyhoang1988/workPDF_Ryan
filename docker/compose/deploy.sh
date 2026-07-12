#!/usr/bin/env bash
set -euo pipefail

# Run from inside the cloned repo root, e.g.: ./docker/compose/deploy.sh [yml-file]
# Default compose file: docker-compose.yml (standard variant)

COMPOSE_FILE="${1:-docker-compose.yml}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$SCRIPT_DIR"

if [ ! -f ".env" ]; then
  echo "Missing docker/compose/.env — copy .env.example and fill in real credentials first." >&2
  exit 1
fi

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "Compose file $COMPOSE_FILE not found in $SCRIPT_DIR" >&2
  exit 1
fi

git -C "$SCRIPT_DIR/../.." pull --ff-only

docker compose -f "$COMPOSE_FILE" up -d --build
docker compose -f "$COMPOSE_FILE" ps
