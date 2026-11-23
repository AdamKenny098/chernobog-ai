export async function readOllamaStream(body, onToken) {
  const decoder = new TextDecoder();
  let pending = '';
  let reply = '';
  let complete = false;
  async function consume(line) {
    if (!line.trim()) return;
    const event = JSON.parse(line);
    if (event.error) throw new Error('Model stream failed');
    const token = event.message?.content;
    if (typeof token === 'string' && token) { reply += token; await onToken(token); }
    if (event.done === true) complete = true;
  }
  for await (const chunk of body) {
    pending += decoder.decode(chunk, { stream: true });
    let newline;
    while ((newline = pending.indexOf('\n')) !== -1) {
      await consume(pending.slice(0, newline));
      pending = pending.slice(newline + 1);
    }
    if (pending.length > 1024 * 1024) throw new Error('Model stream frame too large');
  }
  pending += decoder.decode();
  await consume(pending);
  if (!complete || !reply.trim()) throw new Error('Incomplete model reply');
  return reply;
}
