#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
test "$(id -u)" -eq 0
node --input-type=module -e 'import {DatabaseSync} from "node:sqlite"; const database=new DatabaseSync(":memory:"); database.close()'
node --test tests/phoneMemory.test.mjs tests/phoneCore.test.mjs tests/phoneInterface.test.mjs tests/phoneStream.test.mjs tests/phoneStreamHttp.test.mjs tests/phoneInferenceRouter.test.mjs
install -d -m 700 /var/backups/chernobog-phone
backup=$(mktemp -d "/var/backups/chernobog-phone/$(date -u +%Y%m%dT%H%M%S)-memory.XXXXXX")
cp -a /opt/chernobog-phone/scripts "$backup/scripts"
systemctl stop chernobog-phone
rollback() {
  result=$?
  trap - EXIT
  if [ "$result" -ne 0 ]; then
    cp -a "$backup/scripts/." /opt/chernobog-phone/scripts/
    echo 'Activation failed; restored previous modules. Memory data retained for inspection.'
  fi
  systemctl start chernobog-phone
  exit "$result"
}
trap rollback EXIT
tar -C /var/lib -czf "$backup/phone-data.tar.gz" chernobog-phone
chmod 600 "$backup/phone-data.tar.gz"
install -m 644 scripts/phone-core.mjs scripts/phone-interface.mjs scripts/phone-stream.mjs scripts/phone-inference-router.mjs scripts/phone-personality.mjs scripts/phone-memory.mjs /opt/chernobog-phone/scripts/
systemctl start chernobog-phone
for attempt in $(seq 1 20); do
  if curl --fail --silent http://127.0.0.1:3192/health/live >/dev/null; then break; fi
  sleep 1
done
curl --fail --silent http://127.0.0.1:3192/health/live
echo
echo "Memory enabled. Backup: $backup"
