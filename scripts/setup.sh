#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

ENV_FILE="${REPO_ROOT}/.env"

copy_env_examples_if_missing() {
  if [[ -f "${ENV_FILE}" ]]; then
    return 0
  fi

  echo "Creating .env from *.env.example files..."
  touch "${ENV_FILE}"

  local files=(
    ".env.example"
    "apps/api/.env.example"
    "apps/web/.env.example"
    "apps/ml/.env.example"
  )

  for f in "${files[@]}"; do
    if [[ -f "${f}" ]]; then
      cat "${f}" >> "${ENV_FILE}"
      echo "" >> "${ENV_FILE}"
    fi
  done
}

gen_secret() {
  # 48 bytes of base64 text is comfortably >= 32 characters
  openssl rand -base64 48 | tr -d '\n'
}

set_env_var() {
  local key="$1"
  local value="$2"

  if grep -q "^${key}=" "${ENV_FILE}"; then
    # Replace existing value
    perl -pi -e "s/^${key}=.*/${key}=${value}/" "${ENV_FILE}"
  else
    echo "${key}=${value}" >> "${ENV_FILE}"
  fi
}

copy_env_examples_if_missing

echo "Generating JWT secrets..."
JWT_SECRET="$(gen_secret)"
JWT_REFRESH_SECRET="$(gen_secret)"

set_env_var "JWT_SECRET" "${JWT_SECRET}"
set_env_var "JWT_REFRESH_SECRET" "${JWT_REFRESH_SECRET}"

echo "Setup complete. Run: docker-compose up -d --build"

