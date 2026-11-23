# Private phone conversation

This standalone Node 22 service provides authenticated conversation with the
existing Ollama model, without Next.js. It binds only to 127.0.0.1:3192.
Tailscale Serve provides private HTTPS on port 9443. Do not use Funnel or
forward this port through the router. Tailnet access policy must restrict
the server to trusted devices. The access token is kept only in the page's
memory; reload requires entering it again.

On Ubuntu, from a checkout of master:

```bash
sudo bash deploy/phone/install.sh
```

Connect the phone to Tailscale, open the HTTPS URL printed by the installer,
and enter the printed token. Send a message, then a follow-up referring to it.
The model defaults to gemma3:4b. Change CHERNOBOG_PHONE_MODEL in
/etc/chernobog-phone.env and restart chernobog-phone if needed.

Conversation history persists in /var/lib/chernobog-phone, restricted to the
dedicated service identity. Only the latest 24 messages are supplied as context.
The page resumes its session ID after reload but does not render older turns.
Back up this directory if conversation retention is required. This runtime
does not execute tools, run scheduler jobs, or access the old vault and memory.
It must not claim that those B15 capabilities have been activated.

The B15 branch at 54896ac contains 177 commits not on master and master has
three commits not in B15. This release adds the conversation path to master
without merging the entire experimental deployment branch. B15 jobs.json and
legacy writer blockers still apply to activating B15 against shared storage.
This service uses a separate store and does not acquire shared writer authority.

Verification:

```bash
node --test tests/phoneCore.test.mjs
sudo systemctl status chernobog-phone --no-pager
sudo journalctl -u chernobog-phone -n 50 --no-pager
curl --fail http://127.0.0.1:3192/health/live
sudo systemctl restart chernobog-phone
tailscale serve status
```

The installer checks authenticated model readiness. A real conversation is
still required to verify inference, and a phone test is required to verify
end-to-end connectivity. Node is restarted after failure and enabled at boot.

Rollback only this service (existing services and Serve ports are untouched):

```bash
sudo tailscale serve --https=9443 off
sudo systemctl disable --now chernobog-phone
```

Observed server: Node 22.22.1; Ollama gemma3:4b; legacy, passive core,
Village, agent host and Tailscale active. Serve ports 443 and 8443 were
already occupied, so this installer uses 9443. SSH works as omen; sudo
requires an interactive password. System service installation cannot be
completed by the remote noninteractive session.
