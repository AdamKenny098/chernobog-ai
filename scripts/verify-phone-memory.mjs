import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dataDir = await mkdtemp(path.join(os.tmpdir(), 'chernobog-memory-live-'));
const token = 'memory-live-check-'.repeat(4);
const inferenceEnvironment = {};
if (process.argv.includes('--desktop')) {
  const settings = await readFile('/home/omen/.config/chernobog/desktop-inference.env', 'utf8');
  for (const line of settings.trim().split('\n')) { const index = line.indexOf('='); if (index > 0) inferenceEnvironment[line.slice(0, index).trim()] = line.slice(index + 1).trim(); }
}
let base;
let child;
async function start() {
  child = spawn(process.execPath, ['--input-type=module', '-e', `const {createPhoneCore}=await import(${JSON.stringify(new URL('./phone-core.mjs', import.meta.url).href)});const server=await createPhoneCore({token:process.env.CHERNOBOG_PHONE_TOKEN,dataDir:process.env.CHERNOBOG_PHONE_DATA,desktopUrl:process.env.CHERNOBOG_DESKTOP_URL,desktopSecret:process.env.CHERNOBOG_DESKTOP_SECRET});server.listen(0,'127.0.0.1',()=>process.send({port:server.address().port}));process.once('SIGTERM',()=>{server.close(()=>process.disconnect());server.closeAllConnections()});`], { env: { ...process.env, ...inferenceEnvironment, CHERNOBOG_PHONE_TOKEN: token, CHERNOBOG_PHONE_DATA: dataDir }, stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
  let errors = '';
  child.stderr.on('data', chunk => { errors += chunk.toString(); });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Test process did not become ready')), 10000);
    child.once('message', message => { clearTimeout(timer); base = `http://127.0.0.1:${message.port}`; resolve(); });
    child.once('exit', () => { clearTimeout(timer); reject(new Error(`Test process exited: ${errors}`)); });
    child.once('error', error => { clearTimeout(timer); reject(error); });
  });
}
async function stop() { if (child && child.exitCode === null) { const exited = new Promise(resolve => child.once('exit', resolve)); child.kill('SIGTERM'); await exited; } }
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
async function chat(message) {
  const response = await fetch(`${base}/api/chat`, { method: 'POST', headers, body: JSON.stringify({ message, sessionId: crypto.randomUUID() }) });
  assert.equal(response.status, 200);
  return (await response.json()).reply;
}
try {
  await start();
  const saved = await chat('Remember that my favourite drink is jasmine tea.');
  assert.match(saved, /Saved/);
  console.log('Explicit save committed:', saved);
  await stop();
  await start();
  const recalled = await chat('What is my favourite drink?');
  assert.match(recalled, /jasmine/i);
  console.log('New conversation after actual process restart:', recalled);
  console.log('Inference route:', await (await fetch(`${base}/api/inference/status`, { headers })).text());
  const response = await fetch(`${base}/api/memories`, { headers });
  const records = (await response.json()).memories;
  assert.equal(records.length, 1);
  const forgotten = await chat(`Forget ${records[0].id}`);
  assert.match(forgotten, /Removed/);
  await stop();
  await start();
  const empty = await (await fetch(`${base}/api/memories`, { headers })).json();
  assert.deepEqual(empty.memories, []);
  const after = await chat('What is my favourite drink?');
  assert.doesNotMatch(after, /jasmine/i);
  assert.match(after, /do not have a confirmed saved memory/i);
  console.log('After forget and another process restart:', after);
  console.log('Isolated test passed. Production memories and chats were untouched.');
} finally { await stop(); await rm(dataDir, { recursive: true, force: true }); }
