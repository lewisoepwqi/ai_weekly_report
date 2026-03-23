FROM node:24-bookworm

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

ARG OPENCLAW_VERSION=2026.3.13
ARG FEISHU_PLUGIN_VERSION=2026.3.8
ARG DINGTALK_PLUGIN_VERSION=3.2.0
ARG WEIXIN_VERSION=1.0.2

ENV NODE_ENV=production \
    HOME=/home/node \
    OPENCLAW_CONFIG_DIR=/home/node/.openclaw \
    OPENCLAW_WORKSPACE_DIR=/home/node/.openclaw/workspace \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false \
    WEIXIN_VERSION=${WEIXIN_VERSION}

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      ca-certificates \
      curl \
      git \
      tini \
      python3 \
      make \
      g++ && \
    rm -rf /var/lib/apt/lists/*

RUN npm install -g \
      "openclaw@${OPENCLAW_VERSION}" \
      "@larksuiteoapi/feishu-openclaw-plugin@${FEISHU_PLUGIN_VERSION}" \
      "@soimy/dingtalk@${DINGTALK_PLUGIN_VERSION}" \
      "@tencent-weixin/openclaw-weixin@${WEIXIN_VERSION}" \
      "@tencent-weixin/openclaw-weixin-cli@${WEIXIN_VERSION}" && \
    npm cache clean --force

RUN mkdir -p /app /home/node/.openclaw /home/node/.openclaw/workspace /home/node/.openclaw/memory && \
    chown -R node:node /app /home/node

COPY start-openclaw.sh /usr/local/bin/start-openclaw.sh
RUN chmod +x /usr/local/bin/start-openclaw.sh

USER node
WORKDIR /home/node

EXPOSE 17654 17655

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 \
  CMD curl -fsS "http://127.0.0.1:${OPENCLAW_GATEWAY_PORT:-17654}/healthz" >/dev/null || exit 1

ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/start-openclaw.sh"]
