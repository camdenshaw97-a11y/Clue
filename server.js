'use strict';
/*
 * Friend Clue server.
 * One process holds every room in memory. The TV page creates a room, phones join it with a
 * 4-letter code, and the server is the single source of truth: every change is pushed to every
 * screen as a fresh snapshot. Secrets stay here: each phone is only ever sent its own cards, the
 * cards shown to it, and its own notebook. Nobody's phone is ever sent the case file until the
 * game is over (or until they open it with a wrong accusation, like the real game).
 *
 * Built the same way as Friend Feud, Jeopardy, Wheel and Monopoly: the same join flow, the same
 * reconnect and restart-survival tricks. There is no host: the TV computer picks the board, the
 * dice and how much the notebook fills itself in, and every phone plays.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const { WebSocketServer } = require('ws');
const QRCode = require('qrcode');
const Boards = require('./boards');

const PORT = process.env.PORT || 3000;
const PUB = __dirname;
// Only the page files are ever handed to a browser.
const PAGE_FILES = new Set(['index.html', 'tv.html', 'common.js', 'boards.js', 'decor.js', 'icons.js', 'editor.js', 'style.css', 'anton.woff2', 'special-elite.woff2', 'baskerville.woff2', 'baskerville-italic.woff2', 'baskerville-bold.woff2']);
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.json': 'application/json'
};

// A fingerprint of the pages as they are right now, so a screen left open across an update reloads itself.
const BUILD = (() => {
  const h = crypto.createHash('sha1');
  for (const f of ['index.html', 'tv.html', 'common.js', 'boards.js', 'decor.js', 'icons.js', 'editor.js', 'style.css']) {
    try { h.update(fs.readFileSync(path.join(PUB, f))); } catch (e) { /* missing file: nothing to add */ }
  }
  return h.digest('hex').slice(0, 12);
})();

/* ---------------------------------------------------------------- rules */

const MAX_PLAYERS = 6;                 // one per suspect
const MIN_PLAYERS = 2;
const BOT_NAMES = ['SLEUTH', 'GUMSHOE', 'HUNCH', 'ALIBI', 'MOTIVE', 'TRACER'];
const BOT_MS = 1300;                   // a bot thinks this long before it does anything
const DICE_CHOICES = [2, 1];           // two dice (today's edition) or one die (the vintage classic)
const NOTE_CHOICES = ['basic', 'full', 'off'];
const TURN_CHOICES = [0, 60, 90, 120]; // a clock for each move and each card to show (0 = no clock)
const BOT_CHOICES = ['casual', 'sharp']; // casual bots only work from what was shown to them; sharp ones read the whole table

const SPEED = Number(process.env.SPEED_UP) || 1;   // tests run the clocks faster
const INTRO_MS = 9500;                 // the story and the deal, before the first turn
const STEP_MS = 165;                   // a piece walks one square in this long on the TV
const MOVE_EXTRA_MS = 650;
const PASSAGE_MS = 1700;
const SUGGEST_MS = 3400;               // the suggestion stays up on the TV before the questioning starts
const PASS_MS = 1300;                  // "can't disprove it" stays up this long before the next player
const RESULT_MS = 3200;                // a card was shown
const NOBODY_MS = 4200;                // nobody could disprove it
const ACCUSE_MS = 5600;                // the drum roll before the envelope opens
const WRONG_MS = 4600;                 // a wrong accusation stays up this long
const IDLE_MS = 25000;                 // a player whose phone dropped is played for after this
const ROOM_IDLE_MS = 6 * 60 * 60 * 1000;

// Surviving a restart: the TV keeps a sealed copy of its room and hands it back if it ever
// reconnects to a server that has forgotten it (see packRoom and restoreRoom). The same sealed
// copy, kept on purpose, is a saved game that can be picked up another night.
const BOOT = Date.now();
const RESTORE_WINDOW_MS = Number(process.env.RESTORE_WINDOW_MS) || 10 * 60 * 1000;
const RESTORE_GRACE_MS = 5000;
const SEAT_HOLD_MS = Number(process.env.SEAT_HOLD_MS) || 30000;
const STRAGGLER_MS = Number(process.env.STRAGGLER_MS) || 3 * 60 * 1000;
const BACKUP_V = 1;
const BACKUP_DELAY_MS = 200;
const BACKUP_MAX = 380 * 1024;
const BACKUP_KEY = (() => {
  let seed = process.env.BACKUP_KEY || process.env.RENDER_SERVICE_ID;
  if (!seed) {
    const file = path.join(__dirname, '.backup-key');
    try { seed = fs.readFileSync(file, 'utf8').trim(); } catch (e) { /* first run */ }
    if (!seed) {
      seed = crypto.randomBytes(32).toString('hex');
      try { fs.writeFileSync(file, seed + '\n', { mode: 0o600 }); } catch (e) { /* read-only disk */ }
    }
  }
  return crypto.createHash('sha256').update('friend-clue room backup|' + seed).digest();
})();

const DEFAULT_SETTINGS = { theme: 'classic', dice: 2, notes: 'basic', turnSecs: 0, bots: 'casual' };
const rooms = new Map();

/* ------------------------------------------------------------------ http */

const server = http.createServer((req, res) => {
  let u;
  try { u = new URL(req.url, 'http://localhost'); } catch (e) { res.writeHead(400); return res.end(); }
  let p;
  try { p = decodeURIComponent(u.pathname); } catch (e) { res.writeHead(400); return res.end(); }
  if (p === '/health') { res.writeHead(200, { 'content-type': 'text/plain' }); return res.end('ok'); }
  if (p === '/version') { res.writeHead(200, { 'content-type': 'text/plain', 'cache-control': 'no-store' }); return res.end(BUILD); }
  if (p === '/uptime') {
    res.writeHead(200, { 'content-type': 'text/plain', 'cache-control': 'no-store' });
    return res.end('started ' + new Date(BOOT).toISOString() + ' · up ' + Math.round((Date.now() - BOOT) / 1000) + 's');
  }
  if (p === '/qr.svg') {
    const text = (u.searchParams.get('u') || '').slice(0, 300);
    return QRCode.toString(text || ' ', { type: 'svg', margin: 1, errorCorrectionLevel: 'L' }, (err, svg) => {
      if (err) { res.writeHead(500); return res.end(); }
      res.writeHead(200, { 'content-type': 'image/svg+xml', 'cache-control': 'public, max-age=3600' });
      res.end(svg);
    });
  }
  if (p === '/') p = '/index.html';
  if (p === '/tv') p = '/tv.html';
  const rel = p.replace(/^\/+/, '');
  if (!PAGE_FILES.has(rel)) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('Not found'); }
  const file = path.join(PUB, rel);
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('Not found'); }
    const ext = path.extname(file);
    if (ext === '.html') data = Buffer.from(String(data).replace('<html lang="en">', '<html lang="en" data-build="' + BUILD + '">'));
    res.writeHead(200, {
      'content-type': MIME[ext] || 'application/octet-stream',
      'cache-control': ext === '.woff2' ? 'public, max-age=604800' : 'no-cache'
    });
    res.end(data);
  });
});

/* --------------------------------------------------------------- helpers */

const rid = (n = 12) => crypto.randomBytes(n).toString('base64url');
const die = () => crypto.randomInt(6) + 1;

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeCode() {
  const letters = 'BCDFGHJKLMNPQRSTVWXZ';
  for (;;) {
    let c = '';
    for (let i = 0; i < 4; i++) c += letters[crypto.randomInt(letters.length)];
    if (!rooms.has(c)) return c;
  }
}

function clean(s, max) {
  return String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

// The casts the TV made up.
function cleanCustom(c) {
  const out = { boards: [] };
  if (!c || typeof c !== 'object') return out;
  const seen = new Set();
  for (const x of (Array.isArray(c.boards) ? c.boards.slice(0, 12) : [])) {
    const t = Boards.customTheme(x);
    if (t && !seen.has(t.id)) { seen.add(t.id); out.boards.push(t); }
  }
  return out;
}

function send(ws, msg) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg));
}

