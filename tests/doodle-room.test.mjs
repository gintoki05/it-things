import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { MatchEntry } from '../public/games/doodle/match-entry.js';

const source = fs.readFileSync(new URL('../public/games/doodle/game.js', import.meta.url), 'utf8');
const protocol = Number(source.match(/Qt=(\d+),oa=/)[1]);
let nextId = 0;
function create(id, isHost = false, text = source) {
  const packets = [], intervals = new Map(), timeouts = new Map();
  const context = vm.createContext({
    Qt: protocol, Re: 'doodle-', Kt: 'Tester', i0: 7000, a0: 0,
    e0: () => `request-${++nextId}`,
    performance: { now: () => 1000 },
    setInterval: fn => { const key = ++nextId; intervals.set(key, fn); return key; },
    clearInterval: key => intervals.delete(key),
    setTimeout: fn => { const key = ++nextId; timeouts.set(key, fn); return key; },
    clearTimeout: key => timeouts.delete(key),
    Hs: class { clear() {} allow() { return true } },
    Gt: conn => conn?.close(), Ni: () => null,
    jo: new Set(['lobby', 'start']), Uo: () => true,
    F: {}, La: () => [], Ze() {},
    window: { parent: { postMessage: packet => packets.push(packet) } },
  });
  const start = text.indexOf('Fi=class{'), end = text.indexOf(';var Oi=', start);
  const Transport = vm.runInContext(`(${text.slice(start + 3, end)})`, context);
  const net = new Transport();
  net.id = id; net.peer = {}; net.connected = true; net.isHost = isHost;
  net.code = 'ROOM'; net.supabaseRoom = 'ROOM'; net.hostId = 'host'; net.token = 'session-token';
  return { net, context, packets, intervals, timeouts };
}
const conn = peer => ({ peer, open: true, isSupabase: true, on() {}, close() {} });
const { net: host, packets: outgoing } = create('host', true);
const { net: a } = create('a'), { net: b } = create('b');
host.conns.set('a', conn('a')); host.conns.set('b', conn('b'));
for (const net of [a, b]) { net.conns.set('host', conn('host')); net.roster = ['host', 'a', 'b']; }
let received = 0;
b.on('ps', (_, from) => { assert.equal(from, 'a'); received++; });
const position = { type: 'game_msg', room: 'ROOM', hostId: 'host', token: 'session-token', from: 'a', msg: { t: 'ps', from: 'a', d: [1, 2, 3] } };
b._onSupabaseSignal(position);
assert.equal(received, 1, 'a roster member must reach another relay-only client');
assert.equal(b.conns.get('a').isSupabase, true);
for (const change of [{ token: 'another-session' }, { room: 'ROOM-1' }, { hostId: 'other-host' }, { from: 'departed' }]) b._onSupabaseSignal({ ...position, ...change });
assert.equal(received, 1, 'old generation/session and unknown senders must be rejected');
b.setRoster(['host', 'b']); b._onSupabaseSignal(position);
assert.equal(received, 1, 'removed peers must not be resurrected by a late broadcast');
console.log('PASS: relay-only peers share gameplay; stale room/session/host and departed peers are rejected');

// Targeted damage arrives only at the host first; it must still be relayed.
b.setRoster(['host', 'a', 'b']);
a.conns.set('b', conn('b'));
let damage = 0;
b.on('pdmg', (_, from) => { assert.equal(from, 'a'); damage++; });
host._onSupabaseSignal({ ...position, to: 'host', msg: { t: 'pdmg', to: 'b', d: { amount: 5 } } });
const relayedDamage = outgoing.at(-1).payload;
assert.equal(relayedDamage.to, 'b');
b._onSupabaseSignal(relayedDamage);
assert.equal(damage, 1, 'targeted damage must travel from client through the host to the victim');
console.log('PASS: targeted damage also crosses the host relay');

host._sendSupabase(position);
const envelope = outgoing.at(-1).payload;
assert.equal(envelope.token, host.token); assert.equal(envelope.hostId, host.hostId); assert.equal(envelope.room, host.code);

