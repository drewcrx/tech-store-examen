#!/usr/bin/env bash
set -Eeuo pipefail

cd "$(dirname "$0")"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

required=(POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD ADMIN_API_KEY GHCR_OWNER)
for variable in "${required[@]}"; do
  if [[ -z "${!variable:-}" ]]; then
    echo "Falta la variable obligatoria: $variable" >&2
    exit 1
  fi
done

export IMAGE_TAG="${IMAGE_TAG:-latest}"
export FRONTEND_PORT="${FRONTEND_PORT:-8081}"
export BACKEND_PORT="${BACKEND_PORT:-8000}"

if [[ -n "${GHCR_TOKEN:-}" ]]; then
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_OWNER" --password-stdin
fi

docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d

echo "NovaByte desplegado. Frontend: http://<IP-DEL-VPS>:${FRONTEND_PORT}  API: http://<IP-DEL-VPS>:${BACKEND_PORT}/api"