/* ----------------------------------------------------------------- rooms */

function newRoom() {
  const room = {
    code: makeCode(),
    adminToken: rid(),
    touched: Date.now(),
    displays: new Set(),
    players: new Map(),
    order: [],            // players, in the order they joined
    settings: Object.assign({}, DEFAULT_SETTINGS),
    custom: { boards: [] },
    chats: {},            // private messages, by 'id|id' pair (ids sorted)
    game: null,
    fx: [],
    fxSeq: 0,
    timer: null,          // the one action clock (see armTimer)
    botTimer: null
  };
  rooms.set(room.code, room);
  return room;
}

function fx(room, type, data) {
  room.fx.push(Object.assign({ seq: ++room.fxSeq, type }, data || {}));
  if (room.fx.length > 16) room.fx.shift();
}

const pname = (room, id) => { const p = room.players.get(id); return p ? p.name : '?'; };
const seats = room => room.order.filter(id => room.players.has(id));
// The first person to join runs the lobby from their phone too (Start, Play again). Settings live on the TV.
const captainId = room => seats(room).find(id => !room.players.get(id).bot) || null;
const themeOf = room => Boards.themeById(room.game ? room.game.theme : room.settings.theme, room.custom.boards);
const cname = (room, c) => Boards.cardName(themeOf(room), c);
const sname = (room, i) => Boards.cardName(themeOf(room), 'S' + i);
const rname = (room, i) => Boards.cardName(themeOf(room), 'R' + i);
const rthe = (room, i) => Boards.roomThe(themeOf(room), i);
const wthe = (room, i) => Boards.weaponThe(themeOf(room), i);

/* ---------------------------------------------------- surviving a restart */

function packRoom(room, lean, kind) {
  const data = {
    v: BACKUP_V, at: Date.now(), kind: kind || 'backup', code: room.code, adminToken: room.adminToken,
    players: [...room.players.values()].map(p => ({ id: p.id, token: p.token, name: p.name, suspect: p.suspect, bot: !!p.bot })),
    order: room.order, settings: room.settings, custom: room.custom, chats: lean ? {} : room.chats,
    game: room.game, fxSeq: room.fxSeq
  };
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', BACKUP_KEY, iv);
  const body = Buffer.concat([c.update(zlib.deflateRawSync(JSON.stringify(data))), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), body]).toString('base64');
}

function unpackRoom(blob) {
  const raw = Buffer.from(String(blob), 'base64');
  if (raw.length < 30) throw new Error('too short');
  const d = crypto.createDecipheriv('aes-256-gcm', BACKUP_KEY, raw.subarray(0, 12), { authTagLength: 16 });
  d.setAuthTag(raw.subarray(12, 28));
  const body = Buffer.concat([d.update(raw.subarray(28)), d.final()]);
  return JSON.parse(zlib.inflateRawSync(body, { maxOutputLength: 16 * 1024 * 1024 }));
}

function sendBackup(room) {
  if (rooms.get(room.code) !== room) return;
  const to = [...room.displays].filter(ws => ws.admin && ws.readyState === 1);
  if (!to.length) return;
  let blob;
  try {
    blob = packRoom(room, false);
  } catch (e) { return console.error('backup error', e); }
  if (blob.length > BACKUP_MAX) return;
  const msg = JSON.stringify({ t: 'backup', code: room.code, blob, info: saveInfo(room) });
  for (const ws of to) ws.send(msg);
}

function queueBackup(room) {
  if (room.backupTimer) return;
  room.backupTimer = setTimeout(() => { room.backupTimer = null; sendBackup(room); }, BACKUP_DELAY_MS);
}

// What a saved game looks like in the TV's list.
function saveInfo(room) {
  const g = room.game;
  return {
    at: Date.now(), players: seats(room).map(id => pname(room, id)), theme: themeOf(room).name,
    phase: g ? g.phase : 'lobby', turns: g ? g.turnCount || 0 : 0,
    suggestions: g ? g.history.length : 0
  };
}

function hydrateRoom(d, code, opts) {
  const room = {
    code, adminToken: opts.adminToken, touched: Date.now(), displays: new Set(), players: new Map(),
    order: d.order || [], settings: Object.assign({}, DEFAULT_SETTINGS, d.settings),
    custom: cleanCustom(d.custom), chats: d.chats && typeof d.chats === 'object' ? d.chats : {}, game: d.game, fx: [], fxSeq: (d.fxSeq || 0) + 50, timer: null, botTimer: null
  };
  const hold = Date.now() + SEAT_HOLD_MS;
  for (const p of d.players) {
    if (p.bot) room.players.set(p.id, { id: p.id, token: p.token, name: p.name, suspect: p.suspect, bot: true, connected: true, ws: null, hold: 0, goneAt: 0 });
    else room.players.set(p.id, { id: p.id, token: opts.freshTokens ? rid() : p.token, name: p.name, suspect: p.suspect, connected: false, ws: null, hold: opts.freshTokens ? 0 : hold, goneAt: Date.now(), waitingFor: true });
  }
  const g = room.game;
  if (g && g.clock) {
    // The clock stood still while the server was away: give it back its time, plus a moment to reconnect.
    const used = Math.max(0, Math.min(Number(opts.idle) || 0, 10 * 60 * 1000));
    g.clock.at = Date.now() + Math.max(0, g.clock.at - d.at - used) + RESTORE_GRACE_MS;
    if (opts.freshTokens) freshClock(room);
  }
  if (g && opts.freshTokens) g.started = Date.now() - (g.played || 0);
  return room;
}

function restoreRoom(blob, code, token, idle) {
  let d;
  try { d = unpackRoom(blob); } catch (e) { return null; }
  if (!d || d.v !== BACKUP_V || d.code !== code || !token || d.adminToken !== token) return null;
  if (!(Date.now() - d.at < ROOM_IDLE_MS) || rooms.has(code)) return null;
  const room = hydrateRoom(d, code, { adminToken: d.adminToken, idle });
  try { publicState(room); } catch (e) { console.error('restore error', e); return null; }
  rooms.set(code, room);
  armTimer(room); scheduleBots(room);
  room.tidyTimer = setTimeout(() => {
    room.tidyTimer = null;
    if (rooms.get(code) !== room || room.game) return;
    let gone = 0;
    for (const p of [...room.players.values()]) if (!p.connected && !room.order.includes(p.id)) { room.players.delete(p.id); gone++; }
    if (gone) pushAll(room);
  }, STRAGGLER_MS);
  fx(room, 'restored');
  console.log('restored room ' + code + ' (' + room.players.size + ' players, ' + (room.game ? room.game.phase : 'lobby') + ')');
  return room;
}

// A saved game from another night comes back as a brand-new room. Everyone joins again with
// the same name and gets their seat (and their cards and notebook) back.
function loadRoom(blob) {
  let d;
  try { d = unpackRoom(blob); } catch (e) { return null; }
  if (!d || d.v !== BACKUP_V || !d.game) return null;
  const code = makeCode();
  const room = hydrateRoom(d, code, { adminToken: rid(), freshTokens: true });
  try { publicState(room); } catch (e) { console.error('load error', e); return null; }
  rooms.set(code, room);
  armTimer(room); scheduleBots(room);
  fx(room, 'loaded');
  console.log('loaded saved game as room ' + code);
  return room;
}

/* ------------------------------------------------------------ the clock */

function clearTimer(room) {
  if (room.timer) { clearTimeout(room.timer); room.timer = null; }
}

function setClock(room, what, ms, show) {
  ms = Math.round(ms / SPEED);
  room.game.clock = { what, at: Date.now() + ms, len: ms, show: !!show };
  armTimer(room);
}
function stopClock(room) {
  if (room.game) room.game.clock = null;
  clearTimer(room);
}

// One action clock per room: whatever the game is waiting for next.
function armTimer(room) {
  clearTimer(room);
  const g = room.game;
  if (!g || !g.clock) return;
  const c = g.clock;
  room.timer = setTimeout(() => {
    room.timer = null;
    if (room.game !== g || g.clock !== c) return;
    g.clock = null;
    try { onClock(room, c.what); } catch (e) { console.error('clock error', e); }
    pushAll(room);
  }, Math.max(0, c.at - Date.now()));
}

