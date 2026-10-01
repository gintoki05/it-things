import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the shipped transport without loading Three.js or rendering a game.
const source = fs.readFileSync(new URL('../public/games/doodle/game.js', import.meta.url), 'utf8');
const bridge = fs.readFileSync(new URL('../components/apps/doodle-app.tsx', import.meta.url), 'utf8');
const protocol = Number(source.match(/Qt=(\d+),oa=/)[1]);
let now = 1000;
const packets = [];
const context = vm.createContext({
  performance: { now: () => now },
  setInterval: () => 1, clearTimeout() {},
  Hs: class { clear() {} allow() { return true } },
  Gt: connection => connection?.close(),
  jo: new Set(), Uo: () => true, Qt: protocol,
  window: { parent: { postMessage: packet => packets.push(packet.payload) } },
});
const start = source.indexOf('Fi=class{');
const end = source.indexOf(';var Oi=', start);
const Transport = vm.runInContext(`(${source.slice(start + 3, end)})`, context);
const net = new Transport();
net.id = 'host'; net.peer = {}; net.connected = true; net.isHost = true;
const connection = id => ({ peer: id, open: true, isSupabase: true });
for (const id of ['a', 'b', 'c']) net.conns.set(id, connection(id));

const throttle = bridge.match(/if \(isPosPacket\) \{[\s\S]*?lastBroadcastTimeRef.current.set\(stream, now\)\s*\}/)[0];
const accept = new Function('isPosPacket', 'payload', 'now', 'lastBroadcastTimeRef', `${throttle}; return true`);
const ref = { current: new Map() };
const counts = new Map();
for (let tick = 0; tick < 50; tick++, now += 250) {
  packets.length = 0;
  for (const from of ['host', 'other']) for (const to of ['a', 'b', 'c']) {
    net._deliver(to, { t: 'ps', from, d: {} }, true);
  }
  for (const packet of packets) if (accept(true, packet, now, ref)) {
    const key = `${packet.to}/${packet.msg.from}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
}
assert.equal(counts.size, 6);
assert.ok([...counts.values()].every(count => count === 50));
console.log('PASS: all six position streams delivered, including relayed senders');

const p2p = connection('a'); net.conns.set('a', p2p);
net._recoverTransport(p2p);
assert.equal(net.conns.get('a').isSupabase, true);
assert.equal(net.connected, true);
const replacement = net.conns.get('a');
net._recoverTransport(p2p);
assert.equal(net.conns.get('a'), replacement);
console.log('PASS: P2P failure retains relay; stale close cannot remove replacement');

net._route({ t: 'netping' }, 'a');
for (let tick = 0; tick < 20; tick++) {
  now += 2000; net._healthCheck(); net._route({ t: 'netpong' }, 'a');
  assert.equal(net.isPeerTimedOut('a'), false);
}
for (let tick = 0; tick < 23; tick++) { now += 2000; net._healthCheck(); }
assert.equal(net.isPeerTimedOut('a'), true);
now += 60000;
assert.equal(net.isPeerTimedOut('a'), false);
console.log('PASS: heartbeat survives missing positions; genuine silence expires; browser stall gets grace');

net.isHost = false; net.hostId = 'a'; net.roster = ['a', 'b'];
net._route({ t: 'ps', from: 'b', d: {} }, 'a');
assert.equal(net.lastHeard.get('b'), now);
console.log('PASS: relayed traffic refreshes original player liveness');

net.isHost = true; net.code = 'ROOM-1'; net.supabaseRoom = 'ROOM-1';
let joined = false;
net.onPeerJoin = () => { joined = true; throw new Error('accepted generation'); };
net._onSupabaseSignal({ type: 'join_knock', room: 'ROOM', clientId: 'new', v: protocol, gens: [2] });
assert.equal(joined, false);
assert.throws(() => net._onSupabaseSignal({ type: 'join_knock', room: 'ROOM', clientId: 'new', v: protocol, gens: [1] }), /accepted generation/);
console.log('PASS: migration accepts base room and matching generation only');
net._onSupabaseSignal({ type: 'game_msg', from: 'departed', to: 'host', msg: { t: 'netping' } });
assert.equal(net.conns.has('departed'), false);
console.log('PASS: late heartbeat cannot resurrect a departed player');

// Verify the scheduler under continuous position traffic and quiet periods.
const queueSource = fs.readFileSync(new URL('../lib/doodle-broadcast-queue.ts', import.meta.url), 'utf8');
const queueModule = { exports: {} };
vm.runInNewContext(ts.transpileModule(queueSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports: queueModule.exports });
const { DoodleBroadcastQueue } = queueModule.exports;
for (const playerCount of [4, 10]) {
  const queue = new DoodleBroadcastQueue();
  const deliveredControls = [];
  const receivedStreams = new Set();
  const heartbeatTimes = [];
  let broadcasts = 0;
  for (let id = 0; id < 90; id++) queue.enqueue({ type: 'game_msg', msg: { t: 'damage', id } });
  for (let time = 0; time < 60000; time += 100) {
    for (let peer = 1; peer < playerCount; peer++) {
      for (const from of ['host', 'relay']) queue.enqueue({ type: 'game_msg', to: `peer-${peer}`, from: 'host', msg: { t: 'ps', from, time } });
    }
    if (time % 2000 === 0) queue.enqueue({ type: 'game_msg', to: 'host', msg: { t: 'netping', time } });
    const batch = queue.take(time, playerCount);
    if (batch.length) broadcasts++;
    for (const packet of batch) {
      if (packet.msg.t === 'damage') deliveredControls.push(packet.msg.id);
      if (packet.msg.t === 'ps') receivedStreams.add(`${packet.to}|${packet.msg.from}`);
      if (packet.msg.t === 'netping') heartbeatTimes.push(time);
    }
  }
  assert.deepEqual(deliveredControls, Array.from({ length: 90 }, (_, id) => id));
  assert.equal(receivedStreams.size, (playerCount - 1) * 2);
  assert.ok(heartbeatTimes.length >= 25);
  assert.ok(broadcasts / 60 * playerCount * playerCount <= 61, 'fan-out must fit the room budget');
  console.log(`PASS: ${playerCount} players receive every stream, controls drain, heartbeats survive, relay budget stays below 61 events/s`);
}
const quietQueue = new DoodleBroadcastQueue();
for (let id = 0; id < 90; id++) quietQueue.enqueue({ type: 'join_knock', id });
const drained = [];
for (let time = 0; time < 5000; time += 100) drained.push(...quietQueue.take(time, 4));
assert.equal(drained.length, 90);
quietQueue.enqueue({ type: 'game_msg', msg: { t: 'netping' } });
quietQueue.clear();
assert.equal(quietQueue.take(10000, 4).length, 0);
console.log('PASS: queued joins drain without further input; room cleanup discards pending traffic');

// Exercise the receiver used by the React bridge, including legacy single packets.
const receiveStart = bridge.indexOf('        const packets = payload?.type === "doodle_batch"');
const receiveEnd = bridge.indexOf('      })', receiveStart);
const received = [];
const receive = new Function('payload', 'iframeRef', bridge.slice(receiveStart, receiveEnd));
const iframe = { current: { contentWindow: { postMessage: message => received.push(message.payload) } } };
receive({ type: 'doodle_batch', packets: [{ type: 'join_knock' }, { type: 'game_msg', msg: { t: 'netping' } }] }, iframe);
receive({ type: 'game_msg', msg: { t: 'ps' } }, iframe);
assert.equal(received.length, 3);
assert.equal(received[0].type, 'join_knock');
assert.equal(received[1].msg.t, 'netping');
assert.equal(received[2].msg.t, 'ps');
console.log('PASS: bridge unpacks batched signals and still accepts single-packet signals');

const presenceStart = bridge.indexOf('    const presenceTimer = setInterval(() => {');
const presenceEnd = bridge.indexOf('    }, 500)', presenceStart);
const presenceBody = bridge.slice(presenceStart + '    const presenceTimer = setInterval(() => {'.length, presenceEnd);
let presenceNow = 0;
const presenceCalls = [];
const pending = { current: null };
const hostData = { current: null };
const presenceContext = vm.createContext({
  Date: { now: () => presenceNow }, console,
  channel: { state: 'joined', track: async data => { presenceCalls.push({ time: presenceNow, data }); return 'ok'; }, untrack: async () => 'ok' },
  lastLobbyPresenceRef: { current: null }, pendingLobbyTrackRef: pending,
  hostRoomDataRef: hostData, lobbyPresenceSignatureRef: { current: null },
  lobbyUntrackPendingRef: { current: false },
});
for (presenceNow = 0; presenceNow < 60000; presenceNow += 500) {
  pending.current = { roomCode: 'ROOM', hostName: 'Host', playerCount: 4 + Math.floor(presenceNow / 1000) % 2, updatedAt: presenceNow };
  hostData.current = pending.current;
  vm.runInContext(ts.transpileModule(`(() => {${presenceBody}})()`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, presenceContext);
  await Promise.resolve();
}
assert.equal(presenceCalls.length, 4);
for (let i = 1; i < presenceCalls.length; i++) assert.ok(presenceCalls[i].time - presenceCalls[i - 1].time >= 15000);
console.log('PASS: rapid lobby updates coalesce into at most one Presence call every 15 seconds');
