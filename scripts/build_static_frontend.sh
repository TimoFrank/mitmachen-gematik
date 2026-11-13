#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd -P)"
output=""
origin=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --profile) [ "$2" = target ]; shift 2 ;;
    --auth-mode) [ "$2" = oidc ]; shift 2 ;;
    --output) output="$2"; shift 2 ;;
    --api-base-url) origin="$2"; shift 2 ;;
    *) exit 1 ;;
  esac
done
exec node "$root/scripts/build_gematik_frontend.mjs" --output "$output" --api-base-url "$origin"