function onClock(room, what) {
  switch (what) {
    case 'intro': firstTurn(room); break;
    case 'arrive': arrive(room); break;
    case 'ask': ask(room); break;
    case 'result': afterSuggestion(room); break;
    case 'verdict': verdict(room); break;
    case 'next': nextTurn(room); break;
    case 'auto': autoAct(room, true); break;
  }
}

// The clock a phase starts with, for a game picked up again.
function freshClock(room) {
  const g = room.game;
  g.clock = null;
  switch (g.phase) {
    case 'intro': setClock(room, 'intro', INTRO_MS); break;
    case 'moving': setClock(room, 'arrive', 800); break;
    case 'suggest': if (g.sugg && g.sugg.waiting) turnClock(room); else setClock(room, 'ask', PASS_MS); break;
    case 'result': setClock(room, 'result', 1500); break;
    case 'accuse': setClock(room, 'verdict', ACCUSE_MS); break;
    case 'wrong': setClock(room, 'next', 2000); break;
    case 'turn': turnClock(room); break;
    default: armTimer(room);
  }
}

function turnClock(room) {
  const secs = room.settings.turnSecs;
  if (!secs) { stopClock(room); return; }
  setClock(room, 'auto', secs * 1000, true);
}

/* ------------------------------------------------------------ the game */

const P = (g, id) => g.players[id];
// Still taking turns: not out on a wrong accusation and still at the table.
const active = g => g.order.filter(id => !g.players[id].out && !g.players[id].left);
const pawnAt = (g, s) => g.pawns[s];
const myPawn = (g, id) => g.pawns[P(g, id).suspect];

function log(room, text, kind, data) {
  const g = room.game;
  g.log.push(Object.assign({ n: ++g.logSeq, text, kind: kind || '' }, data || {}));
  if (g.log.length > 80) g.log.shift();
}

function startGame(room) {
  const ids = seats(room);
  if (ids.length < MIN_PLAYERS || ids.length > MAX_PLAYERS) return;
  const theme = Boards.themeById(room.settings.theme, room.custom.boards);
  // Everyone sits where their suspect starts: the first suspect plays first, then clockwise.
  const order = ids.slice().sort((a, b) => room.players.get(a).suspect - room.players.get(b).suspect);
  // The case file: one suspect, one weapon, one room, nobody looking.
  const pile = k => shuffle(Boards.CARDS.filter(c => c[0] === k));
  const sus = pile('S'), wea = pile('W'), rms = pile('R');
  const solution = { s: sus.pop(), w: wea.pop(), r: rms.pop() };
  const deck = shuffle(sus.concat(wea, rms));
  const hands = {};
  for (const id of order) hands[id] = [];
  deck.forEach((c, k) => hands[order[k % order.length]].push(c));
  const players = {};
  for (const id of order) {
    hands[id].sort((a, b) => Boards.CARDS.indexOf(a) - Boards.CARDS.indexOf(b));
    players[id] = { suspect: room.players.get(id).suspect, out: false, left: false, movedIn: -1, knows: false, notes: {}, seen: [], showedTo: {}, stats: { suggest: 0, shown: 0, stumped: 0, dragged: 0, steps: 0 } };
  }
  // The weapons start in six different rooms.
  const wroom = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, 6);
  room.game = {
    phase: 'intro', theme: theme.id, dice: room.settings.dice, notesMode: room.settings.notes, bots: room.settings.bots,
    order, cur: null, turnCount: 0, started: Date.now(), played: 0,
    pawns: Boards.STARTS.map(s => ({ x: s.x, y: s.y })),
    weapons: wroom,
    solution, hands,
    handSize: Object.fromEntries(order.map(id => [id, hands[id].length])),
    players, turn: null, sugg: null, acc: null,
    history: [], revealed: [], log: [], logSeq: 0, clock: null,
    winner: null, why: null, awards: null
  };
  const g = room.game;
  for (const id of order) for (const c of hands[id]) autoNote(g, id, c, id, true);
  for (const id of order) for (const c of Boards.CARDS) if (!hands[id].includes(c)) setMark(g, id, c, id, 'x');
  log(room, theme.victim + ' is dead. Somebody in this room knows who did it.', 'start');
  fx(room, 'start');
  setClock(room, 'intro', INTRO_MS);
}

/* -------- turns */

function firstTurn(room) {
  const g = room.game;
  g.cur = active(g)[0] || null;
  if (!g.cur) return endGame(room, 'nobody');
  log(room, pname(room, g.cur) + ' (' + sname(room, P(g, g.cur).suspect) + ') goes first.', 'turn');
  startTurn(room);
}

// Other pieces block hallway squares (pieces in rooms don't block anything).
function blockedFor(g, s) {
  const b = {};
  g.pawns.forEach((at, k) => { if (k !== s && at && at.r == null) b[Boards.key(at.x, at.y)] = 1; });
  return b;
}

function startTurn(room) {
  const g = room.game, id = g.cur, me = P(g, id), at = myPawn(g, id);
  g.phase = 'turn'; g.sugg = null; g.acc = null;
  g.turnCount++;
  const inRoom = at.r != null ? at.r : -1;
  const any = Boards.reach(at, 99, blockedFor(g, me.suspect), -1).some(o => o.steps != null);
  const passage = inRoom >= 0 && Boards.ROOMS[inRoom].passage != null ? Boards.ROOMS[inRoom].passage : -1;
  g.turn = {
    rolled: false, roll: null, opts: null, moved: false, entered: -1, suggested: false, from: inRoom,
    passage, stuck: !any && passage < 0,
    // Dragged here by someone else's suggestion: you may suggest in this room without moving.
    stay: inRoom >= 0 && me.movedIn === inRoom
  };
  if (g.turn.stuck) log(room, pname(room, id) + ' is boxed in: every way out is blocked.', 'turn');
  fx(room, 'turn', { pid: id });
  turnClock(room);
}

function nextTurn(room) {
  const g = room.game;
  if (!g || g.phase === 'gameOver') return;
  const live = active(g);
  if (!live.length) return endGame(room, 'nobody');
  if (g.cur && P(g, g.cur)) P(g, g.cur).movedIn = -1;
  const i = g.order.indexOf(g.cur);
  for (let k = 1; k <= g.order.length; k++) {
    const id = g.order[(i + k) % g.order.length];
    if (live.includes(id)) { g.cur = id; break; }
  }
  startTurn(room);
}

const isTurn = (g, p) => g && g.phase === 'turn' && g.cur === p.id;

function doRoll(room, p) {
  const g = room.game;
  if (!isTurn(g, p) || g.turn.rolled || g.turn.moved || g.turn.suggested) return;
  const me = P(g, p.id), at = myPawn(g, p.id);
  const d = []; for (let k = 0; k < g.dice; k++) d.push(die());
  const total = d.reduce((a, b) => a + b, 0);
  g.turn.rolled = true; g.turn.roll = d; g.turn.stay = false;
  me.movedIn = -1;
  g.turn.opts = Boards.reach(at, total, blockedFor(g, me.suspect), g.turn.from);
  if (!g.turn.opts.some(o => o.steps != null && o.path.length)) g.turn.stuck = true;
  log(room, pname(room, p.id) + ' rolled ' + (d.length > 1 ? d.join(' + ') + ' = ' : '') + total + '.', 'roll');
  fx(room, 'roll', { pid: p.id, d });
  if (g.turn.stuck) log(room, 'Every way out is blocked. ' + pname(room, p.id) + ' stays put.', 'turn');
  turnClock(room);
}

