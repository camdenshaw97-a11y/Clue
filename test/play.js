'use strict';
/*
 * Checks the rules and plays games against a real server with scripted screens: a TV and
 * phones that roll, walk, suggest, show cards and accuse. Checks that suggestions are answered
 * in the right order, that nobody's phone is ever sent someone else's cards or the case file,
 * that a wrong accusation puts you out (but you still answer), that leaving puts your cards face
 * up, that a game survives the server forgetting it and comes back from a save, and that bots
 * finish games on every board without ever accusing wrongly.
 * The clocks run 40 times faster than in a real game.   Run with: npm test
 */
process.env.RESTORE_WINDOW_MS = '600000';
process.env.SPEED_UP = '40';
const WebSocket = require('ws');
const B = require('../boards');
const { server, rooms, deduce, packRoom, restoreRoom, _t } = require('../server');

const PORT = 3998;
let failures = 0, passes = 0;
function check(name, ok, extra) {
  if (ok) { passes++; console.log('  ok   ' + name); }
  else { failures++; console.log('  FAIL ' + name + (extra ? ' — ' + extra : '')); }
}
const wait = ms => new Promise(r => setTimeout(r, ms));

class Screen {
  constructor(name) {
    this.name = name; this.state = null; this.last = {}; this.errors = []; this.raw = [];
    this.ws = new WebSocket('ws://localhost:' + PORT + '/ws');
    this.ready = new Promise(res => this.ws.on('open', res));
    this.ws.on('message', raw => {
      const m = JSON.parse(raw);
      if (m.t === 'state') { this.state = m.s; this.raw.push(String(raw)); if (this.raw.length > 400) this.raw.shift(); }
      if (m.t === 'error') this.errors.push(m.msg);
      this.last[m.t] = m;
    });
  }
  send(m) { this.ws.send(JSON.stringify(m)); }
  async until(fn, ms = 4000) {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { try { if (fn(this.state, this.last)) return true; } catch (e) { /* not there yet */ } await wait(8); }
    return false;
  }
  close() { this.ws.close(); }
}
const roomOf = tv => rooms.get(tv.state.code);

