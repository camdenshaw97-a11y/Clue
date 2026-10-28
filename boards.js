/*
 * The mansion: the floor plan everyone plays on, the nine rooms with their doors and the two
 * secret passages, where the six suspects start, how far a roll takes you, and the themes that
 * dress it all up (who the suspects are, what the weapons and rooms are called, and how the board
 * looks). Used by the server (the rules) and by both pages (the drawing). Works in Node and in the
 * browser.
 *
 * Every theme plays on the same floor plan, so the Las Vegas game plays exactly like the classic
 * one: the Vault is where the Study is, with a secret passage to the Wedding Chapel where the
 * Kitchen is.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Boards = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var COLS = 24, ROWS = 25;

  // The nine rooms, in the order you meet them going clockwise from the top left. A door is
  // [room square x, y, hallway square x, y]: you step from that hallway square into the room.
  var ROOMS = [
    { id: 'study', x: 0, y: 0, w: 7, h: 4, doors: [[6, 3, 6, 4]], passage: 4 },
    { id: 'hall', x: 9, y: 0, w: 6, h: 7, doors: [[9, 4, 8, 4], [11, 6, 11, 7], [12, 6, 12, 7]] },
    { id: 'lounge', x: 17, y: 0, w: 7, h: 6, doors: [[17, 5, 17, 6]], passage: 6 },
    { id: 'dining', x: 16, y: 9, w: 8, h: 7, doors: [[17, 9, 17, 8], [16, 12, 15, 12]] },
    { id: 'kitchen', x: 18, y: 18, w: 6, h: 7, doors: [[19, 18, 19, 17]], passage: 0 },
    { id: 'ballroom', x: 8, y: 17, w: 8, h: 7, doors: [[9, 17, 9, 16], [14, 17, 14, 16], [8, 19, 7, 19], [15, 19, 16, 19]] },
    { id: 'conservatory', x: 0, y: 19, w: 5, h: 6, doors: [[4, 19, 5, 19]], passage: 2 },
    { id: 'billiard', x: 0, y: 12, w: 6, h: 5, doors: [[1, 12, 1, 11], [5, 15, 6, 15]] },
    { id: 'library', x: 0, y: 6, w: 6, h: 5, doors: [[3, 6, 3, 5], [5, 8, 6, 8]] }
  ];
  // The case file sits in the middle. Nobody walks through it.
  var CENTER = { x: 9, y: 8, w: 5, h: 7 };

  // Where the six suspects start, around the edge, in the order they play: the first one goes
  // first, then play passes to the left (clockwise round the board).
  var STARTS = [{ x: 16, y: 0 }, { x: 23, y: 7 }, { x: 16, y: 24 }, { x: 7, y: 24 }, { x: 0, y: 18 }, { x: 0, y: 4 }];

  // The six suspect colors, the same on every board.
  var SUSPECT_COLORS = [
    { c1: '#ff5a6a', c2: '#c4162c', ink: '#fff' },   // red
    { c1: '#ffd84d', c2: '#d29a00', ink: '#2a1d00' }, // yellow
    { c1: '#ffffff', c2: '#cfcac0', ink: '#222' },    // white
    { c1: '#4fd87a', c2: '#1d8a3f', ink: '#fff' },    // green
    { c1: '#5a9bff', c2: '#1f55c4', ink: '#fff' },    // blue
    { c1: '#b76be8', c2: '#6f2aa3', ink: '#fff' }     // purple
  ];

  /* ---------------------------------------------------------- the grid */

  // What every square is: 'void' (off the board), 'hall' (a hallway square), 'start', 'room', 'center'.
  var GRID = [], ROOM_AT = [];
  (function () {
    var x, y, k;
    for (y = 0; y < ROWS; y++) { GRID.push([]); ROOM_AT.push([]); for (x = 0; x < COLS; x++) { GRID[y].push('hall'); ROOM_AT[y].push(-1); } }
    ROOMS.forEach(function (r, i) {
      for (y = r.y; y < r.y + r.h; y++) for (x = r.x; x < r.x + r.w; x++) { GRID[y][x] = 'room'; ROOM_AT[y][x] = i; }
    });
    for (y = CENTER.y; y < CENTER.y + CENTER.h; y++) for (x = CENTER.x; x < CENTER.x + CENTER.w; x++) GRID[y][x] = 'center';
    // The outer ring is off the board, except where a room or a start square sits.
    for (y = 0; y < ROWS; y++) for (x = 0; x < COLS; x++) {
      if ((y === 0 || y === ROWS - 1 || x === 0 || x === COLS - 1) && GRID[y][x] === 'hall') GRID[y][x] = 'void';
    }
    for (k = 0; k < STARTS.length; k++) GRID[STARTS[k].y][STARTS[k].x] = 'start';
  })();

  var DOORS = [];
  ROOMS.forEach(function (r, i) { r.doors.forEach(function (d) { DOORS.push({ room: i, rx: d[0], ry: d[1], x: d[2], y: d[3] }); }); });

  function walkable(x, y) { return x >= 0 && y >= 0 && x < COLS && y < ROWS && (GRID[y][x] === 'hall' || GRID[y][x] === 'start'); }
  var key = function (x, y) { return x + ',' + y; };

  /*
   * Where a roll can take you.
   *   at       where you are: { r: room } or { x, y }
   *   roll     the number on the dice
   *   blocked  hallway squares other pieces stand on, as 'x,y' keys (you can't pass through them)
   *   left     the room you left this turn (you can't go straight back in), or -1
   * For every other room: how many steps it is, whether this roll gets you in (you don't need the
   * exact number to enter a room, and entering ends your move), and the path. A room this roll
   * can't reach still gets a path: "head toward it" walks the full roll along the shortest way.
   * Moving out of a room onto the square outside a door is one step; stepping from that square
   * into a room is one step. No diagonals, no square twice, no walking through another piece.
   */
  function reach(at, roll, blocked, left) {
    blocked = blocked || {};
    var dist = {}, prev = {}, queue = [], out = [];
    function push(x, y, d, from) {
      var k = key(x, y);
      if (dist[k] != null || !walkable(x, y) || blocked[k]) return;
      dist[k] = d; prev[k] = from; queue.push([x, y]);
    }
    var startRoom = at.r != null ? at.r : -1;
    if (startRoom >= 0) DOORS.forEach(function (d) { if (d.room === startRoom) push(d.x, d.y, 1, null); });
    else { dist[key(at.x, at.y)] = 0; prev[key(at.x, at.y)] = null; queue.push([at.x, at.y]); }
    for (var q = 0; q < queue.length; q++) {
      var c = queue[q], d0 = dist[key(c[0], c[1])], from = key(c[0], c[1]);
      push(c[0] + 1, c[1], d0 + 1, from); push(c[0] - 1, c[1], d0 + 1, from);
      push(c[0], c[1] + 1, d0 + 1, from); push(c[0], c[1] - 1, d0 + 1, from);
    }
    function pathTo(k) {
      var p = [];
      while (k) { var xy = k.split(','); p.unshift({ x: Number(xy[0]), y: Number(xy[1]) }); k = prev[k]; }
      // From a hallway square the first square of the path is where you already stand.
      if (startRoom < 0) p.shift();
      return p;
    }
    ROOMS.forEach(function (r, i) {
      if (i === startRoom || i === left) return;
      var best = null;
      DOORS.forEach(function (d) {
        if (d.room !== i) return;
        var k = key(d.x, d.y);
        if (dist[k] == null) return;
        var steps = dist[k] + 1;
        if (!best || steps < best.steps) best = { steps: steps, door: k };
      });
      if (!best) { out.push({ r: i, steps: null, reach: false, path: [] }); return; }
      var path = pathTo(best.door);
      if (best.steps <= roll) out.push({ r: i, steps: best.steps, reach: true, path: path });
      else out.push({ r: i, steps: best.steps, reach: false, path: path.slice(0, roll) });
    });
    return out;
  }

  // The square in front of each door of a room, for "is anyone blocking it?".
  function doorSquares(r) { return DOORS.filter(function (d) { return d.room === r; }).map(function (d) { return key(d.x, d.y); }); }
  // A hallway square that sits right outside a door, and whose door it is.
  function doorOf(x, y) { for (var k = 0; k < DOORS.length; k++) if (DOORS[k].x === x && DOORS[k].y === y) return DOORS[k].room; return -1; }

  /* -------------------------------------------------------------- themes */

  var C = { candlestick: 'svg:candlestick', knife: 'svg:knife', pipe: 'svg:pipe', revolver: 'svg:revolver', rope: 'svg:rope', wrench: 'svg:wrench' };

  var THEMES = [
    {
      id: 'classic', name: 'The Mansion', blurb: 'The original. Six dinner guests, six weapons, nine rooms.',
      victim: 'Mr. Boddy',
      story: 'Mr. Boddy invited six guests to dinner at his mansion. Before dessert was served, he was found dead.',
      suspects: [{ name: 'Miss Scarlet' }, { name: 'Colonel Mustard' }, { name: 'Mrs. White' }, { name: 'Mr. Green' }, { name: 'Mrs. Peacock' }, { name: 'Professor Plum' }],
      weapons: [{ name: 'Candlestick', icon: C.candlestick }, { name: 'Knife', icon: C.knife }, { name: 'Lead Pipe', icon: C.pipe }, { name: 'Revolver', icon: C.revolver }, { name: 'Rope', icon: C.rope }, { name: 'Wrench', icon: C.wrench }],
      rooms: [{ name: 'Study', icon: '🖋️' }, { name: 'Hall', icon: '🚪' }, { name: 'Lounge', icon: '🛋️' }, { name: 'Dining Room', icon: '🍽️' }, { name: 'Kitchen', icon: '🍳' }, { name: 'Ballroom', icon: '💃' }, { name: 'Conservatory', icon: '🌿' }, { name: 'Billiard Room', icon: '🎱' }, { name: 'Library', icon: '📚' }]
    },
    {
      id: 'haunted', name: 'Haunted Manor', blurb: 'Halloween at the old Ashcombe place. Something in this house is still awake.',
      victim: 'Lord Ashcombe',
      story: 'Lord Ashcombe threw one last Halloween party in his crumbling manor. At the stroke of midnight the candles went out, and so did he.',
      suspects: [{ name: 'Countess Crimson', icon: '🦇' }, { name: 'Colonel Bones', icon: '💀' }, { name: 'The Pale Bride', icon: '👰' }, { name: 'Doctor Moss', icon: '🧪' }, { name: 'Lady Midnight', icon: '🌙' }, { name: 'Professor Grimm', icon: '🕷️' }],
      weapons: [{ name: 'Silver Dagger', icon: '🗡️' }, { name: 'Candelabra', icon: '🕯️' }, { name: 'Poisoned Goblet', icon: '🍷' }, { name: 'Wooden Stake', icon: '🪵' }, { name: 'Spell Book', icon: '📖' }, { name: 'Bone Saw', icon: '🪚' }],
      rooms: [{ name: 'The Crypt', icon: '⚰️' }, { name: 'Grand Foyer', icon: '🕸️' }, { name: 'Séance Parlor', icon: '🔮' }, { name: 'Banquet Hall', icon: '🍗' }, { name: 'Witch’s Kitchen', icon: '🧙' }, { name: 'Ghost Ballroom', icon: '👻' }, { name: 'Dead Greenhouse', icon: '🥀' }, { name: 'Potion Lab', icon: '⚗️' }, { name: 'Forbidden Library', icon: '📕' }]
    },
    {
      id: 'sandiego', name: 'San Diego', blurb: 'Sunshine, tacos and one very suspicious death in America’s Finest City.',
      victim: 'Big Dave',
      story: 'Big Dave never once stopped talking about his fantasy league. After the best beach day of the year, somebody finally made him stop.',
      suspects: [{ name: 'Lifeguard Lexi', icon: '🛟' }, { name: 'Brewmaster Hank', icon: '🍻' }, { name: 'Captain Navarro', icon: '⚓' }, { name: 'Zookeeper Zoe', icon: '🦒' }, { name: 'Surf Coach Kai', icon: '🌊' }, { name: 'Influencer Violet', icon: '📸' }],
      weapons: [{ name: 'Surfboard', icon: '🏄' }, { name: 'Fish Taco', icon: '🌮' }, { name: 'Beer Growler', icon: '🍺' }, { name: 'Selfie Stick', icon: '🤳' }, { name: 'Skateboard', icon: '🛹' }, { name: 'Beach Umbrella', icon: '⛱️' }],
      rooms: [{ name: 'La Jolla Cove', bare: true, icon: '🦭' }, { name: 'Gaslamp Quarter', icon: '🏮' }, { name: 'Hotel del Coronado', icon: '🏨' }, { name: 'Old Town', bare: true, icon: '🪅' }, { name: 'Pacific Beach', bare: true, icon: '🏖️' }, { name: 'USS Midway', icon: '✈️' }, { name: 'San Diego Zoo', icon: '🐼' }, { name: 'Petco Park', bare: true, icon: '⚾' }, { name: 'Balboa Park', bare: true, icon: '🌴' }]
    },
    {
      id: 'vegas', name: 'Las Vegas', blurb: 'What happens in Vegas stays in Vegas. Except this.',
      victim: 'Lucky Lou',
      story: 'Lucky Lou owned the hottest casino on the Strip. Tonight his luck ran out, somewhere between the buffet and the high-limit room.',
      suspects: [{ name: 'The Showgirl', icon: '💃' }, { name: 'The High Roller', icon: '💰' }, { name: 'The Lounge Singer', icon: '🎤' }, { name: 'The Blackjack Dealer', icon: '🃏' }, { name: 'The Pit Boss', icon: '🕶️' }, { name: 'The Magician', icon: '🎩' }],
      weapons: [{ name: 'Loaded Dice', icon: '🎲' }, { name: 'Champagne Bottle', icon: '🍾' }, { name: 'Poker Chips', icon: '🪙' }, { name: 'Slot Lever', icon: '🎰' }, { name: 'Feather Boa', icon: '🪶' }, { name: 'Mic Stand', icon: '🎙️' }],
      rooms: [{ name: 'The Vault', icon: '💎' }, { name: 'Casino Floor', icon: '♠️' }, { name: 'Penthouse Suite', icon: '🥂' }, { name: 'The Buffet', icon: '🦞' }, { name: 'Wedding Chapel', icon: '💒' }, { name: 'The Showroom', icon: '🎭' }, { name: 'Pool Deck', icon: '🍹' }, { name: 'Sportsbook', icon: '🏈' }, { name: 'High-Limit Room', icon: '💵' }]
    },
    {
      id: 'party', name: 'House Party', adult: true, blurb: 'A house party that got way out of hand. 18+.',
      victim: 'Tyler',
      story: 'Tyler threw the party of the year while his parents were in Cabo. By 2 a.m. the neighbors had called the cops and Tyler was dead on the floor. Nobody leaves until somebody talks.',
      suspects: [{ name: 'The Ex', icon: '💔' }, { name: 'The Hype Man', icon: '📣' }, { name: 'The Designated Driver', icon: '🚗' }, { name: 'The Stoner', icon: '🌿' }, { name: 'The DJ', icon: '🎧' }, { name: 'The Plus-One', icon: '💋' }],
      weapons: [{ name: 'Aux Cord', icon: '🔌' }, { name: 'Red Solo Cup', icon: '🥤' }, { name: 'Tequila Bottle', icon: '🥃' }, { name: 'Vape', icon: '💨' }, { name: 'Ring Light', icon: '💡' }, { name: 'Pong Paddle', icon: '🏓' }],
      rooms: [{ name: 'Parents’ Bedroom', icon: '🛏️' }, { name: 'Front Lawn', icon: '🚓' }, { name: 'Hot Tub', icon: '🫧' }, { name: 'Kitchen Island', icon: '🍕' }, { name: 'Bathroom Line', icon: '🚽' }, { name: 'Dance Floor', icon: '🪩' }, { name: 'Back Porch', icon: '🔥' }, { name: 'The Garage', icon: '🍺' }, { name: 'Gaming Room', icon: '🎮' }]
    },
    {
      id: 'office', name: 'The Office', blurb: 'Somebody at the Scranton branch finally snapped.',
      victim: 'Toby from HR',
      story: 'On the morning of the Dundies, Toby from HR was found face down in the Scranton branch. Everyone in the office had a motive. Some of them had several.',
      suspects: [{ name: 'Michael Scott', icon: '☕' }, { name: 'Dwight Schrute', icon: '🐻' }, { name: 'Angela Martin', icon: '🐈' }, { name: 'Kevin Malone', icon: '🍪' }, { name: 'Jim Halpert', icon: '👔' }, { name: 'Pam Beesly', icon: '🎨' }],
      weapons: [{ name: 'Dundie Award', icon: '🏆' }, { name: 'Stapler in Jell-O', icon: '🍮' }, { name: 'Pot of Chili', icon: '🍲' }, { name: 'Katana', icon: '🗡️' }, { name: 'Ream of Paper', icon: '📄' }, { name: 'Pretzel', icon: '🥨' }],
      rooms: [{ name: 'Michael’s Office', bare: true, icon: '🏆' }, { name: 'Reception', bare: true, icon: '🛎️' }, { name: 'Conference Room', icon: '📊' }, { name: 'Break Room', icon: '☕' }, { name: 'Warehouse', icon: '📦' }, { name: 'Bullpen', icon: '🖥️' }, { name: 'Schrute Farms', bare: true, icon: '🌾' }, { name: 'Annex', icon: '🗂️' }, { name: 'Accounting', bare: true, icon: '🧮' }]
    }
  ];

  // How each board looks on the TV and phones.
  //   bg: the room behind the board (three stops of a radial gradient); accent: the trim color
  //   floor/floorAlt/line: the hallway tiles; rooms: the floor color of each of the nine rooms
  //   ink: text in the rooms; wall: room outlines; door: the door marks; center: the case file
  var LOOKS = {
    classic: {
      bg: ['#5e1622', '#2e0a12', '#110306'], accent: '#e2b85c', frame: '#1b0a05',
      floor: '#ecd27f', floorAlt: '#e3c66c', line: '#b9963f', wall: '#3b2412', door: '#8c2a17', ink: '#2b1a0c',
      rooms: ['#c9b48a', '#d9c39a', '#cf9b86', '#d2ad74', '#ddd0ae', '#e0bfa7', '#a9c79c', '#86b48d', '#bfa27f'],
      center: '#3d0e17', centerInk: '#e2b85c'
    },
    haunted: {
      bg: ['#3a1f5c', '#170b2b', '#05030c'], accent: '#b8f06a', frame: '#05030c',
      floor: '#6a6672', floorAlt: '#625e6a', line: '#3e3b45', wall: '#0b0810', door: '#b8f06a', ink: '#efe6fa',
      rooms: ['#2c2236', '#3a2c4a', '#47285a', '#352a40', '#283b2c', '#3e2749', '#24382b', '#1f3a35', '#3a2e24'],
      center: '#120a1c', centerInk: '#b8f06a'
    },
    sandiego: {
      bg: ['#2a9fd0', '#0d5f86', '#05304a'], accent: '#ffcf4d', frame: '#06344d',
      floor: '#f2ddac', floorAlt: '#ead29a', line: '#cbb27a', wall: '#0b4a68', door: '#e63946', ink: '#06283a',
      rooms: ['#86d9ea', '#f6a964', '#f7d478', '#ec8466', '#3fcfc1', '#aac9ff', '#9fd34a', '#ffb7b2', '#9ccd77'],
      center: '#0b4a68', centerInk: '#ffcf4d'
    },
    vegas: {
      bg: ['#4a0f52', '#1a0622', '#060109'], accent: '#ffd23f', frame: '#060109',
      floor: '#84142a', floorAlt: '#741023', line: '#4c0815', wall: '#ff3fa4', door: '#3df5ff', ink: '#ffe9a8',
      rooms: ['#1d0b29', '#22102e', '#1a0d2c', '#24102a', '#1c0f30', '#28102e', '#130f2e', '#1f0c26', '#1a1030'],
      center: '#0b0410', centerInk: '#ffd23f'
    },
    party: {
      bg: ['#46166a', '#1d0833', '#08020f'], accent: '#ff5ad9', frame: '#0c0414',
      floor: '#a37147', floorAlt: '#97663d', line: '#6e4627', wall: '#170c20', door: '#ffe14d', ink: '#ffffff',
      rooms: ['#5a2f80', '#2d7363', '#2463a0', '#8a4130', '#3d3f5c', '#6a2380', '#33652d', '#7a5422', '#2e3480'],
      center: '#16061f', centerInk: '#ff5ad9'
    },
    office: {
      bg: ['#45698f', '#203750', '#0a1522'], accent: '#f2c14e', frame: '#101a26',
      floor: '#a3acb8', floorAlt: '#99a2ae', line: '#6c7684', wall: '#1f2a36', door: '#f2c14e', ink: '#1f2a36',
      rooms: ['#dccfb3', '#cfd8e3', '#c3d0db', '#e5d6bb', '#c9c3b6', '#d4dbe3', '#b7d39a', '#d9ccbd', '#cdd5dc'],
      center: '#203750', centerInk: '#f2c14e'
    }
  };

  function clean(s, max) { return String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max); }

  // A cast the TV made up: suspects, weapons and rooms of your own (your friends as the suspects,
  // say). Anything left blank keeps the classic name; it plays on the classic board.
  function customTheme(c) {
    if (!c || typeof c !== 'object') return null;
    var name = clean(c.name, 24);
    if (!name) return null;
    var base = THEMES[0], got = 0;
    function list(kind, n) {
      var src = Array.isArray(c[kind]) ? c[kind] : [];
      var out = [];
      for (var k = 0; k < n; k++) {
        var v = clean(src[k], kind === 'rooms' ? 20 : 22);
        if (v) got++;
        out.push({ name: v || base[kind][k].name, icon: base[kind][k].icon, bare: !!v && kind === 'rooms' && /['’]s\b/.test(v) });
      }
      return out;
    }
    var t = { suspects: list('suspects', 6), weapons: list('weapons', 6), rooms: list('rooms', 9) };
    if (!got) return null;
    var seen = {};
    // Two cards with the same name would make the notebook useless: number the repeats.
    ['suspects', 'weapons', 'rooms'].forEach(function (kind) {
      t[kind].forEach(function (x) { var k = kind + '|' + x.name.toLowerCase(); if (seen[k]) x.name = x.name + ' ' + (++seen[k]); else seen[k] = 1; });
    });
    var victim = clean(c.victim, 22) || base.victim;
    return {
      id: 'custom:' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: name, blurb: 'Your own cast', custom: true, look: 'classic',
      victim: victim, story: victim + ' was found dead at ' + name + '. Six suspects, six weapons, nine rooms. One answer.',
      suspects: t.suspects, weapons: t.weapons, rooms: t.rooms
    };
  }

  function themeById(id, customs) {
    var all = THEMES.concat(customs || []);
    for (var k = 0; k < all.length; k++) if (all[k].id === id) return all[k];
    return THEMES[0];
  }
  function lookOf(theme) { return LOOKS[(theme && (theme.look || theme.id)) || 'classic'] || LOOKS.classic; }

  /* --------------------------------------------------------------- cards */

  // Cards are 'S0'..'S5' (suspects, in play order), 'W0'..'W5' (weapons), 'R0'..'R8' (rooms).
  var CARDS = [];
  (function () { var k; for (k = 0; k < 6; k++) CARDS.push('S' + k); for (k = 0; k < 6; k++) CARDS.push('W' + k); for (k = 0; k < 9; k++) CARDS.push('R' + k); })();
  function cardKind(c) { return { S: 'suspect', W: 'weapon', R: 'room' }[String(c).charAt(0)] || null; }
  function cardIndex(c) { return Number(String(c).slice(1)); }
  function cardOf(theme, c) {
    var kind = cardKind(c), i = cardIndex(c);
    var list = kind === 'suspect' ? theme.suspects : kind === 'weapon' ? theme.weapons : theme.rooms;
    return list ? list[i] : null;
  }
  function cardName(theme, c) { var x = cardOf(theme, c); return x ? x.name : '?'; }
  function validCard(c) { return CARDS.indexOf(c) >= 0; }
  // "the Library", "Petco Park", "The Vault": a name ready to go after "in" or "with".
  function the(x) {
    if (!x) return '?';
    if (x.bare) return x.name;
    if (/^the /i.test(x.name)) return 'the ' + x.name.slice(4);
    return 'the ' + x.name;
  }
  function roomThe(theme, i) { return the(theme.rooms[i]); }
  function weaponThe(theme, i) { return the(theme.weapons[i]); }

  return {
    COLS: COLS, ROWS: ROWS, ROOMS: ROOMS, CENTER: CENTER, STARTS: STARTS, GRID: GRID, ROOM_AT: ROOM_AT, DOORS: DOORS,
    SUSPECT_COLORS: SUSPECT_COLORS, THEMES: THEMES, LOOKS: LOOKS, CARDS: CARDS,
    reach: reach, walkable: walkable, doorSquares: doorSquares, doorOf: doorOf, key: key,
    themeById: themeById, customTheme: customTheme, lookOf: lookOf,
    cardKind: cardKind, cardIndex: cardIndex, cardOf: cardOf, cardName: cardName, validCard: validCard, roomThe: roomThe, weaponThe: weaponThe
  };
});