// Walk to a room (or as far toward it as the roll goes).
function go(room, p, r) {
  const g = room.game;
  if (!isTurn(g, p) || !g.turn.rolled || g.turn.moved || !g.turn.opts) return;
  const o = g.turn.opts.find(x => x.r === Number(r));
  if (!o || o.steps == null || (!o.reach && !o.path.length)) return;
  const me = P(g, p.id), s = me.suspect;
  const to = o.reach ? { r: o.r } : { x: o.path[o.path.length - 1].x, y: o.path[o.path.length - 1].y };
  g.pawns[s] = to;
  g.turn.moved = true; g.turn.entered = o.reach ? o.r : -1; g.turn.opts = null;
  me.stats.steps += o.path.length + (o.reach ? 1 : 0);
  g.phase = 'moving';
  fx(room, 'move', { s, path: o.path, enter: o.reach ? o.r : -1 });
  if (o.reach) log(room, pname(room, p.id) + ' walks into ' + rthe(room, o.r) + '.', 'move');
  else log(room, pname(room, p.id) + ' heads toward ' + rthe(room, o.r) + '.', 'move');
  setClock(room, 'arrive', o.path.length * STEP_MS + MOVE_EXTRA_MS);
}

function passage(room, p) {
  const g = room.game;
  if (!isTurn(g, p) || g.turn.rolled || g.turn.moved || g.turn.suggested || g.turn.passage < 0) return;
  const me = P(g, p.id), from = g.turn.from, to = g.turn.passage;
  g.pawns[me.suspect] = { r: to };
  me.movedIn = -1;
  g.turn.moved = true; g.turn.entered = to; g.turn.stay = false;
  g.phase = 'moving';
  fx(room, 'passage', { s: me.suspect, from, to });
  log(room, pname(room, p.id) + ' takes the secret passage from ' + rthe(room, from) + ' to ' + rthe(room, to) + '.', 'move');
  setClock(room, 'arrive', PASSAGE_MS);
}

function arrive(room) {
  const g = room.game;
  g.phase = 'turn';
  if (g.turn && g.turn.entered >= 0) fx(room, 'enter', { pid: g.cur, r: g.turn.entered });
  turnClock(room);
}

function endTurn(room, p) {
  const g = room.game;
  if (!isTurn(g, p)) return;
  const t = g.turn;
  if (!(t.moved || t.suggested || t.stuck || t.stay)) return;
  nextTurn(room);
}

/* -------- suggestions */

function canSuggest(g, id) {
  if (!g || g.phase !== 'turn' || g.cur !== id) return false;
  const t = g.turn, at = myPawn(g, id);
  if (t.suggested || at.r == null) return false;
  return t.entered === at.r || (t.stay && !t.rolled && !t.moved);
}

function suggest(room, p, s, w) {
  const g = room.game;
  if (!canSuggest(g, p.id)) return;
  s = Number(s); w = Number(w);
  if (!(s >= 0 && s < 6 && w >= 0 && w < 6)) return;
  const me = P(g, p.id), r = myPawn(g, p.id).r;
  g.turn.suggested = true; g.turn.stay = false;
  me.movedIn = -1;
  me.stats.suggest++;
  // The named suspect and weapon are brought into the room.
  const before = g.pawns[s];
  const dragged = !(before.r === r);
  g.pawns[s] = { r };
  g.weapons[w] = r;
  const victim = g.order.find(id => P(g, id).suspect === s && id !== p.id);
  if (victim && dragged) { P(g, victim).movedIn = r; P(g, victim).stats.dragged++; }
  // Everyone after you, in turn order, is asked in turn. Players out on a wrong accusation still
  // answer; players who left the table have their cards face up, so there's nothing to ask.
  const i = g.order.indexOf(p.id), ask = [];
  for (let k = 1; k < g.order.length; k++) { const id = g.order[(i + k) % g.order.length]; if (!P(g, id).left) ask.push(id); }
  g.sugg = { by: p.id, s: 'S' + s, w: 'W' + w, r: 'R' + r, ask, i: -1, passes: [], shower: null, waiting: false, nobody: false, n: g.history.length + 1 };
  g.phase = 'suggest';
  log(room, pname(room, p.id) + ' suggests ' + sname(room, s) + ', in ' + rthe(room, r) + ', with ' + wthe(room, w) + '.', 'suggest');
  fx(room, 'suggest', { pid: p.id, s, w, r, dragged: dragged ? s : -1 });
  setClock(room, 'ask', SUGGEST_MS);
}

const matching = (g, id, sg) => g.hands[id].filter(c => c === sg.s || c === sg.w || c === sg.r);

function ask(room) {
  const g = room.game, sg = g.sugg;
  if (!sg || g.phase !== 'suggest') return;
  sg.i++;
  if (sg.i >= sg.ask.length) {
    sg.nobody = true; sg.waiting = false; sg.asking = null;
    P(g, sg.by).stats.stumped++;
    record(room);
    log(room, 'Nobody could disprove it!', 'nobody');
    fx(room, 'nobody', { pid: sg.by });
    g.phase = 'result';
    return setClock(room, 'result', NOBODY_MS);
  }
  const id = sg.ask[sg.i];
  sg.asking = id;
  if (!matching(g, id, sg).length) {
    sg.passes.push(id);
    log(room, pname(room, id) + ' can’t disprove it.', 'pass');
    fx(room, 'pass', { pid: id });
    // With the notebook on its fullest setting, everyone notes that they have none of the three.
    if (g.notesMode === 'full') for (const v of g.order) if (v !== id) for (const c of [sg.s, sg.w, sg.r]) if (markOf(g, v, c, id) !== 'o') setMark(g, v, c, id, 'x');
    return setClock(room, 'ask', PASS_MS);
  }
  sg.waiting = true;
  fx(room, 'ask', { pid: id, by: sg.by });
  turnClock(room);
}

function show(room, p, card) {
  const g = room.game, sg = g && g.sugg;
  if (!sg || g.phase !== 'suggest' || !sg.waiting || sg.asking !== p.id) return;
  const mine = matching(g, p.id, sg);
  if (!mine.includes(card)) return;
  stopClock(room);
  sg.waiting = false; sg.shower = p.id;
  const by = P(g, sg.by);
  by.seen.push({ card, from: p.id, n: sg.n });
  const st = P(g, p.id);
  st.stats.shown++;
  (st.showedTo[sg.by] = st.showedTo[sg.by] || []).includes(card) || st.showedTo[sg.by].push(card);
  autoNote(g, sg.by, card, p.id);
  record(room);
  log(room, pname(room, p.id) + ' shows ' + pname(room, sg.by) + ' a card.', 'show');
  fx(room, 'shown', { from: p.id, to: sg.by });
  g.phase = 'result';
  setClock(room, 'result', RESULT_MS);
}

// The suggestion goes into everyone's history: what was asked, who passed, who showed.
function record(room) {
  const g = room.game, sg = g.sugg;
  g.history.push({ n: sg.n, by: sg.by, s: sg.s, w: sg.w, r: sg.r, passes: sg.passes.slice(), shower: sg.shower, nobody: sg.nobody });
  if (g.history.length > 200) g.history.shift();
}

function afterSuggestion(room) {
  const g = room.game;
  g.phase = 'turn';
  g.sugg = null;
  if (!g.cur || P(g, g.cur).left || P(g, g.cur).out) return nextTurn(room);
  turnClock(room);
}

/* -------- accusations */

function accuse(room, p, s, w, r) {
  const g = room.game;
  if (!isTurn(g, p)) return;
  s = Number(s); w = Number(w); r = Number(r);
  if (!(s >= 0 && s < 6 && w >= 0 && w < 6 && r >= 0 && r < 9)) return;
  const sol = g.solution;
  const right = [sol.s === 'S' + s, sol.w === 'W' + w, sol.r === 'R' + r];
  g.acc = { by: p.id, s: 'S' + s, w: 'W' + w, r: 'R' + r, ok: right.every(Boolean), right: right.filter(Boolean).length, done: false };
  g.phase = 'accuse';
  log(room, pname(room, p.id) + ' makes an accusation: ' + sname(room, s) + ', in ' + rthe(room, r) + ', with ' + wthe(room, w) + '!', 'accuse');
  fx(room, 'accuse', { pid: p.id });
  setClock(room, 'verdict', ACCUSE_MS);
}

