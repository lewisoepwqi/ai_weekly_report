#!/usr/bin/env bash
set -euo pipefail

mkdir -p \
  "${HOME}/.openclaw" \
  "${HOME}/.openclaw/workspace" \
  "${HOME}/.openclaw/memory"

if [ "${ENABLE_WEIXIN_PLUGIN:-1}" = "1" ]; then
  marker="${HOME}/.openclaw/.weixin-installed-${WEIXIN_VERSION:-1.0.2}"
  if [ ! -f "${marker}" ]; then
    npx -y "@tencent-weixin/openclaw-weixin-cli@${WEIXIN_VERSION:-1.0.2}" install
    touch "${marker}"
  fi
fi

exec openclaw gateway run \
  --bind "${OPENCLAW_GATEWAY_BIND:-lan}" \
  --port "${OPENCLAW_GATEWAY_PORT:-17654}"
