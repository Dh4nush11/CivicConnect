#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <email> <password>" >&2
  exit 2
fi

API_URL="${API_URL:-http://localhost:5001}"
LOGIN_EMAIL="$1" LOGIN_PASSWORD="$2" node -e '
  const payload = JSON.stringify({
    email: process.env.LOGIN_EMAIL,
    password: process.env.LOGIN_PASSWORD
  });
  process.stdout.write(payload);
' | curl --fail-with-body --silent --show-error \
  -H "Content-Type: application/json" \
  --data-binary @- \
  "$API_URL/api/auth/login"
printf '\n'