function verdict(room) {
  const g = room.game, a = g.acc;
  if (!a || g.phase !== 'accuse') return;
  a.done = true;
  if (a.ok) return endGame(room, 'solved', a.by);
  const me = P(g, a.by);
  me.out = true; me.knows = true; me.wrong = a.right;
  // A wrong accuser stays at the table and keeps answering, but stops moving. If their piece
  // blocks a doorway it steps into that room.
  const at = g.pawns[me.suspect];
  if (at.r == null) { const dr = Boards.doorOf(at.x, at.y); if (dr >= 0) g.pawns[me.suspect] = { r: dr }; }
  log(room, 'Wrong! ' + pname(room, a.by) + ' is out, but still has to show cards.', 'wrong');
  fx(room, 'wrong', { pid: a.by, right: a.right });
  if (!active(g).length) return endGame(room, 'nobody');
  g.phase = 'wrong';
  setClock(room, 'next', WRONG_MS);
}

/* -------- the notebook */

const markOf = (g, viewer, c, col) => ((P(g, viewer).notes[c] || {})[col]) || '';
function setMark(g, viewer, c, col, m) {
  const notes = P(g, viewer).notes;
  const row = notes[c] || (notes[c] = {});
  if (m) row[col] = m; else delete row[col];
}
// What you'd write down anyway: a card you hold or were shown is ticked under whoever has it
// and crossed out under everyone else. `force` writes it even with the notebook help off (your
// own hand on the deal is always written in).
function autoNote(g, viewer, c, holder, force) {
  if (g.notesMode === 'off' && !force) return;
  for (const col of g.order) setMark(g, viewer, c, col, col === holder ? 'o' : 'x');
}

function note(room, p, m) {
  const g = room.game;
  if (!g || !g.players[p.id]) return;
  const c = String(m.c || ''), col = String(m.p || ''), mark = String(m.m || '');
  if (!Boards.validCard(c) || !g.order.includes(col) || !['', 'x', 'o', '?'].includes(mark)) return;
  setMark(g, p.id, c, col, mark);
  P(g, p.id).notesAt = Date.now();
}

/* -------- the end */

function endGame(room, why, winner) {
  const g = room.game;
  stopClock(room);
  g.phase = 'gameOver'; g.why = why; g.winner = winner || null; g.sugg = null;
  g.played = Date.now() - g.started;
  g.awards = awards(room);
  const sol = g.solution, t = themeOf(room);
  const said = Boards.cardName(t, sol.s) + ', in ' + Boards.roomThe(t, Boards.cardIndex(sol.r)) + ', with ' + Boards.weaponThe(t, Boards.cardIndex(sol.w)) + '.';
  if (why === 'solved') log(room, pname(room, winner) + ' solved it! It was ' + said, 'win');
  else log(room, 'Nobody solved it. It was ' + said, 'win');
  fx(room, 'win', { pid: g.winner, why });
}

function awards(room) {
  const g = room.game;
  const rows = g.order.map(id => ({ id, name: pname(room, id), s: P(g, id).stats, p: P(g, id) }));
  const out = [];
  const top = (key, min) => rows.filter(r => r.s[key] >= (min || 1)).sort((a, b) => b.s[key] - a.s[key])[0];
  const wall = top('shown', 2);
  if (wall) out.push({ key: 'stonewall', title: 'STONEWALL', id: wall.id, name: wall.name, note: wall.s.shown + ' cards shown' });
  const wanted = top('dragged', 2);
  if (wanted) out.push({ key: 'wanted', title: 'MOST WANTED', id: wanted.id, name: wanted.name, note: 'dragged into a room ' + wanted.s.dragged + ' times' });
  const nosy = top('suggest', 3);
  if (nosy && (!g.winner || nosy.id !== g.winner)) out.push({ key: 'nosy', title: 'NOSY NEIGHBOR', id: nosy.id, name: nosy.name, note: nosy.s.suggest + ' suggestions' });
  const close = rows.filter(r => r.p.out && r.p.wrong === 2)[0];
  if (close) out.push({ key: 'close', title: 'SO CLOSE', id: close.id, name: close.name, note: 'two out of three on the accusation' });
  const walker = top('steps', 25);
  if (walker) out.push({ key: 'walker', title: 'MARATHON', id: walker.id, name: walker.name, note: walker.s.steps + ' squares walked' });
  // Spread the awards around: one each, as far as it goes.
  const got = new Set(), spread = [];
  for (const a of out) if (!got.has(a.id)) { got.add(a.id); spread.push(a); }
  return spread.slice(0, 4);
}

/* -------- playing for a phone that isn't there */

// Who the game is waiting on right now.
function actor(g) {
  if (!g) return null;
  if (g.phase === 'turn') return g.cur;
  if (g.phase === 'suggest' && g.sugg && g.sugg.waiting) return g.sugg.asking;
  return null;
}

function autoAct(room, force) {
  const g = room.game, id = actor(g);
  if (!id) return false;
  const p = room.players.get(id);
  if (!p) return false;
  // Someone who hasn't come back since the game was picked up gets much longer before the game plays for them.
  const idle = (p.waitingFor ? IDLE_MS * 7 : IDLE_MS) / SPEED;
  if (!force && (p.bot || p.connected || !p.goneAt || Date.now() - p.goneAt < idle)) return false;
  if (!force) fx(room, 'auto', { pid: id });
  if (g.phase === 'suggest') {
    const cards = matching(g, id, g.sugg);
    log(room, pname(room, id) + (force ? ' ran out of time' : ' is away') + ': the game picks a card to show.', 'auto');
    show(room, p, cards[crypto.randomInt(cards.length)]);
    return true;
  }
  const t = g.turn;
  if (!t.rolled && !t.moved && !t.suggested && !t.stuck && !t.stay) {
    log(room, pname(room, id) + (force ? ' ran out of time' : ' is away') + ': the game rolls for them.', 'auto');
    doRoll(room, p);
    if (!t.stuck) go(room, p, nearest(t.opts).r);
    return true;
  }
  if (t.rolled && !t.moved && !t.stuck) { go(room, p, nearest(t.opts).r); return true; }
  log(room, pname(room, id) + (force ? ' ran out of time.' : ' is away: the game ends their turn.'), 'auto');
  nextTurn(room);
  return true;
}
const nearest = opts => opts.filter(o => o.steps != null && (o.reach || o.path.length)).sort((a, b) => a.steps - b.steps)[0];

/* -------- private messages between two phones */

const chatKey = (a, b) => [a, b].sort().join('|');

function chat(room, p, m) {
  const to = String(m.to || ''), other = room.players.get(to);
  if (!other || other === p || other.bot) return;
  const text = clean(m.text, 240);
  if (!text) return;
  const k = chatKey(p.id, to);
  const list = room.chats[k] || (room.chats[k] = []);
  list.push({ from: p.id, text, at: Date.now() });
  if (list.length > 60) list.shift();
}

function chatsFor(room, pid) {
  const out = {};
  for (const k of Object.keys(room.chats)) {
    const [a, b] = k.split('|');
    if (a === pid || b === pid) out[a === pid ? b : a] = room.chats[k];
  }
  return out;
}

/* -------- bots: detectives the TV adds, who keep a proper notebook */

function addBot(room) {
  if (room.game || seats(room).length >= MAX_PLAYERS) return;
  const used = new Set([...room.players.values()].map(p => p.name));
  const name = BOT_NAMES.find(n => !used.has(n)) || ('BOT ' + crypto.randomInt(100, 999));
  const p = { id: rid(6), token: rid(), name, suspect: freeSuspect(room), bot: true, connected: true, ws: null, hold: 0, goneAt: 0 };
  room.players.set(p.id, p);
  room.order.push(p.id);
  fx(room, 'joined', { name: p.name, pid: p.id, bot: true });
}

const isBot = (room, id) => { const p = room.players.get(id); return !!(p && p.bot); };

/*
 * What `me` can work out from everything they've seen: their own hand, the cards shown to them,
 * the cards of anyone who left, who couldn't disprove what, and who showed a card to whom (they
 * hold one of those three). Returns the holder of every card it can pin down ('env' for the case
 * file).
 */
