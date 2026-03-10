#!/usr/bin/env bash
set -euo pipefail

# ATSFlare Agent Installer
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/Rain-kl/ATSFlare/main/scripts/install-agent.sh | bash -s -- \
#     --server-url http://your-server:3000 \
#     --discovery-token your-token

INSTALL_DIR="/opt/atsflare-agent"
REPO="Rain-kl/ATSFlare"
SERVER_URL=""
DISCOVERY_TOKEN=""
AGENT_TOKEN=""
CREATE_SERVICE="true"

usage() {
  cat <<EOF
ATSFlare Agent Installer

Usage:
  install-agent.sh [OPTIONS]

Options:
  --server-url URL          Server URL (required)
  --discovery-token TOKEN   Discovery token for auto-registration
  --agent-token TOKEN       Node-specific agent token
  --install-dir DIR         Installation directory (default: /opt/atsflare-agent)
  --repo REPO               GitHub repository (default: Rain-kl/ATSFlare)
  --no-service              Do not create systemd service
  -h, --help                Show this help message

Examples:
  # Install with discovery token (auto-register)
  install-agent.sh --server-url http://10.0.0.1:3000 --discovery-token abc123

  # Install with node-specific token
  install-agent.sh --server-url http://10.0.0.1:3000 --agent-token node-token-xyz
EOF
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --server-url)   SERVER_URL="$2"; shift 2 ;;
    --discovery-token) DISCOVERY_TOKEN="$2"; shift 2 ;;
    --agent-token)  AGENT_TOKEN="$2"; shift 2 ;;
    --install-dir)  INSTALL_DIR="$2"; shift 2 ;;
    --repo)         REPO="$2"; shift 2 ;;
    --no-service)   CREATE_SERVICE="false"; shift ;;
    -h|--help)      usage ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

if [[ -z "$SERVER_URL" ]]; then
  echo "Error: --server-url is required"
  exit 1
fi

if [[ -z "$DISCOVERY_TOKEN" && -z "$AGENT_TOKEN" ]]; then
  echo "Error: either --discovery-token or --agent-token is required"
  exit 1
fi

# Detect platform
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64|amd64) ARCH="amd64" ;;
  aarch64|arm64) ARCH="arm64" ;;
  *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

if [[ "$OS" != "linux" && "$OS" != "darwin" ]]; then
  echo "Unsupported OS: $OS"
  exit 1
fi

ASSET_NAME="atsflare-agent-${OS}-${ARCH}"
echo "Detected platform: ${OS}/${ARCH}"

# Get latest release download URL
echo "Fetching latest release from ${REPO}..."
RELEASE_INFO=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest")
DOWNLOAD_URL=$(echo "$RELEASE_INFO" | grep -o "\"browser_download_url\"[[:space:]]*:[[:space:]]*\"[^\"]*${ASSET_NAME}\"" | grep -o 'https://[^"]*' || true)

if [[ -z "$DOWNLOAD_URL" ]]; then
  echo "Error: no matching asset '${ASSET_NAME}' found in latest release"
  exit 1
fi

TAG=$(echo "$RELEASE_INFO" | grep -o '"tag_name"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"')
echo "Latest release: ${TAG}"

# Create install directory
echo "Installing to ${INSTALL_DIR}..."
mkdir -p "${INSTALL_DIR}/data"

# Download binary
echo "Downloading ${ASSET_NAME}..."
curl -fsSL -o "${INSTALL_DIR}/atsflare-agent" "$DOWNLOAD_URL"
chmod +x "${INSTALL_DIR}/atsflare-agent"

# Generate config
CONFIG_FILE="${INSTALL_DIR}/agent.json"
if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "Generating agent.json..."
  if [[ -n "$AGENT_TOKEN" ]]; then
    cat > "$CONFIG_FILE" <<CFGEOF
{
  "server_url": "${SERVER_URL}",
  "agent_token": "${AGENT_TOKEN}",
  "data_dir": "${INSTALL_DIR}/data",
  "heartbeat_interval": 30000,
  "sync_interval": 30000,
  "request_timeout": 10000
}
CFGEOF
  else
    cat > "$CONFIG_FILE" <<CFGEOF
{
  "server_url": "${SERVER_URL}",
  "discovery_token": "${DISCOVERY_TOKEN}",
  "data_dir": "${INSTALL_DIR}/data",
  "heartbeat_interval": 30000,
  "sync_interval": 30000,
  "request_timeout": 10000
}
CFGEOF
  fi
else
  echo "Config file already exists, skipping generation"
fi

# Create systemd service
if [[ "$CREATE_SERVICE" == "true" && "$OS" == "linux" && -d /etc/systemd/system ]]; then
  echo "Creating systemd service..."
  cat > /etc/systemd/system/atsflare-agent.service <<SVCEOF
[Unit]
Description=ATSFlare Agent
After=network.target

[Service]
Type=simple
ExecStart=${INSTALL_DIR}/atsflare-agent -config ${CONFIG_FILE}
WorkingDirectory=${INSTALL_DIR}
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SVCEOF

  systemctl daemon-reload
  systemctl enable atsflare-agent
  systemctl start atsflare-agent
  echo "Service created and started: atsflare-agent"
else
  echo ""
  echo "To start the agent manually:"
  echo "  ${INSTALL_DIR}/atsflare-agent -config ${CONFIG_FILE}"
fi

echo ""
echo "ATSFlare Agent installed successfully!"
echo "  Binary: ${INSTALL_DIR}/atsflare-agent"
echo "  Config: ${CONFIG_FILE}"
echo "  Data:   ${INSTALL_DIR}/data"