let joins = 0, leaves = 0;
host.onPeerJoin = () => joins++;
host.onPeerLeave = () => leaves++;
const knock = { type: 'join_knock', room: 'ROOM', clientId: 'new', name: 'Same nickname', v: protocol, requestId: 'join-1', sessionId: 'tab-1', joinEpoch: 1 };
host._onSupabaseSignal(knock); host._onSupabaseSignal(knock);
assert.equal(joins, 1, 'retrying a handshake must not repeat join/team/start side effects');
host._onSupabaseSignal({ ...knock, clientId: 'retry', requestId: 'join-2', joinEpoch: 2 });
assert.equal(leaves, 1); assert.equal(host.conns.has('new'), false); assert.equal(host.conns.has('retry'), true);
host._onSupabaseSignal(knock);
assert.equal(host.conns.has('new'), false); assert.equal(host.conns.has('retry'), true, 'old retries cannot evict the new connection');
host._onSupabaseSignal({ ...knock, clientId: 'different-tab', sessionId: 'tab-2' });
assert.equal(host.conns.has('different-tab'), true, 'equal nicknames in separate tabs must stay independent');
host.accepting = false; host._onSupabaseSignal({ ...knock, clientId: 'closed' });
assert.equal(host.conns.has('closed'), false);
console.log('PASS: join retry is idempotent; same tab replaces its ghost peer; equal names are allowed; closed room rejects joins');

const client = create('client');
client.net.connected = false; client.net.code = null; client.net.token = null;
client.net._joinRequest = { id: 'current-request', token: 'session-token', gens: [2] };
let adopted = 0, rosterApplied = 0;
client.net._knockResolver = () => adopted++;
client.net.on('lobby', (snapshot, id) => { assert.equal(id, 'host'); assert.equal(snapshot.players.length, 2); rosterApplied++; });
const welcome = { type: 'join_welcome', room: 'ROOM-2', code: 'ROOM-2', v: protocol, requestId: 'current-request', token: 'session-token', hostId: 'host', to: 'client', players: [{ id: 'host' }, { id: 'client' }], inMatch: true };
for (const change of [{ requestId: 'stale-request' }, { token: 'wrong-token' }, { code: 'ROOM-3' }]) client.net._onSupabaseSignal({ ...welcome, ...change });
assert.equal(adopted, 0); assert.equal(client.net.connected, false);
client.net._onSupabaseSignal(welcome);
assert.equal(adopted, 1); assert.equal(rosterApplied, 1); assert.equal(client.net.inMatch, true);
client.net._onSupabaseSignal({ ...welcome, hostId: 'other-host' });
assert.equal(adopted, 1); assert.equal(client.net.hostId, 'host');
console.log('PASS: welcome binds one requested host and generation before gameplay; late welcomes cannot overwrite the lobby');

// A migrated host may still be reachable through the original room-code alias.
const migrated = create('migrated-client');
const events = new Map();
const aliasConn = { peer: 'doodle-ROOM', open: true, on: (name, fn) => events.set(name, fn) };
let hostMessages = 0;
migrated.net.on('start', () => hostMessages++);
migrated.net._adopt('actual-host', aliasConn, { v: protocol, code: 'ROOM', sessionRoom: 'ROOM-2', token: 'migrated-token' });
assert.equal(migrated.net.code, 'ROOM-2');
events.get('data')({ t: 'start', from: 'actual-host', d: {} });
assert.equal(hostMessages, 1, 'alias connection must route as the authoritative host');
events.get('close')();
assert.equal(migrated.net.conns.get('actual-host').isSupabase, true);
console.log('PASS: original-code alias preserves migrated host identity, generation and relay fallback');

