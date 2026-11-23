#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
test "$(id -u)" -eq 0 || { echo 'Run with sudo bash deploy/phone/install.sh'; exit 1; }
command -v node >/dev/null
command -v tailscale >/dev/null
curl --fail --silent http://127.0.0.1:3000/command-center >/dev/null
node --input-type=module -e 'if(Number(process.versions.node.split(".")[0])<22)process.exit(1)'
curl --fail --silent http://127.0.0.1:11434/api/tags >/dev/null
node --test tests/phoneCore.test.mjs tests/phoneInterface.test.mjs tests/phoneStream.test.mjs tests/phoneStreamHttp.test.mjs
id chernobog-phone >/dev/null 2>&1 || useradd --system --home-dir /var/lib/chernobog-phone --shell /usr/sbin/nologin chernobog-phone
install -d -m 755 /opt/chernobog-phone/scripts /opt/chernobog-phone/deploy/phone
install -m 644 scripts/phone-core.mjs scripts/phone-interface.mjs scripts/phone-stream.mjs /opt/chernobog-phone/scripts/
install -m 644 deploy/phone/index.html deploy/phone/app.js deploy/phone/style.css /opt/chernobog-phone/deploy/phone/
if [ ! -f /etc/chernobog-phone.env ]; then
  umask 077
  printf 'CHERNOBOG_PHONE_TOKEN=%s\nCHERNOBOG_PHONE_MODEL=gemma3:4b\n' "$(openssl rand -hex 32)" > /etc/chernobog-phone.env
fi
chmod 600 /etc/chernobog-phone.env
if ! grep -q '^CHERNOBOG_FRONTEND_URL=' /etc/chernobog-phone.env; then
  printf 'CHERNOBOG_FRONTEND_URL=http://127.0.0.1:3000\n' >> /etc/chernobog-phone.env
fi
install -m 644 deploy/phone/chernobog-phone.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable chernobog-phone.service
systemctl restart chernobog-phone.service
for attempt in $(seq 1 20); do
  if curl --silent --fail http://127.0.0.1:3192/health/live >/dev/null; then break; fi
  sleep 1
done
set -a
source /etc/chernobog-phone.env
set +a
curl --fail --silent -H "Authorization: Bearer $CHERNOBOG_PHONE_TOKEN" http://127.0.0.1:3192/health/ready
printf '\n'
if ss -ltnH | awk '{print $4}' | grep -qE ':10443$'; then
  tailscale serve status | grep -q 'https://.*:10443' || { echo 'Port 10443 already occupied; refusing to replace its service'; exit 1; }
fi
tailscale serve --bg --https=10443 http://127.0.0.1:3192
tailscale serve --https=9443 off
tailscale serve status
printf '\nAccess token (store privately; enter on your phone):\n%s\n' "$CHERNOBOG_PHONE_TOKEN"