function deduce(g, me, casual) {
  const ids = g.order, has = {}, not = {};
  for (const id of ids) not[id] = new Set();
  const own = g.hands[me];
  for (const c of own) has[c] = me;
  for (const c of Boards.CARDS) if (!own.includes(c)) not[me].add(c);
  for (const x of g.revealed) has[x.c] = x.from;
  for (const s of P(g, me).seen) has[s.card] = s.from;
  const clauses = [];
  for (const h of g.history) {
    // A casual bot only pays attention to its own suggestions.
    if (casual && h.by !== me) continue;
    for (const id of h.passes) { not[id].add(h.s); not[id].add(h.w); not[id].add(h.r); }
    if (h.shower && h.by !== me && h.shower !== me) clauses.push({ id: h.shower, cards: [h.s, h.w, h.r] });
  }
  for (let loop = 0; loop < 30; loop++) {
    let changed = false;
    const give = (c, id) => { if (!has[c]) { has[c] = id; changed = true; } };
    for (const c of Object.keys(has)) if (has[c] !== 'env') for (const id of ids) if (id !== has[c] && !not[id].has(c)) { not[id].add(c); changed = true; }
    for (const id of ids) {
      const held = Boards.CARDS.filter(c => has[c] === id).length;
      if (held >= g.handSize[id]) for (const c of Boards.CARDS) if (has[c] !== id && !not[id].has(c)) { not[id].add(c); changed = true; }
    }
    for (const cl of clauses) {
      if (cl.done) continue;
      if (cl.cards.some(c => has[c] === cl.id)) { cl.done = true; continue; }
      const left = cl.cards.filter(c => !not[cl.id].has(c) && !(has[c] && has[c] !== cl.id));
      if (left.length === 1) { give(left[0], cl.id); cl.done = true; }
    }
    for (const c of Boards.CARDS) if (!has[c] && ids.every(id => not[id].has(c))) give(c, 'env');
    for (const k of ['S', 'W', 'R']) {
      const cat = Boards.CARDS.filter(c => c[0] === k);
      const open = cat.filter(c => !has[c]);
      if (open.length === 1 && !cat.some(c => has[c] === 'env')) give(open[0], 'env');
    }
    if (!changed) break;
  }
  return has;
}

function envOf(has) {
  const out = {};
  for (const c of Object.keys(has)) if (has[c] === 'env') out[c[0]] = c;
  return out;
}

// Something a bot should get round to?
function botHasWork(room) {
  const g = room.game;
  if (!g || g.phase === 'gameOver') return false;
  const a = actor(g);
  return !!(a && isBot(room, a));
}

function scheduleBots(room) {
  if (room.botTimer || !botHasWork(room)) return;
  room.botTimer = setTimeout(() => {
    room.botTimer = null;
    if (rooms.get(room.code) !== room) return;
    let changed = false;
    try { changed = botTick(room); } catch (e) { console.error('bot error', e); }
    if (changed) pushAll(room); else scheduleBots(room);
  }, (BOT_MS + crypto.randomInt(900)) / SPEED);
}

// Each bot plays a slightly different game thanks to a per-bot "nerve".
const nerve = (id, salt) => (crypto.createHash('sha1').update(id + '|' + (salt || '')).digest()[0] / 255);
const pick = a => a[crypto.randomInt(a.length)];

function botTick(room) {
  const g = room.game, id = actor(g);
  if (!id || !isBot(room, id)) return false;
  const p = room.players.get(id), me = P(g, id);
  if (g.phase === 'suggest') {
    const cards = matching(g, id, g.sugg);
    // Show the same card again to someone who's already seen it, so they learn nothing new.
    const again = cards.find(c => (me.showedTo[g.sugg.by] || []).includes(c));
    show(room, p, again || pick(cards));
    return true;
  }
  const has = deduce(g, id, g.bots === 'casual'), env = envOf(has), t = g.turn, at = myPawn(g, id);
  if (env.S && env.W && env.R) {
    accuse(room, p, Boards.cardIndex(env.S), Boards.cardIndex(env.W), Boards.cardIndex(env.R));
    return true;
  }
  // A room is worth visiting if we don't know where its card is, or it's the one in the case file.
  const useful = r => !has['R' + r] || has['R' + r] === 'env';
  if (canSuggest(g, id) && useful(at.r)) { botSuggest(room, p, has, env); return true; }
  if (!t.rolled && !t.moved && !t.suggested) {
    if (t.passage >= 0 && useful(t.passage) && !(at.r != null && useful(at.r) && t.stay)) { passage(room, p); return true; }
    if (!t.stuck) { doRoll(room, p); return true; }
  }
  if (t.rolled && !t.moved && !t.stuck) {
    const opts = t.opts.filter(o => o.steps != null && (o.reach || o.path.length));
    const good = opts.filter(o => useful(o.r));
    const inNow = good.filter(o => o.reach).sort((a, b) => a.steps - b.steps)[0];
    const target = inNow || good.sort((a, b) => a.steps - b.steps)[0] || opts.sort((a, b) => a.steps - b.steps)[0];
    if (target) { go(room, p, target.r); return true; }
  }
  nextTurn(room);
  return true;
}

function botSuggest(room, p, has, env) {
  const g = room.game, mine = g.hands[p.id];
  const choose = k => {
    if (env[k]) return env[k];                       // known: use it to pin down the others
    const unknown = Boards.CARDS.filter(c => c[0] === k && !has[c]);
    // Now and then a bot names one of its own cards to throw everyone off.
    const bluff = mine.filter(c => c[0] === k);
    if (bluff.length && crypto.randomInt(100) < 10 + nerve(p.id, 'bluff') * 15) return pick(bluff);
    return unknown.length ? pick(unknown) : pick(Boards.CARDS.filter(c => c[0] === k));
  };
  suggest(room, p, Boards.cardIndex(choose('S')), Boards.cardIndex(choose('W')));
}

/* ----------------------------------------------------- lobby and TV actions */

const suspectTaken = (room, s, except) => [...room.players.values()].some(x => x !== except && room.order.includes(x.id) && x.suspect === s);
function freeSuspect(room) {
  for (let s = 0; s < 6; s++) if (!suspectTaken(room, s, null)) return s;
  return 0;
}

function adminAction(room, m) {
  const g = room.game;
  switch (m.a) {
    case 'start': if (!g) startGame(room); return;
    case 'settings':
      if (g) return;
      if (typeof m.theme === 'string' && Boards.themeById(m.theme, room.custom.boards).id === m.theme) room.settings.theme = m.theme;
      if (DICE_CHOICES.includes(m.dice)) room.settings.dice = m.dice;
      if (NOTE_CHOICES.includes(m.notes)) room.settings.notes = m.notes;
      if (TURN_CHOICES.includes(m.turnSecs)) room.settings.turnSecs = m.turnSecs;
      if (BOT_CHOICES.includes(m.bots)) room.settings.bots = m.bots;
      return;
    case 'custom': if (!g) { room.custom = cleanCustom(m.custom); if (!room.custom.boards.some(b => b.id === room.settings.theme) && room.settings.theme.startsWith('custom:')) room.settings.theme = 'classic'; } return;
    case 'kick': {
      const x = room.players.get(m.id);
      if (x) dropPlayer(room, x, true);
      return;
    }
    case 'addBot': if (!g) addBot(room); return;
    case 'removeBot': {
      if (g) return;
      const bots = seats(room).map(id => room.players.get(id)).filter(x => x.bot);
      const x = m.id ? room.players.get(m.id) : bots[bots.length - 1];
      if (x && x.bot) dropPlayer(room, x, true);
      return;
    }
    case 'lobby':
      if (g) { stopClock(room); room.game = null; fx(room, 'lobby'); }
      return;
    case 'endGame':
      if (g && g.phase !== 'gameOver') endGame(room, 'early');
      return;
    case 'skipIntro':
      if (g && g.phase === 'intro') { stopClock(room); firstTurn(room); }
      return;
  }
}

/* ----------------------------------------------------------------- state */

