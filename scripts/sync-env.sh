#!/usr/bin/env bash
# Populate .env with the live local Supabase URL, keys, and DATABASE_URL.
#
# Reads values straight from the Supabase CLI (renamed to our env var names) and
# upserts the four keys into .env, leaving everything else (LLM keys, etc.)
# untouched. Idempotent: re-running just refreshes the four values.
set -euo pipefail

cd "$(dirname "$0")/.."

ENV_FILE=".env"
KEYS=(
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  DATABASE_URL
)

if [ ! -f "$ENV_FILE" ]; then
  echo "sync-env: $ENV_FILE not found — run 'task env-file' first" >&2
  exit 1
fi

# Ask the Supabase CLI for its status as env vars, renamed to our names.
status_env="$(pnpm exec supabase status -o env \
  --override-name api.url=NEXT_PUBLIC_SUPABASE_URL \
  --override-name auth.anon_key=NEXT_PUBLIC_SUPABASE_ANON_KEY \
  --override-name auth.service_role_key=SUPABASE_SERVICE_ROLE_KEY \
  --override-name db.url=DATABASE_URL)"

upsert() {
  local key="$1" value="$2"
  # Strip surrounding quotes the CLI adds around values.
  value="${value%\"}"
  value="${value#\"}"
  if grep -qE "^${key}=" "$ENV_FILE"; then
    # Replace existing line; use a non-/ delimiter since values contain URLs.
    sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
  else
    printf '%s=%s\n' "$key" "$value" >>"$ENV_FILE"
  fi
}

for key in "${KEYS[@]}"; do
  line="$(printf '%s\n' "$status_env" | grep -E "^${key}=" || true)"
  if [ -z "$line" ]; then
    echo "sync-env: '${key}' not found in supabase status output — is the stack up?" >&2
    exit 1
  fi
  upsert "$key" "${line#*=}"
done

echo "✓ Synced Supabase keys into $ENV_FILE: ${KEYS[*]}"