// Reproduce the synchronous welcome race at the actual join() entry point.
const joining = create('before'); joining.net.peer = { destroy() {} };
joining.net._newPeer = async () => ({ id: 'joining-peer', on() {}, off() {}, destroy() {}, connect: () => ({ on() {}, close() {} }) });
joining.context.window.parent.postMessage = packet => {
  if (packet.payload?.type === 'join_knock') joining.net._onSupabaseSignal({ ...welcome, room: 'ROOM', code: 'ROOM', to: packet.payload.clientId, requestId: packet.payload.requestId });
};
assert.equal(await joining.net.join('ROOM'), 'ROOM');
assert.equal(joining.net.connected, true);
assert.equal(joining.net._joinTimer, null);
assert.equal(joining.net._joinRequest, null);
assert.equal(joining.intervals.size, 1, 'only health timer remains after join');
joining.net.leave(); assert.equal(joining.net.inMatch, false);
console.log('PASS: welcome cannot race the join resolver; retry timer is cancelled after adoption/leave');

// A roster entry is not proof a client has loaded the arena.
const entry = new MatchEntry();
assert.deepEqual(entry.pending(['host', 'client'], 'host'), ['client']);
assert.equal(entry.accept({ matchId: 'match-1' }), true);
assert.equal(entry.accept({ matchId: 'match-1' }), false, 'duplicate start must not reset an active match');
assert.equal(entry.acknowledge('client', { matchId: 'old-match' }, 'match-1'), false);
assert.deepEqual(entry.pending(['host', 'client'], 'host'), ['client']);
assert.equal(entry.acknowledge('client', { matchId: 'match-1' }, 'match-1'), true);
assert.deepEqual(entry.pending(['host', 'client'], 'host'), []);
let spawnPicks = 0;
assert.equal(entry.spawn('late', () => { spawnPicks++; return 4; }), 4);
assert.equal(entry.spawn('late', () => { spawnPicks++; return 5; }), 4);
assert.equal(spawnPicks, 1, 'retries retain the host-assigned spawn');
entry.reset(); assert.equal(entry.accept({ matchId: 'match-2' }), true);
console.log('PASS: unacknowledged late joins retry, duplicate starts are harmless, spawn stays authoritative');

// Exercise the shipped start handler and retry loop rather than only the helper.
const handlers = new Map(), starts = [], acknowledgements = [];
let matchBegins = 0;
const flow = vm.createContext({
  matchEntry: new MatchEntry(),
  u: { id: 'client', isHost: false, on: (type, handler) => handlers.set(type, handler),
    send: (type, packet) => acknowledgements.push({ type, packet }),
    sendTo: (id, type, packet) => starts.push({ id, type, packet }) },
  me: handler => handler, F: { players: new Map([['host', {}], ['client', {}]]) },
  window: { __doodleTdm: {} }, Et: { breakables: [] }, Wt: { state: () => [] },
  ee: () => true, Ha: () => 3, Yt: 'ampera', Mn: () => matchBegins++,
});
const handlerStart = source.indexOf('u.on("start",me('), handlerEnd = source.indexOf('u.on("pk"', handlerStart);
vm.runInContext(source.slice(handlerStart, handlerEnd), flow);
handlers.get('start')({ matchId: 'actual-match', spawn: 3 });
handlers.get('start')({ matchId: 'actual-match', spawn: 3 });
assert.equal(matchBegins, 1);
assert.equal(acknowledgements.length, 2);
flow.u.isHost = true; flow.u.id = 'host'; flow.u.matchId = 'actual-match';
const retryStart = source.indexOf('function Fa_syncLateJoin(){'), retryEnd = source.indexOf('\nfunction wa(', retryStart);
vm.runInContext(`${source.slice(retryStart, retryEnd)};Fa_syncLateJoin()`, flow);
assert.equal(starts.length, 1, 'pending client receives start even though it already exists in the roster');
flow.matchEntry.acknowledge('client', { matchId: 'actual-match' }, 'actual-match');
vm.runInContext('Fa_syncLateJoin()', flow);
assert.equal(starts.length, 1, 'acknowledged clients no longer receive repeated start');
console.log('PASS: shipped start handler acknowledges duplicates without reset; host retry stops on acknowledgement');
