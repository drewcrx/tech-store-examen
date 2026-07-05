#!/usr/bin/env bash
set -Eeuo pipefail

cd "$(dirname "$0")"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

required=(POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD ADMIN_API_KEY DOMAIN GHCR_OWNER)
for variable in "${required[@]}"; do
  if [[ -z "${!variable:-}" ]]; then
    echo "Falta la variable obligatoria: $variable" >&2
    exit 1
  fi
done

export IMAGE_TAG="${IMAGE_TAG:-latest}"
export LETSENCRYPT_RESOLVER="${LETSENCRYPT_RESOLVER:-letsencrypt}"

if ! docker network inspect traefik-public >/dev/null 2>&1; then
  echo "No existe la red externa traefik-public. Créala o despliega Traefik primero." >&2
  exit 1
fi

if [[ -n "${GHCR_TOKEN:-}" ]]; then
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_OWNER" --password-stdin
fi

docker pull "ghcr.io/${GHCR_OWNER}/novabyte-backend:${IMAGE_TAG}"
docker pull "ghcr.io/${GHCR_OWNER}/novabyte-frontend:${IMAGE_TAG}"
docker stack deploy -c stack.yml novabyte --with-registry-auth

echo "NovaByte desplegado. Revisa: https://${DOMAIN}"
