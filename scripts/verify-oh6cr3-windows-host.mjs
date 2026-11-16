import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
const base = process.cwd();
const read = (path) => { const file = join(base, path); assert.ok(existsSync(file), `Missing ${path}`); return readFileSync(file, 'utf8'); };
const dir = 'ops/windows/oh6cr3/';
const supervisor = read(dir + 'HostSupervisor.ps1');
const register = read(dir + 'Register-HostAtLogon.ps1');
const status = read(dir + 'HostStatus.ps1');
const unregister = read(dir + 'Unregister-HostAtLogon.ps1');
const doc = read('docs/overhaul/OH-6C-R3A-WINDOWS-HOST-SUPERVISOR.md');
const all = [supervisor, register, status, unregister];
function pass(description, predicate) { assert.ok(predicate, description); console.log('PASS ' + description); }
pass('only a current-user interactive scheduled task; no SYSTEM identity or stored password',
    /-AtLogOn\s+-User\s+\$account/.test(register) && /-LogonType Interactive/.test(register) && !/-LogonType (Password|ServiceAccount|S4U)/.test(register));
pass('single-instance task and bounded restart attempts', /-MultipleInstances IgnoreNew/.test(register) && /-RestartCount 10/.test(register) && /-RestartInterval/.test(register));
pass('non-admin opt-in registration and separate safe removal',
    /Get-ScheduledTask.*-TaskName/.test(register) && /already exists/.test(register) && /HostSupervisor\\.ps1/.test(unregister));
pass('local-only server health and no port stealing',
    /127\.0\.0\.1:3000\/api\/personal-assistance\/attention/.test(supervisor) && /11434\/api\/version/.test(supervisor) && /-LocalPort\s+\$Port/.test(supervisor) && /\$status\.next -eq 'down'/.test(supervisor));
pass('Next localhost listener and explicit dev/start configuration',
    /-\-hostname', '127\.0\.0\.1'/.test(supervisor) && /ValidateSet\('dev', 'start'\)/.test(supervisor) && /next-not-built/.test(supervisor));
pass('Ollama managed only when API and port are down',
    /\$status\.ollama -eq 'down'/.test(supervisor) && /@\('serve'\)/.test(supervisor));
pass('bounded backoff and process uniqueness',
    /\.TotalSeconds -ge 120/.test(supervisor) && /ChernobogOH6CR3Supervisor/.test(supervisor));
pass('Tailscale status is observational and Serve mapping remains unchanged',
    /serve status/.test(supervisor) && /proxy\\s\+http:\/\/127/.test(supervisor) && !/serve\s+--bg|serve\s+off|tailscale\s+(up|down|login)/i.test(all.join('\n')));
pass('diagnostic health and local-only bounded logs',
    /health\.json/.test(supervisor) && /supervisor\.jsonl/.test(supervisor) && /5242880/.test(supervisor) && /Get-Content/.test(status));
pass('no force-stop, credential modification, or personal-assistance data mutation',
    !/Stop-Process|taskkill|Remove-Item\s+.*\.next|CHERNOBOG_DATA_DIR|saveToken|clearEnrollment|Unregister-ScheduledTask/.test(supervisor));
pass('owner-triggered task removal does not kill managed applications',
    /Stop-ScheduledTask/.test(unregister) && /Unregister-ScheduledTask/.test(unregister) && !/Stop-Process|taskkill/i.test(unregister));
pass('explicit pre-logon and Tailscale unattended limitations documented',
    /pre-login/i.test(doc) && /unattended/i.test(doc) && /owner/i.test(doc));
for (const [i, value] of all.entries()) {
    assert.equal(value.includes('\r'), false, `PowerShell file ${i} has CR-only lines`);
    assert.equal(value.includes('\t'), false, `PowerShell file ${i} has tabs`);
}
console.log('OH-6C-R3A WINDOWS HOST SUPERVISOR: PASS');
