#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
test "$(id -u)" -eq 0
command -v docker >/dev/null
docker build -f deploy/phone/voice.Dockerfile -t chernobog-voice:local .
install -m 644 deploy/phone/chernobog-voice.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now chernobog-voice
systemctl restart chernobog-voice
for attempt in $(seq 1 90); do
  if curl --fail --silent http://127.0.0.1:3194/health; then exit 0; fi
  sleep 1
done
journalctl -u chernobog-voice -n 30 --no-pager
exit 1