function publicState(room) {
  const g = room.game;
  const pl = id => { const p = room.players.get(id); return p ? { id: p.id, name: p.name, on: p.connected, suspect: p.suspect, bot: !!p.bot } : null; };
  const t = themeOf(room);
  const s = {
    code: room.code,
    phase: g ? g.phase : 'lobby',
    players: (g ? g.order.filter(id => room.players.has(id)) : seats(room)).map(pl).filter(Boolean),
    captain: captainId(room),
    settings: room.settings,
    themes: Boards.THEMES.concat(room.custom.boards).map(x => ({ id: x.id, name: x.name, blurb: x.blurb, custom: !!x.custom, adult: !!x.adult })),
    theme: { id: t.id, name: t.name, look: t.look || t.id, victim: t.victim, story: t.story, suspects: t.suspects, weapons: t.weapons, rooms: t.rooms, adult: !!t.adult },
    minPlayers: MIN_PLAYERS, maxPlayers: MAX_PLAYERS, diceChoices: DICE_CHOICES, noteChoices: NOTE_CHOICES, turnChoices: TURN_CHOICES, botChoices: BOT_CHOICES,
    fx: room.fx,
    game: null
  };
  if (g) {
    const players = {};
    for (const id of g.order) {
      const p = g.players[id];
      players[id] = { suspect: p.suspect, out: p.out, left: p.left, cards: g.handSize[id], movedIn: p.movedIn, stats: p.stats };
    }
    const sg = g.sugg;
    s.game = {
      theme: g.theme, dice: g.dice, notesMode: g.notesMode, order: g.order, cur: g.cur, turnCount: g.turnCount,
      pawns: g.pawns, weapons: g.weapons, players,
      turn: g.turn ? { rolled: g.turn.rolled, roll: g.turn.roll, moved: g.turn.moved, entered: g.turn.entered, suggested: g.turn.suggested, from: g.turn.from, passage: g.turn.passage, stuck: g.turn.stuck, stay: g.turn.stay, reach: g.turn.opts && !g.turn.moved ? g.turn.opts.filter(o => o.reach).map(o => o.r) : [] } : null,
      sugg: sg ? { by: sg.by, s: sg.s, w: sg.w, r: sg.r, ask: sg.ask, i: sg.i, passes: sg.passes, shower: sg.shower, waiting: sg.waiting, asking: sg.asking || null, nobody: sg.nobody, n: sg.n } : null,
      acc: g.acc ? Object.assign({ by: g.acc.by, s: g.acc.s, w: g.acc.w, r: g.acc.r, done: g.acc.done }, g.acc.done ? { ok: g.acc.ok, right: g.acc.right } : {}) : null,
      history: g.history.slice(-60), revealed: g.revealed,
      clock: g.clock && g.clock.show ? { what: g.clock.what, left: Math.max(0, g.clock.at - Date.now()), len: g.clock.len } : null,
      elapsed: g.phase === 'gameOver' ? g.played : Date.now() - g.started,
      log: g.log.slice(-40), winner: g.winner, why: g.why, awards: g.awards || null, actor: actor(g),
      // The case file is only shown once the game is over.
      solution: g.phase === 'gameOver' ? g.solution : null
    };
  }
  return s;
}

function stateFor(room, pub, p) {
  const s = Object.assign({}, pub);
  const g = room.game;
  const playing = g ? g.order.includes(p.id) : room.order.includes(p.id);
  s.me = { id: p.id, name: p.name, suspect: p.suspect, isCaptain: pub.captain === p.id, playing };
  s.me.chats = chatsFor(room, p.id);
  if (g && playing && g.players[p.id]) {
    const me = g.players[p.id], t = g.turn;
    s.me.hand = g.hands[p.id];
    s.me.seen = me.seen;
    s.me.notes = me.notes;
    s.me.out = me.out; s.me.left = me.left;
    s.me.showedTo = me.showedTo;
    if (me.knows || g.phase === 'gameOver') s.me.solution = g.solution;
    s.me.myTurn = g.phase === 'turn' && g.cur === p.id;
    if (s.me.myTurn) {
      s.me.canRoll = !t.rolled && !t.moved && !t.suggested && !t.stuck;
      s.me.canPassage = s.me.canRoll && t.passage >= 0;
      s.me.canSuggest = canSuggest(g, p.id);
      s.me.canEnd = !!(t.moved || t.suggested || t.stuck || t.stay);
      s.me.opts = t.rolled && !t.moved && t.opts ? t.opts.map(o => ({ r: o.r, steps: o.steps, reach: o.reach, n: o.path.length })) : null;
    }
    if (g.phase === 'suggest' && g.sugg && g.sugg.waiting && g.sugg.asking === p.id) s.me.mustShow = matching(g, p.id, g.sugg);
    // The card you were just shown, for the moment after a suggestion.
    const last = me.seen[me.seen.length - 1];
    if (last && g.sugg && g.sugg.by === p.id && g.sugg.shower) s.me.justShown = last;
    // The last card you were shown on this turn, so it stays on screen while you decide.
    if (last && s.me.myTurn && g.turn.suggested && g.history.length && g.history[g.history.length - 1].n === last.n && g.history[g.history.length - 1].by === p.id) s.me.justShown = last;
  }
  return s;
}

function pushAll(room) {
  room.touched = Date.now();
  const pub = publicState(room);
  if (room.displays.size) {
    const d = JSON.stringify({ t: 'state', s: Object.assign({}, pub, { display: true }) });
    for (const ws of room.displays) if (ws.readyState === 1) ws.send(d);
  }
  for (const p of room.players.values()) {
    if (p.ws && p.ws.readyState === 1) p.ws.send(JSON.stringify({ t: 'state', s: stateFor(room, pub, p) }));
  }
  queueBackup(room);
  scheduleBots(room);
}

/* -------------------------------------------------------------- messages */

// Leaving a running game: you're out, and your cards go face up on the table for everyone (the
// game can't be solved with them hidden). Your piece stays where it is and can still be moved.
function dropPlayer(room, p, kicked) {
  const g = room.game;
  const i = room.order.indexOf(p.id);
  if (g && g.players[p.id] && !g.players[p.id].left && g.phase !== 'gameOver') {
    const me = g.players[p.id];
    me.left = true;
    for (const c of g.hands[p.id]) {
      g.revealed.push({ c, from: p.id });
      for (const v of g.order) if (v !== p.id) autoNote(g, v, c, p.id);
    }
    log(room, pname(room, p.id) + ' left the game. Their cards are now face up.', 'left');
    fx(room, 'leftGame', { pid: p.id });
    const sg = g.sugg;
    if (!active(g).length) endGame(room, 'nobody');
    else if (g.phase === 'suggest' && sg && sg.asking === p.id) { sg.waiting = false; sg.i--; sg.ask = sg.ask.filter(x => x !== p.id); setClock(room, 'ask', 400); }
    else if (g.phase === 'suggest' && sg) sg.ask = sg.ask.filter((x, k) => x !== p.id || k <= sg.i);
    else if (g.cur === p.id && (g.phase === 'turn' || g.phase === 'moving')) { stopClock(room); nextTurn(room); }
  } else if (!g && i >= 0) room.order.splice(i, 1);
  if (!g || !g.players[p.id]) room.players.delete(p.id);
  else if (!p.bot) p.connected = false;
  if (p.ws) {
    send(p.ws, { t: 'left', kicked: !!kicked });
    p.ws.room = null; p.ws.pid = null; p.ws = null;
  }
  if (g && !g.order.some(id => room.players.has(id) && !room.players.get(id).bot && !g.players[id].left)) { stopClock(room); room.game = null; fx(room, 'lobby'); }
}

function attach(ws, room, p) {
  if (p.ws && p.ws !== ws) {
    send(p.ws, { t: 'left', replaced: true });
    p.ws.room = null; p.ws.pid = null;
    try { p.ws.close(); } catch (e) { /* ignore */ }
  }
  p.ws = ws; p.connected = true; p.hold = 0; p.goneAt = 0; p.waitingFor = false;
  ws.room = room; ws.pid = p.id;
}

const justStarted = () => Date.now() - BOOT < RESTORE_WINDOW_MS;

