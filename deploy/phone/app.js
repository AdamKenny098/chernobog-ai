let sessionId = localStorage.getItem('chernobog-phone-session') || crypto.randomUUID();
const element = id => document.getElementById(id);
const add = (speaker, text) => {
  const paragraph = document.createElement('p');
  paragraph.textContent = `${speaker}: ${text}`;
  element('messages').append(paragraph);
  paragraph.scrollIntoView({ block: 'nearest' });
};
element('new').onclick = () => {
  sessionId = crypto.randomUUID();
  localStorage.setItem('chernobog-phone-session', sessionId);
  element('messages').replaceChildren();
};
document.querySelector('form').onsubmit = async event => {
  event.preventDefault();
  const message = element('message').value.trim();
  if (!message || !element('token').value) { element('status').textContent = 'Enter your access token and message.'; return; }
  element('send').disabled = true;
  element('status').textContent = 'Chernobog is thinking…';
  try {
    const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${element('token').value}` }, body: JSON.stringify({ sessionId, message }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    sessionId = result.sessionId;
    localStorage.setItem('chernobog-phone-session', sessionId);
    add('You', message);
    add('Chernobog', result.reply);
    element('message').value = '';
    element('status').textContent = '';
  } catch (error) { element('status').textContent = error.message; }
  finally { element('send').disabled = false; }
};