async function main() {
  /* ---------------------------------------------------- the data and the floor plan */
  check('six boards, each with 6 suspects, 6 weapons and 9 rooms', B.THEMES.length === 6 && B.THEMES.every(t => t.suspects.length === 6 && t.weapons.length === 6 && t.rooms.length === 9));
  check('no two cards on a board share a name', B.THEMES.every(t => ['suspects', 'weapons', 'rooms'].every(k => new Set(t[k].map(x => x.name.toLowerCase())).size === t[k].length)));
  check('every board has its own look', B.THEMES.every(t => B.LOOKS[t.id] && B.LOOKS[t.id].rooms.length === 9));
  check('21 cards: 6 suspects, 6 weapons, 9 rooms', B.CARDS.length === 21 && B.CARDS.filter(c => c[0] === 'S').length === 6 && B.CARDS.filter(c => c[0] === 'R').length === 9);
  check('every door opens onto a hallway square', B.DOORS.every(d => B.walkable(d.x, d.y) && B.ROOM_AT[d.ry][d.rx] === d.room));
  check('two secret passages, corner to opposite corner, both ways', B.ROOMS[0].passage === 4 && B.ROOMS[4].passage === 0 && B.ROOMS[2].passage === 6 && B.ROOMS[6].passage === 2);
  check('every room can be reached from every start square', B.STARTS.every(s => B.reach(s, 99, {}, -1).every(o => o.steps != null)));
  check('every room can be reached from every other room', B.ROOMS.every((r, i) => B.reach({ r: i }, 99, {}, -1).every(o => o.steps != null)));
  const fromStudy = B.reach({ r: 0 }, 4, {}, -1);
  const hall = fromStudy.find(o => o.r === 1);
  check('the Hall is 4 steps from the Study: out the door (1), two squares, in (1)', hall.steps === 4 && hall.reach && hall.path.length === 3);
  check('a roll short of a room walks the whole roll toward it', fromStudy.filter(o => !o.reach && o.steps != null).every(o => o.path.length === 4));
  check('you can’t go back into the room you started in', !fromStudy.some(o => o.r === 0));
  const library = B.reach({ r: 0 }, 12, {}, -1).find(o => o.r === 8);
  const blocked = {}; library.path.forEach(c => { blocked[B.key(c.x, c.y)] = 1; });
  const around = B.reach({ r: 0 }, 12, blocked, -1).find(o => o.r === 8);
  check('another piece in the hall blocks the way (the walk goes round, or not at all)', around.steps == null || around.path.every(c => !blocked[B.key(c.x, c.y)]));
  const shut = {}; B.DOORS.filter(d => d.room === 0).forEach(d => { shut[B.key(d.x, d.y)] = 1; });
  check('a piece in front of the only door boxes the Study in', B.reach({ r: 0 }, 12, shut, -1).every(o => o.steps == null));
  check('no path ever goes diagonally or visits a square twice', B.STARTS.every(s => B.reach(s, 12, {}, -1).every(o => {
    const p = [s].concat(o.path), seen = new Set(p.map(c => B.key(c.x, c.y)));
    return seen.size === p.length && p.every((c, k) => k === 0 || Math.abs(c.x - p[k - 1].x) + Math.abs(c.y - p[k - 1].y) === 1);
  })));
  const custom = B.customTheme({ name: 'Jake’s Apartment', suspects: ['Jake', 'Jake', '', '', '', 'Noah'], rooms: ['Jake’s Room'] });
  check('a custom cast keeps classic cards where it says nothing', custom && custom.suspects[0].name === 'Jake' && custom.suspects[2].name === 'Mrs. White' && custom.weapons[0].name === 'Candlestick');
  check('a custom cast numbers names it repeats', custom.suspects[1].name === 'Jake 2');
  check('“the” goes where it reads right', B.roomThe(B.THEMES[0], 7) === 'the Billiard Room' && B.roomThe(B.THEMES[2], 0) === 'La Jolla Cove' && B.roomThe(B.THEMES[3], 0) === 'the Vault' && B.roomThe(custom, 0) === 'Jake’s Room');

  // What a player can work out from the table.
  const fake = {
    order: ['a', 'b', 'c'], handSize: { a: 6, b: 6, c: 6 },
    hands: { a: ['S0', 'S1', 'W0', 'W1', 'R0', 'R1'] }, revealed: [],
    players: { a: { seen: [{ card: 'S2', from: 'b' }] } },
    history: [{ by: 'a', s: 'S3', w: 'W2', r: 'R2', passes: ['b', 'c'], shower: null, nobody: true }, { by: 'c', s: 'S4', w: 'W2', r: 'R2', passes: [], shower: 'b' }]
  };
  const has = deduce(fake, 'a');
  check('deduction: nobody disproving puts the cards you don’t hold in the case file', has.S3 === 'env' && has.W2 === 'env' && has.R2 === 'env');
  check('deduction: “b showed c one of three” pins it when the other two are ruled out', has.S4 === 'b');
  check('deduction: a card you were shown belongs to whoever showed it', has.S2 === 'b');

  await new Promise(res => server.listen(PORT, res));
  console.log('server up on ' + PORT);

  /* ======================== game 1: three phones and the TV, scripted move by move */
  const tv = new Screen('tv'); await tv.ready;
  tv.send({ t: 'create', custom: { boards: [{ name: 'Our Place', suspects: ['Jake'] }] } });
  check('room created', await tv.until((s, l) => l.created && s));
  check('the TV gets the custom cast as a board', tv.state.themes.some(t => t.id === 'custom:our-place'));
  const names = ['ANN', 'BEN', 'CAT'];
  const ph = [];
  for (const n of names) { const p = new Screen(n); await p.ready; ph.push(p); }
  ph[0].send({ t: 'join', code: tv.state.code, name: 'Ann', suspect: 2 });
  await ph[0].until(s => s && s.me);
  ph[1].send({ t: 'join', code: tv.state.code, name: 'Ben', suspect: 2 });
  await ph[1].until(s => s && s.me);
  ph[2].send({ t: 'join', code: tv.state.code, name: 'Cat', suspect: 5 });
  await ph[2].until(s => s && s.me);
  check('three players joined, each a different suspect', tv.state.players.length === 3 && new Set(tv.state.players.map(p => p.suspect)).size === 3);
  check('a taken suspect isn’t handed out twice (Ben asked for Ann’s)', ph[1].state.me.suspect !== 2);
  ph[1].send({ t: 'suspect', s: 0 });
  await ph[1].until(s => s.me.suspect === 0);
  ph[2].send({ t: 'suspect', s: 0 });
  await wait(60);
  check('you can’t pick a suspect someone else has', ph[2].state.me.suspect === 5 && ph[2].errors.length > 0);
  const extra = []; for (let k = 0; k < 4; k++) { const p = new Screen('x' + k); await p.ready; extra.push(p); }
  for (const [k, p] of extra.entries()) p.send({ t: 'join', code: tv.state.code, name: 'Extra' + k });
  await wait(120);
  check('the seventh player is turned away: six suspects, six seats', extra.filter(p => p.state && p.state.me).length === 3 && extra.some(p => p.errors.some(e => /full/.test(e))));
  for (const p of extra) { p.send({ t: 'leave' }); }
  await wait(80);
  for (const p of extra) p.close();
  await tv.until(s => s.players.length === 3);
  tv.send({ t: 'h', a: 'settings', notes: 'full', dice: 1 });
  await tv.until(s => s.settings.notes === 'full' && s.settings.dice === 1);
  tv.send({ t: 'h', a: 'start' });
  check('the game starts with the story', await tv.until(s => s.phase === 'intro'));
  const room = roomOf(tv), g = room.game;
  const byS = s => g.order.find(id => g.players[id].suspect === s);
  const idOf = p => p.state.me.id;
  check('play order is by suspect: the first suspect goes first, then to the left', g.order.map(id => g.players[id].suspect).join() === [0, 2, 5].join());
  const all = [].concat(g.hands[g.order[0]], g.hands[g.order[1]], g.hands[g.order[2]]);
  check('18 cards dealt, 6 each, none twice, none from the case file', all.length === 18 && new Set(all).size === 18 && !all.includes(g.solution.s) && !all.includes(g.solution.w) && !all.includes(g.solution.r));
  check('the case file holds one suspect, one weapon, one room', g.solution.s[0] === 'S' && g.solution.w[0] === 'W' && g.solution.r[0] === 'R');
  check('the weapons start in six different rooms', new Set(g.weapons).size === 6);
  check('each phone gets its own hand, already in its notebook', ph.every(p => p.state.me.hand.length === 6 && p.state.me.hand.every(c => p.state.me.notes[c][p.state.me.id] === 'o')));
  check('the intro ends on its own and the first player is up', await tv.until(s => s.phase === 'turn' && s.game.cur === byS(0), 3000));
  const P0 = ph.find(p => idOf(p) === byS(0)), P1 = ph.find(p => idOf(p) === byS(2)), P2 = ph.find(p => idOf(p) === byS(5));

  // Deal a known table so every suggestion below is predictable.
  g.solution = { s: 'S3', w: 'W5', r: 'R5' };
  g.hands[byS(0)] = ['S1', 'S2', 'W1', 'R0', 'R1', 'R2'];   // Ben
  g.hands[byS(2)] = ['S0', 'S4', 'W0', 'W2', 'R3', 'R4'];   // Ann
  g.hands[byS(5)] = ['S5', 'W3', 'W4', 'R6', 'R7', 'R8'];   // Cat

  // The first player starts at the top: walk into the Hall in one go (put the piece next to the door).
  g.pawns[0] = { x: 11, y: 7 };
  P0.send({ t: 'roll' });
  await P0.until(s => s.me.opts);
  const hallOpt = P0.state.me.opts.find(o => o.r === 1);
  check('after rolling, the phone gets where it can go (the Hall is one step)', hallOpt && hallOpt.reach && hallOpt.steps === 1);
  P0.send({ t: 'go', r: 1 });
  check('walking into a room ends the move', await P0.until(s => s.phase === 'turn' && s.me.canSuggest, 3000));
  check('the TV saw the walk', tv.state.game.pawns[0].r === 1);
  // Nobody else may act on someone else's turn.
  P1.send({ t: 'roll' }); P1.send({ t: 'suggest', s: 1, w: 1 }); P1.send({ t: 'accuse', s: 1, w: 1, r: 1 });
  await wait(60);
  check('other phones can’t roll, suggest or accuse out of turn', tv.state.phase === 'turn' && tv.state.game.cur === byS(0) && !g.acc);
  const benStart = g.pawns[2];
  P0.send({ t: 'suggest', s: 2, w: 4 });   // Mrs. White (Ann's suspect), the Rope, in the Hall
  check('a suggestion moves the named suspect and weapon into the room', await tv.until(s => s.phase === 'suggest' && s.game.pawns[2].r === 1 && s.game.weapons[4] === 1));
  check('the named suspect’s player may suggest there on their next turn', g.players[byS(2)].movedIn === 1 && benStart.r !== 1);
  // Ann (on Ben's left) has none of Mrs. White, the Rope, the Hall, so she passes; Cat has the Rope.
  check('the player on the left is asked first; with none of the three they pass', await tv.until(s => s.game.sugg && s.game.sugg.passes.includes(byS(2)), 3000));
  check('the next player has the Rope and is asked to show it', await P2.until(s => s.me.mustShow && s.me.mustShow.includes('W4'), 3000));
  check('only the asked player’s phone says “show a card”', !P0.state.me.mustShow && !P1.state.me.mustShow);
  P2.send({ t: 'show', c: g.hands[byS(5)].find(c => c !== 'W4' && !['S2', 'R1'].includes(c)) });
  await wait(60);
  check('you can only show a card from the suggestion that you hold', g.sugg && g.sugg.waiting);
  P2.send({ t: 'show', c: 'W4' });
  check('the suggester’s phone sees the card', await P0.until(s => s.me.justShown && s.me.justShown.card === 'W4' && s.me.justShown.from === byS(5), 3000));
  check('the suggester’s notebook ticks it under whoever showed it', P0.state.me.notes.W4[byS(5)] === 'o' && P0.state.me.notes.W4[byS(2)] === 'x');
  check('everyone else only learns that a card was shown, not which', !JSON.stringify(P1.state.me).includes('"W4","from"') && tv.state.game.history[0].shower === byS(5) && !('card' in tv.state.game.history[0]));
  check('with "also who couldn’t disprove" on, everyone notes the pass', P2.state.me.notes.S2[byS(2)] === 'x' && P0.state.me.notes.W4[byS(2)] === 'x');
  check('after the suggestion it’s back to the suggester to accuse or end', await P0.until(s => s.phase === 'turn' && s.me.canEnd && s.me.justShown, 3000));
  P0.send({ t: 'end' });
  check('Ann is up next, and was dragged into the Hall', await P1.until(s => s.me.myTurn && s.me.canSuggest && s.game.turn.stay, 3000));
  // Ann suggests in the Hall without moving: Miss Scarlet (her own card), the Rope, the Hall. Cat, on her left, has the Rope.
  P1.send({ t: 'suggest', s: 0, w: 4 });
  check('Ann suggests without moving, as the rules allow', await tv.until(s => s.phase === 'suggest' && s.game.sugg.by === byS(2)));
  check('Cat (next to Ann’s left) must show: she has the Rope', await P2.until(s => s.me.mustShow && s.me.mustShow.length === 1, 3000));
  P2.send({ t: 'show', c: 'W4' });
  await P1.until(s => s.phase === 'turn' && s.me.myTurn);
  // A wrong accusation
  const wrongR = 0;
  P1.send({ t: 'accuse', s: 0, w: 0, r: wrongR });
  check('an accusation opens the case file on the TV', await tv.until(s => s.phase === 'accuse' && s.game.acc && s.game.acc.by === byS(2)));
  check('the TV doesn’t know the answer while the drum rolls', !tv.raw[tv.raw.length - 1].includes('"solution":{'));
  check('a wrong accusation puts the player out', await tv.until(s => s.game.players[byS(2)].out, 4000));
  check('…who now knows the answer (they looked in the envelope)', P1.state.me.solution && P1.state.me.solution.s === 'S3');
  check('…and nobody else’s phone does', !P0.state.me.solution && !P2.state.me.solution && !tv.state.game.solution);
  check('the game moves on to the next player, skipping nobody who is still in', await tv.until(s => s.phase === 'turn' && s.game.cur === byS(5), 3000));
  // Cat: secret passage. Put her in the Lounge.
  g.pawns[5] = { r: 2 }; g.turn.from = 2; g.turn.passage = 6;
  P2.send({ t: 'passage' });
  check('a secret passage takes you to the opposite corner, ready to suggest', await P2.until(s => s.game.pawns[5].r === 6 && s.phase === 'turn' && s.me.canSuggest, 3000));
  // Out players still answer: Cat suggests in the Conservatory. Ben has none of the three; Ann (out) has two.
  const sug = { s: 4, w: 0 };
  P2.send({ t: 'suggest', s: sug.s, w: sug.w });
  check('a player out on a wrong accusation still has to show a card (and picks which of two)', await P1.until(s => s.me.mustShow && s.me.mustShow.length === 2, 3000));
  P1.send({ t: 'show', c: P1.state.me.mustShow[0] });
  await P2.until(s => s.phase === 'turn' && s.me.canEnd, 3000);
  // Privacy: nobody's phone was ever sent another hand or the case file.
  const handsOf = id => g.hands[id];
  const leak = ph.some(p => p.raw.some(r => {
    const s = JSON.parse(r).s;
    if (!s.game || s.phase === 'gameOver') return false;
    if (s.game.solution) return true;
    if (s.me && s.me.solution && !g.players[s.me.id].out) return true;
    return g.order.some(id => id !== s.me.id && s.me.hand && JSON.stringify(s.me.hand) === JSON.stringify(handsOf(id)));
  }));
  check('no phone was ever sent someone else’s hand or the case file', !leak);
  check('the TV is never sent a hand', !tv.raw.some(r => /"hand":/.test(r)));
  // Notebook marks are private and stick.
  P0.send({ t: 'note', c: 'R7', p: byS(5), m: '?' });
  const t0 = Date.now(); while (Date.now() - t0 < 1500 && ((g.players[byS(0)].notes.R7 || {})[byS(5)] !== '?')) await wait(10);
  check('a notebook mark is saved for that phone only', (g.players[byS(0)].notes.R7 || {})[byS(5)] === '?' && (g.players[byS(2)].notes.R7 || {})[byS(5)] !== '?');

  // The server forgets the room; the TV hands back its sealed copy.
  P2.send({ t: 'end' });
  await tv.until(s => s.phase === 'turn' && s.game.cur === byS(0), 3000);
  const blob = packRoom(room, false), code = room.code, token = room.adminToken;
  clearTimeout(room.timer); rooms.delete(code);
  const back = restoreRoom(blob, code, token, 0);
  check('a forgotten game comes back from the TV’s sealed copy', back && back.game && back.game.cur === byS(0) && back.game.hands[byS(5)].length === 6);
  check('…with everyone’s notebook', back.game.players[byS(0)].notes.R7[byS(5)] === '?');
  check('a sealed copy from somewhere else is refused', restoreRoom(blob.slice(0, -8) + 'AAAAAAAA', 'ZZZZ', token, 0) === null);
  tv.send({ t: 'watch', code, token });
  await tv.until((st, l) => l.watching && rooms.get(code) === back);
  for (const p of ph) { p.send({ t: 'rejoin', code, token: back.players.get(idOf(p)).token }); }
  await wait(120);
  check('phones reconnect to the restored game', ph.every(p => p.state.me && p.state.me.hand && p.state.me.hand.length === 6));
  const g2 = back.game;
  // Ben leaves: his cards go face up for everyone.
  const benHand = g2.hands[byS(0)].slice();
  P0.send({ t: 'leave' });
  check('leaving puts your cards face up for everyone', await P2.until(s => s.game.revealed.length === 6 && s.game.revealed.every(x => benHand.includes(x.c)), 3000));
  check('…and into everyone’s notebook', benHand.every(c => P2.state.me.notes[c][byS(0)] === 'o'));
  check('…and the turn moves on (Ann is out, so it’s Cat)', await tv.until(s => s.phase === 'turn' && s.game.cur === byS(5), 3000));
  // Cat accuses correctly.
  P2.send({ t: 'accuse', s: 3, w: 5, r: 5 });
  check('a correct accusation wins the game', await tv.until(s => s.phase === 'gameOver' && s.game.winner === byS(5) && s.game.why === 'solved', 4000));
  check('the case file is shown to everyone at the end', tv.state.game.solution && tv.state.game.solution.s === 'S3' && P1.state.game.solution);
  check('the captain’s phone (or the TV) can go back to the lobby', (() => { tv.send({ t: 'h', a: 'lobby' }); return true; })() && await tv.until(s => s.phase === 'lobby'));
  for (const p of ph) p.close();

  /* ======================== game 2: everyone accuses wrong, the killer gets away */
  const tv2 = new Screen('tv2'); await tv2.ready;
  tv2.send({ t: 'create' });
  await tv2.until(s => s && s.code);
  const q = [new Screen('A'), new Screen('B')];
  for (const p of q) await p.ready;
  q[0].send({ t: 'join', code: tv2.state.code, name: 'Dee' }); await q[0].until(s => s && s.me);
  q[1].send({ t: 'join', code: tv2.state.code, name: 'Eli' }); await q[1].until(s => s && s.me);
  tv2.send({ t: 'h', a: 'start' });
  await tv2.until(s => s.phase === 'intro');
  tv2.send({ t: 'h', a: 'skipIntro' });
  await tv2.until(s => s.phase === 'turn');
  const r2 = roomOf(tv2), gg = r2.game;
  const wrong = () => { const s = B.cardIndex(gg.solution.s); return { s: (s + 1) % 6, w: 0, r: 0 }; };
  for (let k = 0; k < 2; k++) {
    await tv2.until(s => s.phase === 'turn' && !s.game.players[s.game.cur].out, 4000);
    const cur = q.find(p => p.state.me.id === gg.cur);
    await cur.until(s => s.me.myTurn);
    cur.send(Object.assign({ t: 'accuse' }, wrong()));
    await tv2.until(s => s.game.players[cur.state.me.id].out, 4000);
  }
  check('when everyone has accused wrongly, nobody wins', await tv2.until(s => s.phase === 'gameOver' && s.game.why === 'nobody' && !s.game.winner, 4000));
  for (const p of q) p.close();
  tv2.close();

  /* ======================== games 3+: bots play whole games on every board */
  for (const [k, theme] of B.THEMES.map(t => t.id).entries()) {
    const t3 = new Screen('tv3'); await t3.ready;
    t3.send({ t: 'create' });
    await t3.until(s => s && s.code);
    const n = 3 + k % 4;
    for (let i = 0; i < n; i++) t3.send({ t: 'h', a: 'addBot' });
    t3.send({ t: 'h', a: 'settings', theme, bots: k % 2 ? 'casual' : 'sharp', dice: k === 2 ? 1 : 2 });
    await t3.until(s => s.players.length === n && s.settings.theme === theme);
    t3.send({ t: 'h', a: 'start' });
    const done = await t3.until(s => s.phase === 'gameOver', 60000);
    const g3 = done && t3.state.game;
    check(n + ' bots finish a game on ' + B.themeById(theme).name + ', solved, with no wrong accusations', done && g3.why === 'solved' && !g3.log.some(l => l.kind === 'wrong'), done ? g3.why : 'still ' + (t3.state && t3.state.phase));
    t3.close();
  }

  console.log('\n' + passes + ' passed, ' + failures + ' failed');
  server.close();
  process.exit(failures ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
