// A single test player: joins next to the Gate 4 spawn, says hello, walks a little, logs chat it hears.
// Usage: node scripts/bot.js [name] [secs]
import WebSocket from 'ws';

const name = process.argv[2] || 'Hamza', secs = Number(process.argv[3]) || 60;
const ws = new WebSocket(process.env.URL || 'ws://127.0.0.1:8787/ws', { headers: { origin: 'http://localhost:5173' } });
const look = { gender: 'm', skin: '#b0764a', hair: '#1d1917', hairStyle: 'curly', headwear: 'cap', headColor: '#b8323a', outfit: 'jacket', top: '#2f5a9a', pants: '#3c3c44', bag: '#5c4834', glasses: true };
let x = 540, y = 112;                                   // a few steps from the Gate 4 spawn (515, 99)
ws.on('open', () => {
  ws.send(JSON.stringify({ t: 'hello', v: 1, name, look, scene: 'campus', x, y }));
  setTimeout(() => ws.send(JSON.stringify({ t: 'chat', text: 'Assalam o Alaikum! Kya haal hai?' })), 1500);
  let k = 0;
  setInterval(() => { x = 540 + Math.sin(k++ / 10) * 12; ws.send(JSON.stringify({ t: 'move', x, y, d: 3, m: 1 })); }, 100);
});
ws.on('message', d => {
  const m = JSON.parse(d.toString());
  if (m.t === 'welcome') console.log('joined as', m.id, 'online', m.online);
  if (m.t === 'chat') console.log(`heard ${m.name}: ${m.text}`);
  if (m.t === 'snap' && m.prof) for (const p of m.prof) console.log('sees', p[1]);
});
setTimeout(() => process.exit(0), secs * 1000);
