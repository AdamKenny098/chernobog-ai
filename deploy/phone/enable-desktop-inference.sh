#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
test "$(id -u)" -eq 0
test -f /home/omen/.config/chernobog/desktop-inference.env
install -m 600 -o root -g root /home/omen/.config/chernobog/desktop-inference.env /etc/chernobog-desktop-inference.env
install -m 644 scripts/phone-core.mjs scripts/phone-interface.mjs scripts/phone-stream.mjs scripts/phone-inference-router.mjs scripts/phone-personality.mjs /opt/chernobog-phone/scripts/
install -d -m 755 /etc/systemd/system/chernobog-phone.service.d
printf '[Service]\nEnvironmentFile=/etc/chernobog-desktop-inference.env\n' > /etc/systemd/system/chernobog-phone.service.d/desktop-inference.conf
systemctl daemon-reload
systemctl restart chernobog-phone
systemctl is-active chernobog-phone
echo 'Desktop inference enabled; phone credentials and conversation data unchanged.'