function showOn(ws, room, admin) {
  if (ws.display && ws.room && ws.room !== room) ws.room.displays.delete(ws);
  ws.room = room; ws.display = true; ws.admin = admin;
  room.displays.add(ws);
}

function onMessage(ws, m) {
  if (!m || typeof m.t !== 'string') return;
  if (m.t === 'ping') return;

  if (m.t === 'create') {
    const room = newRoom();
    room.custom = cleanCustom(m.custom);
    showOn(ws, room, true);
    send(ws, { t: 'created', code: room.code, token: room.adminToken });
    return pushAll(room);
  }

  if (m.t === 'load') {
    if (typeof m.blob !== 'string' || m.blob.length > BACKUP_MAX) return send(ws, { t: 'error', msg: "That saved game can't be read." });
    const room = loadRoom(m.blob);
    if (!room) return send(ws, { t: 'error', msg: "That saved game can't be opened here. It was saved by a different server." });
    showOn(ws, room, true);
    send(ws, { t: 'created', code: room.code, token: room.adminToken, loaded: true });
    return pushAll(room);
  }

  if (m.t === 'watch' || m.t === 'restore') {
    const code = clean(m.code, 4).toUpperCase();
    let room = rooms.get(code), restored = false;
    if (!room && m.t === 'restore' && typeof m.blob === 'string' && m.blob.length <= BACKUP_MAX) {
      room = restoreRoom(m.blob, code, m.token, m.idle);
      restored = !!room;
    }
    if (!room) return send(ws, { t: 'error', code: 'noroom', msg: 'That game is no longer running.', wait: m.t === 'watch' && justStarted() });
    showOn(ws, room, m.token === room.adminToken);
    send(ws, { t: 'watching', code: room.code, admin: ws.admin, restored });
    return pushAll(room);
  }

  if (m.t === 'join') {
    const room = rooms.get(clean(m.code, 4).toUpperCase());
    if (!room) return send(ws, { t: 'error', code: 'noroom', msg: "Can't find that room. Check the 4-letter code on the TV.", wait: justStarted() });
    const name = clean(m.name, 12).toUpperCase();
    if (!name) return send(ws, { t: 'error', msg: 'Enter your name.' });
    let p = [...room.players.values()].find(x => x.name === name);
    if (p) {
      if (p.bot) return send(ws, { t: 'error', msg: name + ' is a bot’s name. Pick another name.' });
      if (p.connected) return send(ws, { t: 'error', msg: 'Someone is already playing as ' + name + '. Pick another name.' });
      if (p.hold && Date.now() < p.hold) return send(ws, { t: 'error', msg: name + ' is still reconnecting. Try again in a few seconds, or pick another name.' });
      if (room.game && room.game.players[p.id] && room.game.players[p.id].left) return send(ws, { t: 'error', msg: name + ' left this game and their cards are on the table. Watch from the TV, or join the next one.' });
      p.token = rid();
    } else {
      if (room.game) return send(ws, { t: 'error', msg: 'That game has already started. If you were in it, use the exact name you joined with.' });
      if (room.order.length >= MAX_PLAYERS) return send(ws, { t: 'error', msg: 'This room is full: ' + MAX_PLAYERS + ' players, one for each suspect.' });
      const want = Number(m.suspect);
      const s = Number.isInteger(want) && want >= 0 && want < 6 && !suspectTaken(room, want, null) ? want : freeSuspect(room);
      p = { id: rid(6), token: rid(), name, suspect: s, connected: true, ws: null };
      room.players.set(p.id, p);
      room.order.push(p.id);
      fx(room, 'joined', { name: p.name, pid: p.id });
    }
    attach(ws, room, p);
    send(ws, { t: 'joined', code: room.code, token: p.token, id: p.id });
    return pushAll(room);
  }

  if (m.t === 'rejoin') {
    const room = rooms.get(clean(m.code, 4).toUpperCase());
    const p = room && [...room.players.values()].find(x => x.token === m.token);
    if (!p) return send(ws, { t: 'error', code: 'noroom', msg: 'That game has ended.', wait: !room && justStarted() });
    attach(ws, room, p);
    send(ws, { t: 'joined', code: room.code, token: p.token, id: p.id });
    return pushAll(room);
  }

  const room = ws.room;
  if (!room) return;

  if (ws.display) {
    if (!ws.admin) return;
    if (m.t === 'h') { adminAction(room, m); return pushAll(room); }
    if (m.t === 'save') {
      if (!room.game) return;
      try { room.game.played = Date.now() - room.game.started; send(ws, { t: 'saved', blob: packRoom(room, false, 'save'), info: saveInfo(room), label: clean(m.label, 30) }); } catch (e) { console.error('save error', e); }
      return;
    }
    return;
  }

  const p = room.players.get(ws.pid);
  if (!p) return;
  const g = room.game;

  switch (m.t) {
    case 'suspect': {
      if (g) break;
      const s = Number(m.s);
      if (!Number.isInteger(s) || s < 0 || s >= 6) break;
      if (suspectTaken(room, s, p)) { send(ws, { t: 'error', msg: 'Someone already has that one.' }); break; }
      p.suspect = s;
      break;
    }
    case 'chat': chat(room, p, m); break;
    case 'note': note(room, p, m); queueBackup(room); return;   // only this phone's notebook changed: nothing to push
    case 'h':                                      // the captain's phone can start and restart
      if (captainId(room) !== p.id) break;
      if (m.a === 'start' || (m.a === 'lobby' && g && g.phase === 'gameOver')) adminAction(room, m);
      break;
    case 'roll': doRoll(room, p); break;
    case 'go': go(room, p, m.r); break;
    case 'passage': passage(room, p); break;
    case 'suggest': suggest(room, p, m.s, m.w); break;
    case 'show': show(room, p, String(m.c || '')); break;
    case 'accuse': accuse(room, p, m.s, m.w, m.r); break;
    case 'end': endTurn(room, p); break;
    case 'leave': dropPlayer(room, p, false); break;
    default: return;
  }
  pushAll(room);
}

function onClose(ws) {
  const room = ws.room;
  if (!room) return;
  if (ws.display) { room.displays.delete(ws); return; }
  const p = room.players.get(ws.pid);
  if (p && p.ws === ws) {
    p.connected = false; p.ws = null; p.goneAt = Date.now();
    if (!room.game) { const i = room.order.indexOf(p.id); if (i >= 0) room.order.splice(i, 1); room.players.delete(p.id); }
    pushAll(room);
  }
}

/* ------------------------------------------------------------- websocket */

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 512 * 1024 });

wss.on('connection', ws => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', raw => {
    let m;
    try { m = JSON.parse(raw); } catch (e) { return; }
    try { onMessage(ws, m); } catch (e) { console.error('message error', e); }
  });
  ws.on('close', () => { try { onClose(ws); } catch (e) { console.error('close error', e); } });
  ws.on('error', () => {});
});

setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) { ws.terminate(); continue; }
    ws.isAlive = false;
    try { ws.ping(); } catch (e) { /* ignore */ }
  }
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.touched > ROOM_IDLE_MS) { clearTimer(room); clearTimeout(room.backupTimer); clearTimeout(room.tidyTimer); clearTimeout(room.botTimer); rooms.delete(code); }
  }
}, 30000).unref();

setInterval(() => {
  for (const room of rooms.values()) { try { if (autoAct(room, false)) pushAll(room); } catch (e) { console.error('auto error', e); } }
}, 4000 / Math.max(1, Math.min(SPEED, 8))).unref();

if (require.main === module) {
  server.listen(PORT, () => console.log('Friend Clue server running on port ' + PORT));
  let stopping = false;
  const stop = () => {
    if (stopping) return; stopping = true;
    for (const room of rooms.values()) { try { clearTimeout(room.backupTimer); room.backupTimer = null; sendBackup(room); } catch (e) { /* keep going */ } }
    setTimeout(() => process.exit(0), 400);
  };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}

module.exports = { server, rooms, packRoom, unpackRoom, restoreRoom, loadRoom, deduce, pushAll, _t: { startGame, active } };
