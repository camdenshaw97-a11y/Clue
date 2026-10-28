/*
 * The furniture: top-down drawings of what's in each room, like the printed board (a billiard
 * table in the Billiard Room, a grand piano in the Ballroom, beds, sofas, bookshelves, plants),
 * and how each room is furnished on each board. Drawing only: nothing here changes the rules.
 *
 * A room's layout is a list of [kind, x, y, w, h, rotate, options] in pixels from the room's top
 * left corner (a board square is 40 pixels). The room's name sits along the top, the weapons
 * and pieces along the bottom, so the furniture mostly lives in between and along the walls.
 */
(function (root) {
  'use strict';
  var D = {};
  var r1 = function (v) { return Math.round(v * 10) / 10; };

  /* ---------------------------------------------------------------- shapes */
  function R(x, y, w, h, f, o) {
    o = o || {};
    return '<rect x="' + r1(x) + '" y="' + r1(y) + '" width="' + r1(Math.max(0, w)) + '" height="' + r1(Math.max(0, h)) + '"' + (o.rx ? ' rx="' + o.rx + '"' : '') + ' fill="' + f + '"' + line(o) + '/>';
  }
  function C(cx, cy, r, f, o) { return '<circle cx="' + r1(cx) + '" cy="' + r1(cy) + '" r="' + r1(r) + '" fill="' + f + '"' + line(o || {}) + '/>'; }
  function E(cx, cy, rx, ry, f, o) { o = o || {}; return '<ellipse cx="' + r1(cx) + '" cy="' + r1(cy) + '" rx="' + r1(rx) + '" ry="' + r1(ry) + '" fill="' + f + '"' + line(o) + (o.rot ? ' transform="rotate(' + o.rot + ' ' + r1(cx) + ' ' + r1(cy) + ')"' : '') + '/>'; }
  function Pa(d, f, o) { return '<path d="' + d + '" fill="' + f + '"' + line(o || {}) + '/>'; }
  function Ln(x1, y1, x2, y2, s, w, o) { o = o || {}; return '<line x1="' + r1(x1) + '" y1="' + r1(y1) + '" x2="' + r1(x2) + '" y2="' + r1(y2) + '" stroke="' + s + '" stroke-width="' + (w || 1.5) + '"' + (o.cap ? ' stroke-linecap="round"' : '') + (o.op != null ? ' opacity="' + o.op + '"' : '') + (o.dash ? ' stroke-dasharray="' + o.dash + '"' : '') + '/>'; }
  function line(o) {
    return (o.s ? ' stroke="' + o.s + '" stroke-width="' + (o.sw || 1.5) + '"' : '') + (o.op != null ? ' opacity="' + o.op + '"' : '') + (o.dash ? ' stroke-dasharray="' + o.dash + '"' : '');
  }
  // A soft shadow under a piece of furniture, so it sits on the floor.
  function sh(x, y, w, h, rx) { return R(x + 3, y + 4, w, h, '#000', { rx: rx || 3, op: 0.18 }); }
  function shC(cx, cy, r) { return C(cx + 3, cy + 4, r, '#000', { op: 0.18 }); }

  /* ------------------------------------------------------------ furniture */
  var K = {};

  K.rug = function (x, y, w, h, P, o) {
    var c = o && o.green ? '#2f6b52' : P.rug;
    return sh(x, y, w, h, 5) + R(x, y, w, h, c, { rx: 5 }) + E(x + w / 2, y + h / 2, w * 0.5, h * 0.5, '#fff', { op: 0.07 }) +
      R(x + 1.5, y + 1.5, w - 3, h - 3, 'none', { rx: 4, s: P.rug2, sw: 3 }) + R(x + 7, y + 7, w - 14, h - 14, 'none', { rx: 3, s: P.rug2, sw: 2 });
  };
  K.runner = function (x, y, w, h, P) {
    return sh(x, y, w, h, 3) + R(x, y, w, h, P.rug, { rx: 3 }) + R(x + 1.5, y + 1.5, w - 3, h - 3, 'none', { rx: 2, s: P.rug2, sw: 3 }) + R(x + 6, y + 6, w - 12, h - 12, 'none', { rx: 2, s: P.rug2, sw: 2 });
  };
  // The ballroom's parquet: diagonal planks with a double border and a medallion in the middle.
  K.parquet = function (x, y, w, h, P) {
    var id = 'pq' + Math.round(x) + Math.round(y);
    return '<defs><pattern id="' + id + '" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="12" height="12" fill="#c89a5a"/><rect width="6" height="12" fill="#d8b06a"/><rect x="6" width="6" height="12" fill="#b8884a"/></pattern></defs>' +
      sh(x, y, w, h, 3) + R(x, y, w, h, 'url(#' + id + ')', { rx: 3 }) + R(x + 1.5, y + 1.5, w - 3, h - 3, 'none', { rx: 2, s: '#e9d4a2', sw: 3 }) + R(x + 4.5, y + 4.5, w - 9, h - 9, 'none', { rx: 2, s: '#7a4a1e', sw: 3 }) +
      C(x + w / 2, y + h / 2, 17, 'none', { s: '#7a4a1e', sw: 2 }) + C(x + w / 2, y + h / 2, 13, 'none', { s: '#e9d4a2', sw: 3 }) + C(x + w / 2, y + h / 2, 9, 'none', { s: '#7a4a1e', sw: 2 }) + C(x + w / 2, y + h / 2, 7, '#e2b85c', {});
  };
  function chair(cx, cy, P, dir, c) {
    var w = 18, d = 14;
    var body = (dir === 'up' || dir === 'down') ? R(cx - w / 2, cy - d / 2, w, d, c || P.fabric, { rx: 3, s: P.line, sw: 1.2 }) : R(cx - d / 2, cy - w / 2, d, w, c || P.fabric, { rx: 3, s: P.line, sw: 1.2 });
    var back = dir === 'down' ? R(cx - w / 2, cy - d / 2, w, 4, P.wood2, {}) : dir === 'up' ? R(cx - w / 2, cy + d / 2 - 4, w, 4, P.wood2, {}) : dir === 'right' ? R(cx - d / 2, cy - w / 2, 4, w, P.wood2, {}) : R(cx + d / 2 - 4, cy - w / 2, 4, w, P.wood2, {});
    return body + back;
  }
  K.table = function (x, y, w, h, P, o) {
    o = o || {};
    var s = '';
    if (o.chairs !== false) {
      var wide = w >= h, n = Math.max(1, Math.floor((wide ? w : h) / 32)), k;
      for (k = 0; k < n; k++) {
        var t = (k + 0.5) / n;
        if (wide) { s += chair(x + w * t, y - 6, P, 'down') + chair(x + w * t, y + h + 6, P, 'up'); }
        else { s += chair(x - 6, y + h * t, P, 'right') + chair(x + w + 6, y + h * t, P, 'left'); }
      }
      if (wide && h >= 28) s += chair(x - 7, y + h / 2, P, 'right') + chair(x + w + 7, y + h / 2, P, 'left');
      if (!wide && w >= 28) s += chair(x + w / 2, y - 7, P, 'down') + chair(x + w / 2, y + h + 7, P, 'up');
    }
    s += sh(x, y, w, h, 4) + R(x, y, w, h, P.wood, { rx: 4, s: P.line }) + R(x + 3, y + 3, w - 6, 3, '#fff', { op: 0.18 });
    if (o.cloth) s += R(x + 5, y + 5, w - 10, h - 10, P.white, { rx: 3, op: 0.92 });
    if (o.plates) {
      var wide2 = w >= h, m = Math.max(1, Math.floor((wide2 ? w : h) / 32));
      for (var j = 0; j < m; j++) {
        var tt = (j + 0.5) / m;
        if (wide2) s += C(x + w * tt, y + 11, 5, '#fff', { s: '#0003', sw: 1 }) + C(x + w * tt, y + h - 11, 5, '#fff', { s: '#0003', sw: 1 });
        else s += C(x + 11, y + h * tt, 5, '#fff', { s: '#0003', sw: 1 }) + C(x + w - 11, y + h * tt, 5, '#fff', { s: '#0003', sw: 1 });
      }
    }
    if (o.flasks) {
      var cols = ['#7dff6a', '#ff5ad9', '#5ad1ff', '#ffe14d', '#ff7b54'];
      for (var f = 0; f < 6; f++) s += C(x + 12 + f * (w - 24) / 5, y + h / 2 + (f % 2 ? 8 : -8), 5, cols[f % 5], { s: P.line, sw: 1 });
    }
    if (o.papers) s += R(x + w * 0.2, y + h * 0.25, 14, 10, P.white, { op: 0.9 }) + R(x + w * 0.6, y + h * 0.5, 12, 9, P.white, { op: 0.9 });
    if (o.roast) s += E(x + w / 2, y + h / 2, 22, 13, '#f3b23a', { s: '#b85a14', sw: 2 }) + E(x + w / 2 - 6, y + h / 2 - 4, 8, 4, '#ffd98a', { op: 0.6 });
    return s;
  };
  // A sideboard with two lamps (the classic dining room).
  K.sideboard = function (x, y, w, h, P) {
    return sh(x, y, w, h, 2) + R(x, y, w, h, P.wood, { s: P.line }) + K.lamp(x + 12, y + 4, 14, 14, P) + K.lamp(x + w - 26, y + 4, 14, 14, P);
  };
  // A cue rack on the wall.
  K.cues = function (x, y, w, h, P) {
    var s = sh(x, y, w, h, 1) + R(x, y, w, h, '#3a2414', { s: '#2a1608', sw: 2 });
    for (var k = 3; k < w - 2; k += 4) s += R(x + k, y + 3, 2, h - 6, '#c9a070', {});
    return s;
  };
  // Bottles on a wall rack.
  K.bottles = function (x, y, w, h, P) {
    var s = sh(x, y, w, h, 1) + R(x, y, w, h, '#3a2414', { s: '#2a1608', sw: 2 }), cols = ['#e8d4a0', '#b9c6cf', '#d98a4a', '#8ab8ff'], k = 0;
    for (var yy = 6; yy < h - 6; yy += 10) { for (var xx = 4; xx < w - 4; xx += 6) s += R(x + xx, y + yy, 4, 7, cols[k++ % 4], { rx: 1 }); s += R(x + 2, y + yy + 8, w - 4, 1.5, '#c9a070', {}); }
    return s;
  };
  K.round = function (x, y, w, h, P, o) {
    o = o || {};
    var cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) / 2 - 8, n = o.n == null ? 4 : o.n, s = '';
    for (var k = 0; k < n; k++) {
      var a = (k / n) * Math.PI * 2 - Math.PI / 2, px = cx + Math.cos(a) * (r + 6), py = cy + Math.sin(a) * (r + 6);
      s += C(px, py, 7, P.fabric, { s: P.line, sw: 1.2 });
    }
    s += shC(cx, cy, r) + C(cx, cy, r, P.wood, { s: P.line }) + C(cx - r * 0.3, cy - r * 0.3, r * 0.35, '#fff', { op: 0.12 });
    if (o.ball) s += C(cx, cy, r * 0.32, '#bfe9ff', { s: '#6fb6d6', sw: 1.5 }) + C(cx - r * 0.1, cy - r * 0.1, r * 0.1, '#fff', { op: 0.9 });
    if (o.umbrella) s += umbrella(cx, cy, r + 8, P, 0.85);
    if (o.cloth) s += C(cx, cy, r - 4, P.white, { op: 0.9 });
    if (o.white) s += C(cx, cy, r, '#f1eadb', { s: '#a89a7a', sw: 3 });
    if (o.flower) s += C(cx, cy, r * 0.42, '#e86a7a', {}) + C(cx - r * 0.12, cy - r * 0.12, r * 0.16, '#ffd0d8', { op: 0.7 });
    return s;
  };
  function umbrella(cx, cy, r, P, op) {
    var s = '', n = 8;
    for (var k = 0; k < n; k++) {
      var a1 = k / n * Math.PI * 2, a2 = (k + 1) / n * Math.PI * 2;
      s += Pa('M' + r1(cx) + ' ' + r1(cy) + 'L' + r1(cx + Math.cos(a1) * r) + ' ' + r1(cy + Math.sin(a1) * r) + 'L' + r1(cx + Math.cos(a2) * r) + ' ' + r1(cy + Math.sin(a2) * r) + 'Z', k % 2 ? P.white : P.fabric2, { op: op || 1 });
    }
    return s + C(cx, cy, r, 'none', { s: P.line, sw: 1.2 }) + C(cx, cy, 2.5, P.line, {});
  }
  K.umbrella = function (x, y, w, h, P) { var r = Math.min(w, h) / 2; return shC(x + w / 2, y + h / 2, r) + umbrella(x + w / 2, y + h / 2, r, P); };
  K.sofa = function (x, y, w, h, P, o) {
    var c = (o && o.color) || P.fabric, arm = Math.min(w * 0.14, 12), back = h * 0.36;
    var s = sh(x, y, w, h, 6) + R(x, y, w, h, c, { rx: 6, s: P.line });
    s += R(x, y, w, back, '#000', { rx: 6, op: 0.22 }) + R(x, y, arm, h, '#000', { rx: 5, op: 0.15 }) + R(x + w - arm, y, arm, h, '#000', { rx: 5, op: 0.15 });
    var seats = Math.max(1, Math.round((w - arm * 2) / 34));
    for (var k = 1; k < seats; k++) s += Ln(x + arm + (w - arm * 2) * k / seats, y + back + 2, x + arm + (w - arm * 2) * k / seats, y + h - 3, '#0004', 1.2);
    return s;
  };
  K.armchair = function (x, y, w, h, P, o) { return K.sofa(x, y, w, h, P, { color: (o && o.color) || P.fabric2 }); };
  K.bed = function (x, y, w, h, P) {
    var s = sh(x, y, w, h, 4) + R(x, y, w, h, P.wood, { rx: 4, s: P.line }) + R(x + 4, y + 4, w - 8, h - 8, P.white, { rx: 3 });
    s += R(x + 8, y + 7, (w - 22) / 2, h * 0.16, '#fff', { rx: 4, s: '#0002', sw: 1 }) + R(x + w / 2 + 3, y + 7, (w - 22) / 2, h * 0.16, '#fff', { rx: 4, s: '#0002', sw: 1 });
    s += R(x + 4, y + h * 0.36, w - 8, h * 0.64 - 4, P.fabric, { rx: 3 }) + R(x + 4, y + h * 0.36, w - 8, 6, '#fff', { op: 0.35 });
    return s;
  };
  K.nightstand = function (x, y, w, h, P) { return sh(x, y, w, h) + R(x, y, w, h, P.wood, { rx: 2, s: P.line }) + C(x + w / 2, y + h / 2, Math.min(w, h) * 0.28, P.glow, { op: 0.9 }); };
  K.desk = function (x, y, w, h, P, o) {
    o = o || {};
    var s = '';
    if (o.chair !== false) s += C(x + w / 2, y + h + 9, 9, P.fabric2, { s: P.line, sw: 1.2 });
    s += sh(x, y, w, h) + R(x, y, w, h, P.wood, { rx: 3, s: P.line }) + R(x + 2, y + 2, w - 4, 3, '#fff', { op: 0.18 });
    if (o.monitor !== false) s += R(x + w / 2 - 12, y + 4, 24, 6, '#1d2430', { rx: 1 }) + R(x + w / 2 - 10, y + 5, 20, 3, '#5ab0ff', { op: 0.6 });
    s += R(x + 6, y + h - 12, 12, 8, P.white, { op: 0.9 }) + R(x + w - 18, y + h - 13, 10, 7, P.white, { op: 0.8 });
    if (o.mug) s += C(x + w - 9, y + 10, 3.5, P.white, { s: P.line, sw: 1 });
    return s;
  };
  var BOOKS = ['#8e2c2c', '#2f5d50', '#d9a441', '#3b5b8c', '#6b3f8a', '#c8643a', '#e8e0c8'];
  K.shelf = function (x, y, w, h, P, o) {
    o = o || {};
    var s = sh(x, y, w, h, 2) + R(x, y, w, h, P.wood2, { rx: 2, s: P.line }), along = h > w, len = along ? h : w, thick = along ? w : h, k = 0, t = 3;
    var cols = o.jars ? ['#7dff6a', '#b06bff', '#ff5ad9', '#ffe14d', '#5ad1ff'] : BOOKS;
    while (t < len - 5) {
      var sz = o.jars ? 7 : 4 + (k * 7 % 4);
      if (o.jars) s += along ? C(x + thick / 2, y + t + 4, 3.6, cols[k % cols.length], { s: '#0006', sw: 0.8 }) : C(x + t + 4, y + thick / 2, 3.6, cols[k % cols.length], { s: '#0006', sw: 0.8 });
      else s += along ? R(x + 3, y + t, thick - 6, sz, cols[k % cols.length], {}) : R(x + t, y + 3, sz, thick - 6, cols[k % cols.length], {});
      t += sz + (o.jars ? 3 : 1); k++;
    }
    return s;
  };
  K.plant = function (x, y, w, h, P) {
    var cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) / 2, s = shC(cx, cy, r * 0.55) + C(cx, cy, r * 0.5, P.pot, { s: P.line, sw: 1.2 });
    for (var k = 0; k < 7; k++) { var a = k / 7 * 360; s += E(cx + Math.cos(a * Math.PI / 180) * r * 0.45, cy + Math.sin(a * Math.PI / 180) * r * 0.45, r * 0.42, r * 0.2, k % 2 ? P.plant : P.plant2, { rot: a, s: '#0003', sw: 0.8 }); }
    return s + C(cx, cy, r * 0.22, P.plant2, {});
  };
  K.palm = function (x, y, w, h, P) {
    var cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) / 2, s = shC(cx, cy, r * 0.7);
    for (var k = 0; k < 8; k++) { var a = k / 8 * 360 + 10; s += E(cx + Math.cos(a * Math.PI / 180) * r * 0.5, cy + Math.sin(a * Math.PI / 180) * r * 0.5, r * 0.55, r * 0.16, k % 2 ? P.plant : P.plant2, { rot: a, s: '#0004', sw: 0.8 }); }
    return s + C(cx, cy, r * 0.16, P.wood, { s: P.line, sw: 1 });
  };
  K.tree = function (x, y, w, h, P) {
    var cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) / 2;
    return shC(cx, cy, r * 0.9) + C(cx - r * 0.3, cy + r * 0.1, r * 0.6, P.plant2, {}) + C(cx + r * 0.3, cy - r * 0.1, r * 0.6, P.plant2, {}) + C(cx, cy - r * 0.25, r * 0.6, P.plant, {}) + C(cx - r * 0.15, cy - r * 0.35, r * 0.25, '#fff', { op: 0.15 });
  };
  K.piano = function (x, y, w, h, P) {
    var s = sh(x, y, w, h, 8);
    s += Pa('M' + r1(x) + ' ' + r1(y) + 'H' + r1(x + w) + 'V' + r1(y + h * 0.45) + 'C' + r1(x + w) + ' ' + r1(y + h * 0.95) + ' ' + r1(x + w * 0.55) + ' ' + r1(y + h * 0.75) + ' ' + r1(x + w * 0.45) + ' ' + r1(y + h) + 'H' + r1(x) + 'Z', '#15110f', { s: P.line });
    s += R(x + 2, y + 2, w - 4, h * 0.14, '#fff', { s: '#0005', sw: 0.8 });
    for (var k = 1; k < 12; k++) s += R(x + 2 + (w - 4) * k / 12 - 1, y + 2, 2.2, h * 0.08, '#111', {});
    s += Ln(x + 6, y + h * 0.3, x + w * 0.7, y + h * 0.75, '#fff', 1, { op: 0.25 });
    return s + R(x + w * 0.25, y - 9, w * 0.4, 7, P.wood2, { rx: 2, s: P.line, sw: 1 });
  };
  K.billiard = function (x, y, w, h, P) {
    var s = sh(x, y, w, h, 8) + R(x, y, w, h, P.wood, { rx: 8, s: P.line }) + R(x + 8, y + 8, w - 16, h - 16, P.felt, { rx: 3 });
    [[x + 9, y + 9], [x + w / 2, y + 7], [x + w - 9, y + 9], [x + 9, y + h - 9], [x + w / 2, y + h - 7], [x + w - 9, y + h - 9]].forEach(function (p) { s += C(p[0], p[1], 5, '#111', {}); });
    var bx = x + w * 0.68, by = y + h / 2, cols = ['#ffd23f', '#1f55c4', '#e0303e', '#7a2fd6', '#ff8a2a', '#1d8a3f', '#7a1a26', '#111', '#ffd23f', '#1f55c4'], k = 0;
    for (var row = 0; row < 4; row++) for (var i = 0; i <= row; i++) s += C(bx + row * 7, by + (i - row / 2) * 7.6, 3.6, cols[k++ % cols.length], { s: '#0006', sw: 0.6 });
    s += C(x + w * 0.27, by, 3.6, '#fff', { s: '#0006', sw: 0.6 });
    return s + Ln(x + w * 0.05, y + h * 0.85, x + w * 0.24, y + h * 0.56, '#d9b27a', 3, { cap: 1 });
  };
  K.fireplace = function (x, y, w, h, P) {
    var vertical = h > w, s = R(x, y, w, h, P.stone, { rx: 2, s: P.line });
    var ix = vertical ? x + w * 0.35 : x + w * 0.2, iy = vertical ? y + h * 0.2 : y + h * 0.35, iw = vertical ? w * 0.65 : w * 0.6, ih = vertical ? h * 0.6 : h * 0.65;
    s += R(ix, iy, iw, ih, '#2a1a10', {}) + E(ix + iw / 2, iy + ih / 2, iw * 0.3, ih * 0.3, '#ff8a1c', {}) + E(ix + iw / 2, iy + ih / 2, iw * 0.15, ih * 0.15, '#ffe14d', {});
    return s;
  };
  K.counter = function (x, y, w, h, P, o) {
    o = o || {};
    var along = h > w, s = sh(x, y, w, h, 2) + R(x, y, w, h, P.stone, { rx: 2, s: P.line }) + R(x + 2, y + 2, w - 4, 3, '#fff', { op: 0.3 });
    var t = along ? h : w, th = along ? w : h;
    function at(f, fn) { var px = along ? x + th / 2 : x + t * f, py = along ? y + t * f : y + th / 2; return fn(px, py); }
    if (o.stove) s += at(0.25, function (px, py) { var g = th * 0.22; return C(px - g, py - g, g * 0.75, '#222', {}) + C(px + g, py - g, g * 0.75, '#222', {}) + C(px - g, py + g, g * 0.75, '#222', {}) + C(px + g, py + g, g * 0.75, '#222', {}); });
    if (o.sink) s += at(0.72, function (px, py) { return R(px - th * 0.3, py - th * 0.3, th * 0.6, th * 0.6, '#cfe6f2', { rx: 3, s: '#7a9aa8', sw: 1 }); });
    if (o.food) for (var k = 0; k < 4; k++) s += at((k + 0.5) / 4, function (px, py) { return R(px - th * 0.32, py - th * 0.32, th * 0.64, th * 0.64, P.metal, { rx: 2, s: '#0004', sw: 1 }) + C(px, py, th * 0.2, ['#e67e22', '#c0392b', '#f1c40f', '#27ae60'][k], {}); });
    if (o.monitor) s += R(x + w / 2 - 12, y + 4, 24, 6, '#1d2430', { rx: 1 });
    if (o.pizza) s += C(x + w * 0.3, y + h / 2, h * 0.3, '#e9b44c', { s: '#a8641e', sw: 1.5 }) + C(x + w * 0.3 - 3, y + h / 2 - 2, 2.5, '#c0392b', {}) + C(x + w * 0.3 + 4, y + h / 2 + 3, 2.5, '#c0392b', {}) + R(x + w * 0.58, y + h * 0.2, h * 0.6, h * 0.6, '#f2e2c0', { s: '#a8641e', sw: 1 });
    if (o.cups) for (var c = 0; c < 6; c++) s += C(x + w * (0.15 + c * 0.14), y + h * (c % 2 ? 0.35 : 0.65), 3.2, '#d7263d', { s: '#fff', sw: 1 });
    return s;
  };
  K.fridge = function (x, y, w, h, P) { return sh(x, y, w, h) + R(x, y, w, h, '#e9eef2', { rx: 3, s: P.line }) + Ln(x + 3, y + h * 0.4, x + w - 3, y + h * 0.4, '#9aa3ab', 1.2) + Ln(x + w - 6, y + 6, x + w - 6, y + h * 0.3, '#9aa3ab', 2); };
  K.lamp = function (x, y, w, h, P) { var cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) / 2; return C(cx, cy, r * 1.6, P.glow, { op: 0.25 }) + C(cx, cy, r, P.glow, { s: P.line, sw: 1 }) + C(cx, cy, r * 0.35, P.wood2, {}); };
  K.tv = function (x, y, w, h, P) { return sh(x, y, w, h) + R(x, y, w, h, '#14161c', { rx: 2, s: P.line }) + R(x + 2, y + 2, w - 4, h - 4, '#3a7fd0', { op: 0.55 }); };
  K.crates = function (x, y, w, h, P) {
    var s = '', cs = 22, cols = Math.max(1, Math.floor(w / cs)), rows = Math.max(1, Math.floor(h / cs));
    for (var i = 0; i < cols; i++) for (var j = 0; j < rows; j++) {
      var bx = x + i * (w / cols), by = y + j * (h / rows), bw = w / cols - 2, bh = h / rows - 2;
      s += sh(bx, by, bw, bh, 1) + R(bx, by, bw, bh, '#c89b62', { s: '#7a5530', sw: 1.2 }) + Ln(bx + 2, by + 2, bx + bw - 2, by + bh - 2, '#7a5530', 1) + Ln(bx + bw - 2, by + 2, bx + 2, by + bh - 2, '#7a5530', 1);
    }
    return s;
  };
  K.rack = function (x, y, w, h, P) {
    var along = h > w, s = sh(x, y, w, h, 1) + R(x, y, w, h, '#5a6470', { s: P.line });
    var t = along ? h : w, th = along ? w : h, n = Math.floor(t / 20);
    for (var k = 0; k < n; k++) { var a = 3 + k * (t - 6) / n; s += along ? R(x + 3, y + a, th - 6, (t - 6) / n - 3, ['#c89b62', '#b07f48', '#d9b27a'][k % 3], { s: '#7a5530', sw: 0.8 }) : R(x + a, y + 3, (t - 6) / n - 3, th - 6, ['#c89b62', '#b07f48', '#d9b27a'][k % 3], { s: '#7a5530', sw: 0.8 }); }
    return s;
  };
  K.forklift = function (x, y, w, h, P) {
    return sh(x, y + h * 0.3, w, h * 0.7, 4) + R(x + w * 0.25, y, 4, h * 0.35, '#888', {}) + R(x + w * 0.65, y, 4, h * 0.35, '#888', {}) + R(x, y + h * 0.3, w, h * 0.7, '#f2b705', { rx: 4, s: P.line }) + R(x + w * 0.2, y + h * 0.45, w * 0.6, h * 0.35, '#222', { rx: 3 }) + C(x + w / 2, y + h * 0.62, 5, '#555', {});
  };
  K.pool = function (x, y, w, h, P) {
    var s = R(x - 5, y - 5, w + 10, h + 10, P.stone, { rx: 12, s: P.line }) + R(x, y, w, h, P.water, { rx: 9 });
    for (var k = 0; k < 4; k++) s += Pa('M' + r1(x + 10) + ' ' + r1(y + 14 + k * (h - 20) / 4) + 'q8 -5 16 0 t16 0 t16 0', 'none', { s: '#fff', sw: 1.4, op: 0.5 });
    return s + Ln(x + w - 12, y + 4, x + w - 12, y + 18, P.metal, 2) + Ln(x + w - 6, y + 4, x + w - 6, y + 18, P.metal, 2);
  };
  K.hottub = function (x, y, w, h, P) {
    var cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) / 2;
    var s = shC(cx, cy, r) + C(cx, cy, r, P.stone, { s: P.line }) + C(cx, cy, r * 0.8, P.water, {});
    for (var k = 0; k < 9; k++) s += C(cx + Math.cos(k * 2.1) * r * 0.5 * (k % 3) / 2, cy + Math.sin(k * 2.1) * r * 0.5 * (k % 3) / 2, 2 + k % 3, '#fff', { op: 0.65 });
    return s;
  };
  K.grass = function (x, y, w, h, P) {
    var s = R(x, y, w, h, P.plant, { rx: 8, op: 0.85 });
    for (var k = 0; k < Math.floor(w * h / 500); k++) { var gx = x + 8 + ((k * 37) % Math.max(1, w - 16)), gy = y + 8 + ((k * 53) % Math.max(1, h - 16)); s += Pa('M' + gx + ' ' + gy + 'l-2 -5M' + gx + ' ' + gy + 'l2 -6M' + gx + ' ' + gy + 'l4 -4', 'none', { s: P.plant2, sw: 1.2 }); }
    return s;
  };
  K.sand = function (x, y, w, h, P) {
    var s = R(x, y, w, h, P.sand || '#f2dca6', { rx: 4 });
    for (var k = 0; k < Math.floor(w * h / 300); k++) s += C(x + 4 + ((k * 31) % Math.max(1, w - 8)), y + 4 + ((k * 47) % Math.max(1, h - 8)), 0.9, '#c9a96a', {});
    return s;
  };
  K.sea = function (x, y, w, h, P) {
    var s = R(x, y, w, h, P.water, {}) + R(x, y, w, 6, '#fff', { op: 0.5 });
    for (var k = 0; k < Math.floor(h / 16); k++) s += Pa('M' + r1(x + 8 + (k % 2) * 14) + ' ' + r1(y + 14 + k * 16) + 'q7 -5 14 0 t14 0 t14 0 t14 0', 'none', { s: '#fff', sw: 1.4, op: 0.45 }) + Pa('M' + r1(x + w * 0.55 + (k % 2) * 10) + ' ' + r1(y + 20 + k * 16) + 'q7 -5 14 0 t14 0 t14 0', 'none', { s: '#fff', sw: 1.4, op: 0.4 });
    return s;
  };
  K.rocks = function (x, y, w, h, P) {
    return E(x + w * 0.3, y + h * 0.5, w * 0.28, h * 0.42, '#8d8a84', { s: P.line, sw: 1 }) + E(x + w * 0.65, y + h * 0.45, w * 0.3, h * 0.38, '#a19d96', { s: P.line, sw: 1 }) + E(x + w * 0.62, y + h * 0.4, w * 0.1, h * 0.12, '#6e6a63', {}) +
      E(x + w * 0.62, y + h * 0.38, 7, 4, '#5d5550', { rot: -20 }) + C(x + w * 0.62 + 5, y + h * 0.38 - 3, 2.6, '#5d5550', {});
  };
  K.coffin = function (x, y, w, h, P) {
    var d = 'M' + r1(x) + ' ' + r1(y + h * 0.5) + 'L' + r1(x + w * 0.22) + ' ' + r1(y) + 'H' + r1(x + w) + 'V' + r1(y + h) + 'H' + r1(x + w * 0.22) + 'Z';
    return sh(x, y, w, h, 3) + Pa(d, P.wood, { s: P.line }) + Ln(x + w * 0.45, y + h * 0.5, x + w * 0.85, y + h * 0.5, P.glow, 2.5) + Ln(x + w * 0.58, y + h * 0.28, x + w * 0.58, y + h * 0.72, P.glow, 2.5);
  };
  K.grave = function (x, y, w, h, P) {
    var d = 'M' + r1(x) + ' ' + r1(y + h) + 'V' + r1(y + w / 2) + 'A' + r1(w / 2) + ' ' + r1(w / 2) + ' 0 0 1 ' + r1(x + w) + ' ' + r1(y + w / 2) + 'V' + r1(y + h) + 'Z';
    return sh(x, y + 4, w, h - 4, 4) + Pa(d, '#8a8796', { s: P.line }) + Ln(x + w * 0.25, y + h * 0.5, x + w * 0.75, y + h * 0.5, '#5a5764', 1.5) + Ln(x + w * 0.3, y + h * 0.66, x + w * 0.7, y + h * 0.66, '#5a5764', 1.5) + R(x - 3, y + h - 4, w + 6, 6, '#5a5a3a', { rx: 2 });
  };
  K.cauldron = function (x, y, w, h, P) {
    var cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) / 2;
    var s = C(cx, cy, r * 1.15, '#ff7a1a', { op: 0.35 }) + shC(cx, cy, r) + C(cx, cy, r, '#1a1a1a', { s: P.line }) + C(cx, cy, r * 0.78, '#58d13a', {});
    for (var k = 0; k < 6; k++) s += C(cx + Math.cos(k * 1.3) * r * 0.42, cy + Math.sin(k * 1.3) * r * 0.42, 2 + k % 3, '#b8ff8a', { op: 0.9 });
    return s;
  };
  K.web = function (x, y, w, h, P, o) {
    var c = (o && o.corner) || 'tl', ox = c[1] === 'l' ? x : x + w, oy = c[0] === 't' ? y : y + h, sx = c[1] === 'l' ? 1 : -1, sy = c[0] === 't' ? 1 : -1, s = '';
    for (var k = 0; k <= 4; k++) { var a = k / 4 * Math.PI / 2; s += Ln(ox, oy, ox + sx * Math.cos(a) * w, oy + sy * Math.sin(a) * h, '#e8e4f0', 0.9, { op: 0.6 }); }
    for (var j = 1; j <= 3; j++) {
      var rr = j / 3.2, d = '';
      for (var m = 0; m <= 4; m++) { var b = m / 4 * Math.PI / 2; d += (m ? 'L' : 'M') + r1(ox + sx * Math.cos(b) * w * rr) + ' ' + r1(oy + sy * Math.sin(b) * h * rr); }
      s += Pa(d, 'none', { s: '#e8e4f0', sw: 0.9, op: 0.6 });
    }
    return s;
  };
  K.candles = function (x, y, w, h, P) {
    var cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) / 2;
    return C(cx, cy, r * 1.4, P.glow, { op: 0.18 }) + C(cx, cy, r * 0.75, '#c9a24a', { s: P.line, sw: 1 }) + [0, 1, 2, 3, 4].map(function (k) { var a = k / 5 * Math.PI * 2; return C(cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55, r * 0.2, '#fff6dc', { s: '#c9a24a', sw: 0.8 }) + C(cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55, r * 0.09, '#ff9f1c', {}); }).join('');
  };
  K.chandelier = function (x, y, w, h, P) { return K.candles(x, y, w, h, P); };
  K.pumpkin = function (x, y, w, h, P) {
    var cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) / 2;
    return shC(cx, cy, r) + E(cx, cy, r, r * 0.88, '#f07a12', { s: '#7a3a06', sw: 1.2 }) + E(cx, cy, r * 0.45, r * 0.88, 'none', { s: '#b8550c', sw: 1.2 }) + C(cx, cy, r * 0.18, '#4a6b1e', {});
  };
  K.deadtree = function (x, y, w, h, P) {
    var cx = x + w / 2, cy = y + h / 2, s = shC(cx, cy, Math.min(w, h) * 0.2);
    for (var k = 0; k < 6; k++) { var a = k / 6 * Math.PI * 2 + 0.4, l = Math.min(w, h) * 0.48; s += Pa('M' + r1(cx) + ' ' + r1(cy) + 'L' + r1(cx + Math.cos(a) * l) + ' ' + r1(cy + Math.sin(a) * l) + 'M' + r1(cx + Math.cos(a) * l * 0.6) + ' ' + r1(cy + Math.sin(a) * l * 0.6) + 'l' + r1(Math.cos(a + 0.8) * l * 0.3) + ' ' + r1(Math.sin(a + 0.8) * l * 0.3), 'none', { s: '#3b2a22', sw: 3 }); }
    return s + C(cx, cy, Math.min(w, h) * 0.12, '#3b2a22', {});
  };
  K.ghost = function (x, y, w, h) {
    var d = 'M' + r1(x) + ' ' + r1(y + h) + 'V' + r1(y + w / 2) + 'A' + r1(w / 2) + ' ' + r1(w / 2) + ' 0 0 1 ' + r1(x + w) + ' ' + r1(y + w / 2) + 'V' + r1(y + h) + 'l' + r1(-w / 6) + ' -6 l' + r1(-w / 6) + ' 6 l' + r1(-w / 6) + ' -6 l' + r1(-w / 6) + ' 6 l' + r1(-w / 6) + ' -6Z';
    return Pa(d, '#ffffff', { op: 0.55 }) + C(x + w * 0.35, y + w * 0.45, 2.5, '#111', { op: 0.7 }) + C(x + w * 0.65, y + w * 0.45, 2.5, '#111', { op: 0.7 });
  };
  K.statue = function (x, y, w, h, P) { var cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) / 2; return shC(cx, cy, r) + R(cx - r, cy - r, r * 2, r * 2, P.stone, { rx: 3, s: P.line }) + C(cx, cy, r * 0.55, P.metal, { s: P.line, sw: 1 }) + C(cx, cy - r * 0.1, r * 0.25, '#fff', { op: 0.25 }); };
  K.fountain = function (x, y, w, h, P) {
    var cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) / 2;
    return shC(cx, cy, r) + C(cx, cy, r, P.stone, { s: P.line }) + C(cx, cy, r * 0.8, P.water, {}) + C(cx, cy, r * 0.5, 'none', { s: '#fff', sw: 1.2, op: 0.5 }) + C(cx, cy, r * 0.22, P.stone, { s: P.line, sw: 1 }) + C(cx, cy, r * 0.1, '#fff', { op: 0.8 });
  };
  K.bench = function (x, y, w, h, P) {
    var along = h > w, s = sh(x, y, w, h, 2) + R(x, y, w, h, P.wood, { rx: 2, s: P.line });
    for (var k = 1; k < 3; k++) s += along ? Ln(x + w * k / 3, y + 2, x + w * k / 3, y + h - 2, P.wood2, 1) : Ln(x + 2, y + h * k / 3, x + w - 2, y + h * k / 3, P.wood2, 1);
    return s;
  };
  K.pew = function (x, y, w, h, P) { return sh(x, y, w, h, 2) + R(x, y, w, h, P.wood, { rx: 3, s: P.line }) + R(x, y, w, h * 0.3, P.wood2, { rx: 2 }); };
  K.clock = function (x, y, w, h, P) { return sh(x, y, w, h, 2) + R(x, y, w, h, P.wood2, { rx: 2, s: P.line }) + C(x + w / 2, y + Math.min(w, h) / 2 + 2, Math.min(w, h) * 0.35, P.white, { s: P.line, sw: 1 }) + Ln(x + w / 2, y + Math.min(w, h) / 2 + 2, x + w / 2 + 3, y + Math.min(w, h) / 2 - 1, P.line, 1); };
  K.slots = function (x, y, w, h, P) {
    var along = h > w, t = along ? h : w, th = along ? w : h, n = Math.max(1, Math.floor(t / 24)), s = '';
    for (var k = 0; k < n; k++) {
      var a = k * t / n, bx = along ? x : x + a, by = along ? y + a : y, bw = along ? th : t / n - 3, bh = along ? t / n - 3 : th;
      s += sh(bx, by, bw, bh, 3) + R(bx, by, bw, bh, '#2a1030', { rx: 3, s: P.line }) + R(bx + bw * 0.2, by + bh * 0.2, bw * 0.6, bh * 0.45, '#ffd23f', { rx: 2 }) + C(bx + bw * 0.38, by + bh * 0.42, 2.2, '#e0303e', {}) + C(bx + bw * 0.62, by + bh * 0.42, 2.2, '#e0303e', {}) + C(bx + bw * 0.5, by + bh * 0.8, 2.4, P.glow, {});
    }
    return s;
  };
  K.cardtable = function (x, y, w, h, P) {
    var d = 'M' + r1(x) + ' ' + r1(y) + 'H' + r1(x + w) + 'V' + r1(y + h * 0.35) + 'A' + r1(w / 2) + ' ' + r1(h * 0.65) + ' 0 0 1 ' + r1(x) + ' ' + r1(y + h * 0.35) + 'Z', s = '';
    for (var k = 0; k < 5; k++) { var a = Math.PI * (0.1 + k * 0.2), px = x + w / 2 - Math.cos(a) * (w / 2 + 6), py = y + h * 0.35 + Math.sin(a) * (h * 0.65 + 6); s += C(px, py, 7, P.fabric, { s: P.line, sw: 1.2 }); }
    s += Pa(d, P.wood2, { s: P.line }) + Pa('M' + r1(x + 5) + ' ' + r1(y + 4) + 'H' + r1(x + w - 5) + 'V' + r1(y + h * 0.35) + 'A' + r1(w / 2 - 5) + ' ' + r1(h * 0.65 - 5) + ' 0 0 1 ' + r1(x + 5) + ' ' + r1(y + h * 0.35) + 'Z', P.felt, {});
    s += R(x + w / 2 - 10, y + 6, 8, 11, '#fff', { s: '#0004', sw: 0.8 }) + R(x + w / 2 + 2, y + 6, 8, 11, '#fff', { s: '#0004', sw: 0.8 }) + C(x + w * 0.3, y + h * 0.45, 3, '#e0303e', { s: '#fff', sw: 1 }) + C(x + w * 0.7, y + h * 0.45, 3, '#1f55c4', { s: '#fff', sw: 1 });
    return s;
  };
  K.stage = function (x, y, w, h, P) {
    var s = sh(x, y, w, h, 4) + R(x, y, w, h, P.wood, { rx: 4, s: P.line }) + R(x, y, w, h * 0.28, '#9b1b2a', { rx: 4 });
    for (var k = 0; k < Math.floor(w / 16); k++) s += C(x + 8 + k * 16, y + h * 0.28, 8, '#9b1b2a', {});
    return s + E(x + w / 2, y + h * 0.65, w * 0.18, h * 0.16, P.glow, { op: 0.6 }) + C(x + w / 2, y + h * 0.62, 4, '#222', {});
  };
  K.seats = function (x, y, w, h, P) {
    var s = '', rows = Math.max(1, Math.floor(h / 20)), cols = Math.max(1, Math.floor(w / 18));
    for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) s += R(x + i * (w / cols) + 1, y + j * (h / rows) + 1, w / cols - 3, h / rows - 5, P.fabric, { rx: 3, s: P.line, sw: 1 });
    return s;
  };
  K.screens = function (x, y, w, h, P) {
    var s = R(x, y, w, h, '#111', { rx: 2, s: P.line }), cols = Math.max(1, Math.floor(w / 36)), rows = Math.max(1, Math.floor(h / 20)), c = ['#2e7d32', '#1f55c4', '#c62828', '#f9a825'];
    for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) s += R(x + 3 + i * (w - 6) / cols, y + 3 + j * (h - 6) / rows, (w - 6) / cols - 3, (h - 6) / rows - 3, c[(i + j) % 4], { op: 0.8 });
    return s;
  };
  K.dance = function (x, y, w, h, P, o) {
    var cols = P.disco || ['#ff5ad9', '#3df5ff', '#ffe14d', '#7dff6a'], n = 8, m = Math.max(4, Math.round(n * h / w)), s = '';
    var two = o && o.colors;
    for (var i = 0; i < n; i++) for (var j = 0; j < m; j++) s += R(x + i * w / n, y + j * h / m, w / n - 1, h / m - 1, two ? two[(i + j) % 2] : (i + j) % 2 ? cols[(i * 3 + j) % cols.length] : '#ffffff', { op: o && o.faded ? 0.28 : two ? 1 : 0.75 });
    return R(x - 2, y - 2, w + 3, h + 3, 'none', { s: P.line, sw: 1.5 }) + s + (o && o.ball ? C(x + w / 2, y + h / 2, 11, '#d8dde3', { s: '#555', sw: 1 }) + C(x + w / 2 - 3, y + h / 2 - 3, 3, '#fff', {}) : '');
  };
  K.dj = function (x, y, w, h, P) {
    return sh(x, y, w, h, 4) + R(x, y, w, h, '#1b1b22', { rx: 4, s: P.line }) + C(x + w * 0.25, y + h / 2, h * 0.32, '#333', { s: '#888', sw: 1 }) + C(x + w * 0.25, y + h / 2, 2.5, '#ff5ad9', {}) + C(x + w * 0.75, y + h / 2, h * 0.32, '#333', { s: '#888', sw: 1 }) + C(x + w * 0.75, y + h / 2, 2.5, '#3df5ff', {}) + R(x + w * 0.45, y + h * 0.25, w * 0.1, h * 0.5, '#555', { rx: 1 });
  };
  K.beanbag = function (x, y, w, h, P, o) { return shC(x + w / 2, y + h / 2, Math.min(w, h) / 2) + E(x + w / 2, y + h / 2, w / 2, h / 2, (o && o.color) || P.fabric2, { s: P.line }) + E(x + w * 0.45, y + h * 0.45, w * 0.25, h * 0.2, '#fff', { op: 0.18 }); };
  K.toilet = function (x, y, w, h, P) { return sh(x, y, w, h, 4) + R(x, y, w, h * 0.32, '#f4f6f8', { rx: 3, s: P.line }) + E(x + w / 2, y + h * 0.66, w * 0.42, h * 0.34, '#f4f6f8', { s: P.line }) + E(x + w / 2, y + h * 0.68, w * 0.25, h * 0.2, '#bfe3f2', {}); };
  K.tub = function (x, y, w, h, P) { return sh(x, y, w, h, 10) + R(x, y, w, h, '#f4f6f8', { rx: 12, s: P.line }) + R(x + 5, y + 5, w - 10, h - 10, '#bfe3f2', { rx: 9 }) + C(x + w / 2, y + 12, 3, P.metal, {}); };
  K.sink = function (x, y, w, h, P) { return sh(x, y, w, h, 2) + R(x, y, w, h, P.stone, { rx: 3, s: P.line }) + E(x + w / 2, y + h / 2 + 2, w * 0.3, h * 0.28, '#bfe3f2', { s: '#7a9aa8', sw: 1 }); };
  K.car = function (x, y, w, h, P, o) {
    var c = (o && o.color) || P.fabric, vertical = h > w;
    var s = sh(x, y, w, h, 10) + R(x, y, w, h, c, { rx: Math.min(w, h) * 0.3, s: P.line });
    if (vertical) s += R(x + 5, y + h * 0.22, w - 10, h * 0.16, '#1d2430', { rx: 3 }) + R(x + 5, y + h * 0.4, w - 10, h * 0.3, '#fff', { rx: 3, op: 0.22 }) + R(x + 5, y + h * 0.72, w - 10, h * 0.1, '#1d2430', { rx: 3 }) + C(x + 7, y + 6, 2.5, '#ffe9a0', {}) + C(x + w - 7, y + 6, 2.5, '#ffe9a0', {});
    else s += R(x + w * 0.62, y + 5, w * 0.16, h - 10, '#1d2430', { rx: 3 }) + R(x + w * 0.3, y + 5, w * 0.3, h - 10, '#fff', { rx: 3, op: 0.22 }) + R(x + w * 0.18, y + 5, w * 0.1, h - 10, '#1d2430', { rx: 3 });
    return s;
  };
  K.lounger = function (x, y, w, h, P) {
    var s = sh(x, y, w, h, 3) + R(x, y, w, h, P.white, { rx: 3, s: P.line });
    for (var k = 1; k < 5; k++) s += Ln(x + 2, y + h * k / 5, x + w - 2, y + h * k / 5, P.fabric2, 2, { op: 0.8 });
    return s + R(x + 2, y + 2, w - 4, h * 0.22, P.fabric2, { rx: 2, op: 0.9 });
  };
  K.towel = function (x, y, w, h, P) { var s = R(x, y, w, h, P.fabric, { rx: 2, s: P.line, sw: 1 }); for (var k = 1; k < 4; k++) s += Ln(x + 2, y + h * k / 4, x + w - 2, y + h * k / 4, '#fff', 3, { op: 0.6 }); return s; };
  K.jet = function (x, y, w, h, P) {
    var cx = x + w / 2, d = 'M' + r1(cx) + ' ' + r1(y) + 'L' + r1(cx + w * 0.07) + ' ' + r1(y + h * 0.3) + 'L' + r1(x + w) + ' ' + r1(y + h * 0.55) + 'L' + r1(cx + w * 0.07) + ' ' + r1(y + h * 0.6) + 'L' + r1(cx + w * 0.05) + ' ' + r1(y + h * 0.85) + 'L' + r1(cx + w * 0.22) + ' ' + r1(y + h) + 'L' + r1(cx) + ' ' + r1(y + h * 0.94) + 'L' + r1(cx - w * 0.22) + ' ' + r1(y + h) + 'L' + r1(cx - w * 0.05) + ' ' + r1(y + h * 0.85) + 'L' + r1(cx - w * 0.07) + ' ' + r1(y + h * 0.6) + 'L' + r1(x) + ' ' + r1(y + h * 0.55) + 'L' + r1(cx - w * 0.07) + ' ' + r1(y + h * 0.3) + 'Z';
    return '<g transform="translate(3 4)" opacity=".18">' + Pa(d, '#000', {}) + '</g>' + Pa(d, '#8d97a3', { s: P.line, sw: 1.2 }) + E(cx, y + h * 0.2, w * 0.035, h * 0.07, '#2a3a4a', {});
  };
  K.deck = function (x, y, w, h, P, o) {
    var c = (o && o.color) || '#6e737a', s = R(x, y, w, h, c, { rx: 4, s: P.line });
    if (o && o.planks) { for (var k = 1; k < h / 10; k++) s += Ln(x + 2, y + k * 10, x + w - 2, y + k * 10, '#0003', 1); }
    else s += Ln(x + w * 0.1, y + h * 0.5, x + w * 0.9, y + h * 0.5, '#fff', 2, { dash: '10 8', op: 0.6 }) + Ln(x + w * 0.15, y + h * 0.15, x + w * 0.85, y + h * 0.85, '#ffd23f', 1.5, { op: 0.6 });
    return s;
  };
  K.vending = function (x, y, w, h, P) {
    var s = sh(x, y, w, h, 2) + R(x, y, w, h, '#c62828', { rx: 3, s: P.line }) + R(x + 3, y + 3, w * 0.62, h - 6, '#cfe6f2', { rx: 2 });
    for (var j = 0; j < 4; j++) for (var i = 0; i < 3; i++) s += C(x + 7 + i * (w * 0.62 - 8) / 3, y + 8 + j * (h - 14) / 4, 2.2, ['#f9a825', '#1f55c4', '#2e7d32', '#e0303e'][(i + j) % 4], {});
    return s;
  };
  K.copier = function (x, y, w, h, P) { return sh(x, y, w, h, 2) + R(x, y, w, h, '#d9dde2', { rx: 3, s: P.line }) + R(x + 4, y + 4, w - 8, h * 0.4, '#5a6470', { rx: 2 }) + R(x + w * 0.2, y + h * 0.6, w * 0.6, 4, P.white, { s: '#0003', sw: 0.8 }); };
  K.cooler = function (x, y, w, h, P) { var cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) / 2; return shC(cx, cy, r) + R(cx - r, cy - r, r * 2, r * 2, '#e9eef2', { rx: 3, s: P.line }) + C(cx, cy, r * 0.65, '#7fc8f0', { s: '#3b8fc0', sw: 1 }); };
  K.filing = function (x, y, w, h, P) {
    var along = h > w, s = sh(x, y, w, h, 2) + R(x, y, w, h, '#8e98a3', { rx: 2, s: P.line }), n = 3;
    for (var k = 1; k < n; k++) s += along ? Ln(x + 2, y + h * k / n, x + w - 2, y + h * k / n, '#5a6470', 1.2) : Ln(x + w * k / n, y + 2, x + w * k / n, y + h - 2, '#5a6470', 1.2);
    return s;
  };
  K.whiteboard = function (x, y, w, h, P) { var s = R(x, y, w, h, '#fbfbf8', { rx: 1, s: P.line }); s += Ln(x + w * 0.2, y + h * 0.2, x + w * 0.2, y + h * 0.7, '#1f55c4', 1.4) + Ln(x + w * 0.5, y + h * 0.3, x + w * 0.5, y + h * 0.8, '#e0303e', 1.4); return s; };
  K.cubicle = function (x, y, w, h, P) {
    var s = sh(x, y, w, h, 2) + R(x, y, w, h, P.rug2, { rx: 2, op: 0.35 });
    var hw = w / 2, hh = h / 2;
    [[x, y], [x + hw, y], [x, y + hh], [x + hw, y + hh]].forEach(function (p, k) {
      var top = k < 2;
      s += R(p[0] + 4, p[1] + (top ? 4 : hh - 18), hw - 8, 14, P.wood, { rx: 2, s: P.line, sw: 1 }) + R(p[0] + hw / 2 - 8, p[1] + (top ? 5 : hh - 10), 16, 5, '#1d2430', {}) + C(p[0] + hw / 2, p[1] + (top ? 28 : hh - 30), 6, P.fabric2, { s: P.line, sw: 1 });
    });
    return s + R(x + hw - 2, y, 4, h, P.fabric, { rx: 1, s: P.line, sw: 1 }) + R(x, y + hh - 2, w, 4, P.fabric, { rx: 1, s: P.line, sw: 1 }) + R(x, y, w, h, 'none', { rx: 2, s: P.fabric, sw: 3 });
  };
  K.rows = function (x, y, w, h, P) {
    var s = R(x, y, w, h, '#6b4a2b', { rx: 4, s: P.line }), n = Math.max(1, Math.floor(h / 16));
    for (var j = 0; j < n; j++) for (var i = 0; i < Math.floor(w / 12); i++) s += C(x + 7 + i * 12, y + 8 + j * (h - 4) / n, 3.2, j % 2 ? '#8b1e5a' : P.plant, {}) + (j % 2 ? C(x + 7 + i * 12, y + 4 + j * (h - 4) / n, 2, P.plant, {}) : '');
    return s;
  };
  K.barn = function (x, y, w, h, P) { return sh(x, y, w, h, 2) + R(x, y, w, h, '#a8322b', { rx: 2, s: P.line }) + Ln(x, y + h / 2, x + w, y + h / 2, '#fff', 2) + Ln(x, y, x + w, y + h, '#fff', 1.4, { op: 0.6 }) + Ln(x + w, y, x, y + h, '#fff', 1.4, { op: 0.6 }); };
  K.diamond = function (x, y, w, h, P) {
    var cx = x + w / 2, cy = y + h * 0.55, r = Math.min(w, h) * 0.38, s = R(x, y, w, h, P.felt, { rx: 6 });
    for (var k = 0; k < 6; k++) s += R(x, y + k * h / 6, w, h / 12, '#fff', { op: 0.06 });
    s += Pa('M' + r1(cx) + ' ' + r1(cy - r) + 'L' + r1(cx + r) + ' ' + r1(cy) + 'L' + r1(cx) + ' ' + r1(cy + r) + 'L' + r1(cx - r) + ' ' + r1(cy) + 'Z', '#c9894e', {});
    s += Pa('M' + r1(cx) + ' ' + r1(cy - r * 0.6) + 'L' + r1(cx + r * 0.6) + ' ' + r1(cy) + 'L' + r1(cx) + ' ' + r1(cy + r * 0.6) + 'L' + r1(cx - r * 0.6) + ' ' + r1(cy) + 'Z', P.felt, {});
    [[cx, cy - r], [cx + r, cy], [cx, cy + r], [cx - r, cy]].forEach(function (b) { s += R(b[0] - 3, b[1] - 3, 6, 6, '#fff', {}); });
    return s + C(cx, cy, 4, '#c9894e', {});
  };
  K.firepit = function (x, y, w, h, P) { var cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) / 2; return C(cx, cy, r * 1.3, '#ff7a1a', { op: 0.25 }) + C(cx, cy, r, P.stone, { s: P.line }) + C(cx, cy, r * 0.7, '#2a1a10', {}) + C(cx, cy, r * 0.45, '#ff8a1c', {}) + C(cx, cy, r * 0.22, '#ffe14d', {}); };
  K.trash = function (x, y, w, h, P) { var cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) / 2; return shC(cx, cy, r) + C(cx, cy, r, '#3d5a3a', { s: P.line }) + R(cx - r * 0.5, cy - 1.5, r, 3, '#273a25', {}); };
  K.gold = function (x, y, w, h) {
    var s = '', bw = w / 3;
    for (var j = 0; j < 2; j++) for (var i = 0; i < 3 - j; i++) s += Pa('M' + r1(x + i * bw + j * bw / 2 + 2) + ' ' + r1(y + h - j * h / 2) + 'l' + r1(bw * 0.15) + ' ' + r1(-h / 2 + 2) + 'h' + r1(bw * 0.6) + 'l' + r1(bw * 0.15) + ' ' + r1(h / 2 - 2) + 'Z', '#ffcc33', { s: '#9a6a00', sw: 1 });
    return s;
  };
  K.safe = function (x, y, w, h, P) { return sh(x, y, w, h, 3) + R(x, y, w, h, '#4a4f57', { rx: 3, s: P.line }) + R(x + 4, y + 4, w - 8, h - 8, '#5d636c', { rx: 2 }) + C(x + w / 2, y + h / 2, Math.min(w, h) * 0.2, '#c0c0c0', { s: '#222', sw: 1 }) + Ln(x + w / 2, y + h / 2, x + w / 2 + 4, y + h / 2 - 4, '#222', 1.5); };
  K.altar = function (x, y, w, h, P) { return sh(x, y, w, h, 2) + R(x, y, w, h, P.white, { rx: 2, s: P.line }) + R(x + w * 0.35, y + 2, w * 0.3, h - 4, P.fabric, { rx: 1 }); };
  K.flowers = function (x, y, w, h, P) {
    var s = '', cols = ['#ff5a8a', '#fff', '#ffd23f', '#ff8ad0', '#e0303e'];
    for (var k = 0; k < 9; k++) s += C(x + w * (0.2 + (k % 3) * 0.3), y + h * (0.2 + Math.floor(k / 3) * 0.3), Math.min(w, h) * 0.13, k % 2 ? cols[k % cols.length] : P.plant, {});
    return s;
  };
  K.street = function (x, y, w, h, P) {
    var s = R(x, y, w, h, '#4a4d55', {}) + R(x, y, 6, h, '#b7b2a6', {}) + R(x + w - 6, y, 6, h, '#b7b2a6', {});
    for (var k = 0; k < h / 30; k++) s += R(x + w / 2 - 2, y + 6 + k * 30, 4, 14, '#ffd23f', {});
    return s;
  };
  K.lamppost = function (x, y, w, h, P) { var cx = x + w / 2, cy = y + h / 2; return C(cx, cy, 12, '#ffd56a', { op: 0.3 }) + C(cx, cy, 5, '#2b2b2b', { s: '#000', sw: 1 }) + C(cx, cy, 2.5, '#ffe9a0', {}); };
  K.seals = function (x, y, w, h) { return E(x + w * 0.3, y + h * 0.5, w * 0.16, h * 0.18, '#6b625a', { rot: 20 }) + C(x + w * 0.42, y + h * 0.38, h * 0.1, '#6b625a', {}) + E(x + w * 0.7, y + h * 0.55, w * 0.15, h * 0.16, '#7d746b', { rot: -30 }) + C(x + w * 0.6, y + h * 0.42, h * 0.09, '#7d746b', {}); };
  K.pond = function (x, y, w, h, P) { return E(x + w / 2, y + h / 2, w / 2, h / 2, P.water, { s: '#2a7d9a', sw: 2 }) + E(x + w * 0.35, y + h * 0.4, w * 0.1, h * 0.08, '#fff', { op: 0.4 }) + C(x + w * 0.7, y + h * 0.6, 4, P.plant, {}); };
  K.pongtable = function (x, y, w, h, P) {
    var s = sh(x, y, w, h, 2) + R(x, y, w, h, '#2a4a8a', { rx: 2, s: P.line }) + Ln(x + w / 2, y + 2, x + w / 2, y + h - 2, '#fff', 1.5);
    [0, 1].forEach(function (side) {
      var bx = side ? x + w - 18 : x + 6;
      for (var k = 0; k < 6; k++) s += C(bx + (k < 3 ? 0 : k < 5 ? 6 : 12) * (side ? -1 : 1) * -1 + (side ? 0 : 0), y + h / 2 + (k < 3 ? (k - 1) * 8 : k < 5 ? (k - 3.5) * 8 : 0), 3.4, '#d7263d', { s: '#fff', sw: 1 });
    });
    return s;
  };

  /* --------------------------------------------------------- the palettes */
  var PAL = {
    classic: { wood: '#8d5a2e', wood2: '#5b3718', fabric: '#8a2a2a', fabric2: '#2f6b52', rug: '#8a3326', rug2: '#e0b865', metal: '#9a9790', plant: '#5fb26e', plant2: '#1f5a36', pot: '#a0522d', water: '#5fb4d9', felt: '#3a9a62', stone: '#a8a39a', line: '#2a1608', white: '#f3e8cf', glow: '#ffe9a8' },
    haunted: { wood: '#4a3328', wood2: '#2a1b12', fabric: '#5a2a64', fabric2: '#24463c', rug: '#4b1830', rug2: '#b8f06a', metal: '#7a858c', plant: '#5a6a2a', plant2: '#36401a', pot: '#4a3626', water: '#3b6b5a', felt: '#1f4a33', stone: '#5e5a66', line: '#0b0810', white: '#d8d2c0', glow: '#b8f06a' },
    sandiego: { wood: '#c08a55', wood2: '#8c5a2f', fabric: '#2a9fd6', fabric2: '#ff8c5a', rug: '#ffd166', rug2: '#ef476f', metal: '#b0bec5', plant: '#3fae4f', plant2: '#2a7d36', pot: '#d9824a', water: '#3fb6e6', felt: '#4caf50', stone: '#efe3c8', line: '#0b3a52', white: '#ffffff', glow: '#fff2b0', sand: '#f4dfa8' },
    vegas: { wood: '#6a2436', wood2: '#3a0f1c', fabric: '#c2185b', fabric2: '#ffd23f', rug: '#3a0f52', rug2: '#ffd23f', metal: '#c0c0c0', plant: '#2f8f4a', plant2: '#1e5c30', pot: '#8a6a2a', water: '#29b6f6', felt: '#0f7a3f', stone: '#4a3a52', line: '#000000', white: '#fff5e0', glow: '#ffd23f' },
    party: { wood: '#7a5634', wood2: '#4a3018', fabric: '#ff5ad9', fabric2: '#3df5ff', rug: '#2b1645', rug2: '#ff5ad9', metal: '#9aa3ab', plant: '#3fae4f', plant2: '#2a7d36', pot: '#8a5a2a', water: '#2ec4ff', felt: '#2e8b57', stone: '#c9c2d4', line: '#120818', white: '#f5f0ff', glow: '#ffe14d' },
    office: { wood: '#a07850', wood2: '#6e4e30', fabric: '#3b5b8c', fabric2: '#56606e', rug: '#8a94a3', rug2: '#5c6675', metal: '#b7bec6', plant: '#4f9a52', plant2: '#2c6b36', pot: '#d6cfc2', water: '#7fc8f0', felt: '#2e8b57', stone: '#dcd7cc', line: '#1f2a36', white: '#fbfbf8', glow: '#fff6c8' }
  };

  /* --------------------------------------------------------- the layouts
     Rooms, in board order: 0 top left (280x160), 1 top middle (240x280), 2 top right (280x240),
     3 right (320x280), 4 bottom right (240x280), 5 bottom middle (320x280), 6 bottom left
     (200x240), 7 left lower (240x200), 8 left upper (240x200). The corner rooms have a secret
     passage staircase in their outer corner, so nothing goes there. */
  var L = {};
  L.classic = [
    [['rug', 60, 38, 160, 96], ['desk', 88, 48, 104, 26, 0, { monitor: false, chair: false, papers: 1 }], ['lamp', 100, 54, 12, 12], ['plant', 130, 80, 20, 20], ['armchair', 226, 50, 34, 34, -14], ['shelf', 253, 92, 16, 56]],
    [['runner', 85, 40, 70, 208], ['bench', 14, 96, 22, 60], ['bench', 204, 160, 22, 60], ['clock', 204, 40, 22, 40], ['round', 14, 40, 28, 28, 0, { n: 0, flower: 1 }], ['plant', 16, 224, 26, 26], ['plant', 198, 224, 26, 26]],
    [['rug', 50, 56, 180, 134, 0, { green: 1 }], ['sofa', 80, 62, 120, 30], ['armchair', 58, 118, 36, 36, -90], ['armchair', 186, 118, 36, 36, 90], ['round', 116, 118, 48, 34, 0, { n: 0 }], ['fireplace', 9, 84, 24, 84], ['plant', 16, 196, 28, 28]],
    [['rug', 40, 50, 240, 184], ['table', 60, 96, 200, 92, 0, { cloth: 1, plates: 1 }], ['chandelier', 146, 128, 28, 28], ['sideboard', 100, 11, 120, 22], ['plant', 16, 234, 30, 30], ['plant', 274, 234, 30, 30]],
    [['counter', 9, 9, 160, 28, 0, { sink: 1, stove: 1 }], ['fridge', 195, 9, 36, 60], ['bottles', 9, 60, 22, 120], ['table', 60, 108, 120, 72, 0, { roast: 1 }], ['crates', 200, 100, 28, 62]],
    [['parquet', 70, 52, 180, 136], ['piano', 16, 170, 84, 66], ['bench', 36, 240, 30, 12], ['sofa', 296, 150, 24, 80], ['plant', 16, 16, 30, 30], ['plant', 274, 16, 30, 30], ['sofa', 110, 14, 100, 26], ['plant', 260, 220, 30, 30]],
    [['bench', 52, 18, 96, 24], ['round', 76, 150, 48, 48, 0, { n: 0, white: 1, flower: 1 }], ['plant', 20, 56, 40, 40], ['plant', 146, 70, 34, 34], ['plant', 150, 150, 34, 34], ['plant', 30, 160, 30, 30]],
    [['billiard', 40, 54, 160, 88], ['cues', 215, 50, 14, 80], ['armchair', 40, 158, 30, 28], ['armchair', 80, 158, 30, 28], ['plant', 198, 158, 28, 28]],
    [['shelf', 30, 11, 70, 16], ['shelf', 213, 46, 16, 110], ['rug', 44, 50, 150, 104], ['round', 96, 78, 48, 48, 0, { n: 0 }], ['armchair', 58, 88, 30, 30, -90], ['armchair', 152, 88, 30, 30, 90], ['sofa', 66, 160, 108, 26], ['lamp', 14, 172, 14, 14]]
  ];
  L.haunted = [
    [['grave', 58, 50, 26, 36], ['grave', 94, 56, 26, 36], ['coffin', 136, 52, 82, 30], ['candles', 226, 52, 26, 26], ['grave', 196, 100, 26, 36], ['web', 232, 0, 48, 48, 0, { corner: 'tr' }], ['web', 0, 112, 48, 48, 0, { corner: 'bl' }]],
    [['runner', 92, 46, 56, 228], ['candles', 14, 50, 28, 28], ['candles', 198, 50, 28, 28], ['statue', 14, 104, 30, 30], ['statue', 196, 104, 30, 30], ['clock', 206, 150, 22, 34], ['web', 0, 232, 48, 48, 0, { corner: 'bl' }], ['web', 192, 232, 48, 48, 0, { corner: 'br' }]],
    [['rug', 54, 66, 170, 120], ['round', 100, 80, 80, 80, 0, { n: 6, ball: 1 }], ['candles', 34, 70, 24, 24], ['fireplace', 8, 106, 22, 80], ['armchair', 214, 108, 34, 34, 90], ['web', 0, 0, 44, 44, 0, { corner: 'tl' }], ['candles', 236, 190, 24, 24]],
    [['table', 64, 96, 192, 62, 0, { cloth: 1, plates: 1 }], ['candles', 110, 114, 26, 26], ['candles', 184, 114, 26, 26], ['pumpkin', 284, 52, 28, 28], ['pumpkin', 12, 220, 26, 26], ['web', 272, 232, 48, 48, 0, { corner: 'br' }], ['shelf', 290, 98, 20, 90, 0, { jars: 1 }]],
    [['cauldron', 82, 98, 76, 76], ['shelf', 8, 48, 22, 176, 0, { jars: 1 }], ['counter', 96, 46, 104, 24], ['candles', 202, 54, 26, 26], ['pumpkin', 194, 106, 30, 30], ['web', 192, 0, 48, 48, 0, { corner: 'tr' }]],
    [['dance', 76, 60, 168, 132, 0, { faded: 1 }], ['piano', 14, 150, 72, 58], ['ghost', 120, 86, 34, 44], ['ghost', 198, 130, 30, 40], ['chandelier', 146, 112, 28, 28], ['web', 0, 44, 46, 46, 0, { corner: 'tl' }], ['web', 274, 44, 46, 46, 0, { corner: 'tr' }]],
    [['deadtree', 104, 44, 84, 84], ['pumpkin', 56, 56, 30, 30], ['pumpkin', 150, 136, 34, 34], ['grave', 64, 108, 26, 36], ['plant', 150, 190, 30, 30]],
    [['table', 44, 64, 148, 56, 0, { chairs: false, flasks: 1 }], ['cauldron', 196, 50, 38, 38], ['shelf', 8, 54, 16, 104, 0, { jars: 1 }], ['candles', 200, 104, 24, 24]],
    [['shelf', 8, 46, 20, 146], ['shelf', 212, 42, 20, 34], ['shelf', 212, 126, 20, 66], ['rug', 46, 66, 154, 94], ['round', 98, 82, 50, 50, 0, { n: 0 }], ['candles', 110, 94, 26, 26], ['armchair', 56, 88, 34, 34, -90], ['web', 0, 0, 44, 44, 0, { corner: 'tl' }], ['web', 196, 156, 44, 44, 0, { corner: 'br' }]]
  ];
  L.sandiego = [
    [['sand', 9, 44, 262, 50], ['sea', 9, 94, 262, 57], ['rocks', 54, 76, 84, 40], ['seals', 150, 92, 80, 40], ['umbrella', 196, 46, 36, 36], ['towel', 240, 52, 20, 32]],
    [['street', 78, 9, 84, 262], ['lamppost', 62, 64, 14, 14], ['lamppost', 164, 120, 14, 14], ['lamppost', 62, 176, 14, 14], ['round', 10, 92, 52, 52, 0, { n: 2, umbrella: 1 }], ['round', 178, 160, 52, 52, 0, { n: 2, umbrella: 1 }], ['round', 10, 196, 52, 52, 0, { n: 2 }], ['palm', 182, 54, 46, 46]],
    [['pool', 70, 72, 138, 78], ['lounger', 30, 70, 22, 50], ['lounger', 226, 92, 22, 50], ['palm', 16, 150, 54, 54], ['umbrella', 214, 160, 44, 44], ['plant', 100, 166, 30, 30]],
    [['round', 46, 66, 64, 64, 0, { n: 4, umbrella: 1 }], ['round', 210, 66, 64, 64, 0, { n: 4, umbrella: 1 }], ['round', 128, 128, 64, 64, 0, { n: 4, cloth: 1 }], ['flowers', 282, 150, 30, 40], ['plant', 12, 220, 28, 28], ['palm', 274, 214, 40, 40]],
    [['sea', 9, 230, 222, 41], ['umbrella', 36, 66, 44, 44], ['towel', 86, 72, 22, 38], ['umbrella', 140, 122, 44, 44], ['towel', 94, 140, 22, 38], ['umbrella', 40, 170, 36, 36]],
    [['sea', 9, 9, 302, 262], ['deck', 34, 40, 252, 200], ['jet', 70, 74, 84, 76], ['jet', 172, 112, 76, 70]],
    [['tree', 20, 54, 56, 56], ['palm', 118, 50, 56, 56], ['pond', 60, 116, 92, 52], ['tree', 140, 168, 50, 50]],
    [['diamond', 20, 36, 200, 132]],
    [['fountain', 86, 66, 68, 68], ['palm', 16, 60, 46, 46], ['palm', 178, 118, 46, 46], ['flowers', 174, 54, 40, 34], ['flowers', 20, 120, 40, 34]]
  ];
  L.vegas = [
    [['gold', 150, 48, 56, 32], ['gold', 212, 48, 56, 32], ['safe', 150, 94, 40, 40], ['safe', 196, 100, 34, 34], ['gold', 60, 104, 50, 28], ['crates', 236, 100, 36, 34]],
    [['slots', 10, 52, 30, 192], ['slots', 200, 52, 30, 192], ['cardtable', 70, 82, 100, 64], ['cardtable', 70, 168, 100, 64]],
    [['bed', 28, 56, 96, 104], ['hottub', 146, 68, 74, 74], ['sofa', 146, 160, 88, 30], ['plant', 238, 196, 30, 30], ['nightstand', 128, 58, 16, 16]],
    [['counter', 36, 52, 248, 30, 0, { food: 1 }], ['round', 44, 108, 58, 58, 0, { cloth: 1 }], ['round', 132, 120, 58, 58, 0, { cloth: 1 }], ['round', 220, 108, 58, 58, 0, { cloth: 1 }], ['plant', 284, 220, 28, 28]],
    [['runner', 108, 76, 24, 200], ['altar', 86, 48, 68, 24], ['flowers', 56, 46, 26, 26], ['flowers', 158, 46, 26, 26], ['pew', 30, 92, 72, 18], ['pew', 138, 92, 62, 18], ['pew', 30, 124, 72, 18], ['pew', 138, 124, 62, 18], ['pew', 30, 156, 72, 18], ['pew', 138, 156, 54, 18]],
    [['stage', 60, 48, 200, 64], ['seats', 64, 124, 192, 84]],
    [['pool', 52, 58, 104, 70], ['lounger', 14, 56, 22, 50], ['lounger', 170, 70, 22, 50], ['palm', 136, 140, 50, 50], ['umbrella', 62, 140, 40, 40]],
    [['screens', 24, 46, 192, 40], ['seats', 40, 98, 160, 44]],
    [['cardtable', 56, 60, 128, 70], ['lamp', 22, 54, 14, 14], ['lamp', 204, 54, 14, 14], ['plant', 14, 150, 30, 30], ['safe', 202, 140, 30, 30]]
  ];
  L.party = [
    [['bed', 96, 46, 88, 102], ['nightstand', 70, 50, 22, 22], ['nightstand', 188, 50, 22, 22], ['shelf', 234, 48, 38, 18], ['towel', 50, 112, 26, 18], ['beanbag', 222, 100, 34, 28]],
    [['car', 150, 54, 52, 94, 0, { color: '#e0303e' }], ['car', 36, 130, 52, 94, 0, { color: '#3df5ff' }], ['trash', 14, 54, 22, 22], ['trash', 40, 54, 22, 22], ['flowers', 160, 220, 50, 36]],
    [['hottub', 96, 70, 86, 86], ['towel', 48, 82, 22, 40], ['towel', 200, 104, 22, 40], ['lamp', 52, 150, 14, 14], ['plant', 236, 192, 30, 30]],
    [['counter', 86, 96, 150, 50, 0, { pizza: 1, cups: 1 }], ['fridge', 282, 46, 30, 42], ['counter', 110, 46, 120, 22, 0, { sink: 1 }], ['trash', 284, 210, 24, 24], ['beanbag', 20, 210, 40, 30]],
    [['tub', 8, 48, 44, 96], ['toilet', 84, 48, 30, 42], ['sink', 132, 48, 48, 26], ['rug', 76, 110, 104, 56], ['towel', 200, 52, 22, 36]],
    [['dj', 112, 50, 96, 32], ['dance', 74, 94, 172, 112, 0, { ball: 1 }], ['beanbag', 16, 56, 40, 32], ['beanbag', 266, 56, 40, 32, 0, { color: '#ff5ad9' }]],
    [['firepit', 72, 78, 56, 56], ['beanbag', 30, 60, 30, 26], ['beanbag', 140, 120, 30, 26, 0, { color: '#ff5ad9' }], ['grass', 20, 176, 160, 56]],
    [['car', 14, 50, 62, 112, 0, { color: '#ffe14d' }], ['pongtable', 100, 66, 108, 52], ['fridge', 206, 46, 28, 40], ['crates', 98, 136, 62, 24]],
    [['rug', 54, 66, 132, 96], ['tv', 90, 11, 60, 16], ['sofa', 60, 150, 120, 30], ['beanbag', 16, 100, 34, 28], ['table', 94, 96, 52, 28, 0, { chairs: false }], ['plant', 200, 150, 28, 28]]
  ];
  L.office = [
    [['rug', 110, 44, 150, 100], ['desk', 140, 54, 90, 34, 0, { mug: 1 }], ['filing', 240, 100, 30, 50], ['plant', 18, 110, 32, 32], ['whiteboard', 120, 9, 60, 8], ['tv', 60, 118, 30, 18]],
    [['desk', 70, 50, 100, 36, 0, { chair: false }], ['sofa', 20, 212, 120, 30], ['table', 156, 208, 60, 30, 0, { chairs: false }], ['plant', 200, 50, 30, 30], ['plant', 14, 50, 30, 30], ['copier', 190, 110, 40, 50], ['round', 26, 120, 44, 44, 0, { n: 0 }]],
    [['whiteboard', 60, 9, 160, 8], ['table', 60, 80, 160, 70, 0, { papers: 1 }], ['tv', 250, 70, 18, 60], ['plant', 16, 190, 30, 30], ['plant', 234, 190, 30, 30]],
    [['vending', 20, 50, 34, 60], ['vending', 58, 50, 34, 60], ['fridge', 270, 50, 36, 56], ['counter', 110, 46, 140, 24, 0, { sink: 1 }], ['round', 60, 150, 60, 60, 0, { n: 4 }], ['round', 200, 150, 60, 60, 0, { n: 4 }], ['cooler', 280, 220, 28, 28]],
    [['rack', 10, 50, 24, 180], ['rack', 206, 50, 24, 180], ['crates', 60, 60, 68, 46], ['crates', 150, 120, 70, 46], ['forklift', 80, 170, 50, 70]],
    [['cubicle', 40, 50, 110, 100], ['cubicle', 170, 50, 110, 100], ['cubicle', 40, 160, 110, 100], ['copier', 190, 190, 34, 46], ['plant', 250, 190, 30, 30], ['plant', 14, 120, 28, 28]],
    [['rows', 20, 50, 160, 60], ['rows', 20, 120, 160, 60], ['barn', 130, 190, 56, 38], ['tree', 20, 190, 40, 40]],
    [['desk', 30, 60, 80, 34], ['desk', 130, 60, 80, 34], ['filing', 200, 130, 30, 50], ['cooler', 20, 150, 24, 24], ['plant', 60, 150, 28, 28]],
    [['desk', 20, 60, 70, 30], ['desk', 100, 60, 70, 30], ['desk', 60, 130, 70, 30], ['filing', 200, 56, 30, 60], ['plant', 200, 150, 30, 30]]
  ];

  // Draw one piece. A quarter turn draws it the other way round inside the same footprint.
  function piece(it, P) {
    var kind = it[0], x = it[1], y = it[2], w = it[3], h = it[4], rot = it[5] || 0, o = it[6] || {}, f = K[kind];
    if (!f || !w || !h) return '';
    if (!rot) return f(x, y, w, h, P, o);
    var cx = x + w / 2, cy = y + h / 2, q = Math.abs(rot) % 180 === 90;
    var ww = q ? h : w, hh = q ? w : h;
    return '<g transform="rotate(' + rot + ' ' + r1(cx) + ' ' + r1(cy) + ')">' + f(cx - ww / 2, cy - hh / 2, ww, hh, P, o) + '</g>';
  }

  // Everything in room i for a board look, drawn at the room's position on the board.
  D.room = function (look, i, X, Y, W, H) {
    var lay = (L[look] || L.classic)[i], P = PAL[look] || PAL.classic;
    if (!lay) return '';
    var id = 'rc' + look + i;
    return '<clipPath id="' + id + '"><rect x="0" y="0" width="' + W + '" height="' + H + '"/></clipPath><g transform="translate(' + X + ' ' + Y + ')" clip-path="url(#' + id + ')">' + lay.map(function (it) { return piece(it, P); }).join('') + '</g>';
  };
  /* ---------------------------------------------------------- the skins
     How each board looks, from Camden's Claude Design boards (Clue Board v2 for the classic
     mansion, Themed Boards for the rest): the frame around the board, the hallway tiles, each
     room's floor, the trim, windows, doors, name plaques, the secret-passage stairs and the case
     file in the middle. Floors: ['wood', c] / ['wood', [c1, c2]], ['carpet', c], ['check', a, b,
     size], ['grass', a, b], ['dots', base, dot, r, sx, sy], ['grid', base, line, size],
     ['lines', base, dir, step, line], ['stripes', a, b, size], ['plain', c]. */
  var SKINS = {
    classic: {
      frame: { base: ['#17241c', '#060a08'], spots: [[3, 5, 'rgba(62,112,62,.6)', 140], [97, 4, 'rgba(62,112,62,.55)', 130], [1, 58, 'rgba(52,100,56,.5)', 120], [99, 54, 'rgba(52,100,56,.45)', 130], [4, 97, 'rgba(62,112,62,.55)', 140], [96, 97, 'rgba(62,112,62,.55)', 140], [50, 1, 'rgba(72,120,72,.35)', 120], [50, 99, 'rgba(72,120,72,.3)', 120]] },
      tiles: [['#878992', '#696c75'], ['#7d7f89', '#5e616a'], ['#8f919a', '#6f727b']], tileLine: 'rgba(0,0,0,.45)', tileHi: 'rgba(255,255,255,.14)',
      trim: '#cf4f2b', trimLine: '#3a1a0e', glow: ['rgba(255,214,140,.38)', 45], vignette: 'rgba(15,8,4,.6)',
      floors: [['wood', ['#7a4a24', '#5f3717']], ['wood', ['#b07a42', '#966434']], ['wood', ['#9a6433', '#7f4f26']], ['wood', ['#a06a36', '#86551f']], ['check', '#f0ece2', '#1e1c1c', 40], ['wood', ['#c08a4e', '#a8743c']], ['check', '#e8e2c8', '#3f7a4a', 40], ['wood', ['#8d5c2c', '#724719']], ['wood', ['#7f4f26', '#653b1a']]],
      plaqueBg: '#15110e', plaqueInk: '#f1e4c4', plaqueRing: '#cfae6a', windows: '#d7ecff', windowFrame: '#3a2414', door: '#d9542c', threshold: '#c9a070', thresholdLine: '#5a3a1a',
      stairsBg: '#15110e', stairsBar: '#e2b85c', stairsRing: '#cfae6a', labelInk: '#f1e4c4', shortStairs: true,
      center: ['#4a3f47', '#241d22'], centerRing: '#15110e', centerRing2: '#cfae6a', centerInk: '#e2b85c', envelope: ['#f6ecd4', '#e8d9b4'], envelopeLine: '#5a3d1a', seal: '#c93040', staircase: true
    },
    haunted: {
      frame: { base: ['#1b1128', '#05030c'], spots: [[18, 12, 'rgba(140,130,170,.22)', 300], [82, 78, 'rgba(140,130,170,.18)', 320], [50, 100, 'rgba(90,70,120,.25)', 420]] },
      tiles: [['#6f6b78', '#4f4b58'], ['#65616e', '#45414e'], ['#777380', '#56525f']], tileLine: 'rgba(0,0,0,.5)', tileHi: 'rgba(255,255,255,.1)',
      trim: '#2a1838', trimLine: '#b8f06a', glow: ['rgba(184,240,106,.2)', 45], vignette: 'rgba(0,0,0,.7)',
      floors: [['grid', '#2c2236', 'rgba(0,0,0,.45)', 40], ['wood', '#3a2c4a'], ['wood', '#47285a'], ['wood', '#352a40'], ['check', '#283b2c', '#1c2a1f', 40], ['wood', '#3e2749'], ['check', '#2a2e26', '#3a3f33', 40], ['grid', '#1f3a35', 'rgba(0,0,0,.4)', 40], ['wood', '#3a2e24']],
      plaqueBg: '#0b0810', plaqueInk: '#b8f06a', plaqueRing: '#5a7a30', windows: '#c9d4ff', windowFrame: '#2a1838', door: '#b8f06a', threshold: '#5e5a66', thresholdLine: 'rgba(0,0,0,.5)',
      stairsBg: '#0b0b0d', stairsBar: '#b8f06a', stairsRing: '#b8f06a', labelInk: '#f1e4c4',
      center: ['#1d1030', '#120a1c'], centerRing: '#000', centerRing2: '#b8f06a', centerInk: '#b8f06a', envelope: ['#d8d2c0', '#c2bcaa'], envelopeLine: 'rgba(0,0,0,.45)', seal: '#58d13a'
    },
    sandiego: {
      frame: { base: ['#2a9fd0', '#05304a'], mid: '#0d5f86', spots: [[85, 10, 'rgba(255,240,180,.35)', 240]], waves: true },
      tiles: [['#f6e3b4', '#e9d39c'], ['#f0dcab', '#e2cb92'], ['#f9e8bc', '#edd8a3']], tileLine: '#cbb27a', tileHi: 'rgba(255,255,255,.5)',
      trim: '#0b4a68', trimLine: '#ffffff', glow: ['rgba(255,255,255,.28)', 40], vignette: 'rgba(0,40,70,.28)',
      floors: [['dots', '#f2dca6', '#c9a96a', 0.9, 9, 7], ['dots', '#b7b2a6', 'rgba(0,0,0,.16)', 2.1, 14, 14], ['lines', '#f7d478', 90, 24, 'rgba(0,0,0,.08)'], ['check', '#ec8466', '#d9704f', 40], ['dots', '#f2dca6', '#c9a96a', 0.9, 9, 7], ['lines', '#6e737a', 180, 12, 'rgba(0,0,0,.2)'], ['grass', '#9fd34a', '#6fa32e'], ['stripes', '#4caf50', '#43a047', 20], ['grass', '#9ccd77', '#6b9a4a']],
      plaqueBg: '#0b4a68', plaqueInk: '#ffcf4d', plaqueRing: '#ffffff', windows: null, door: '#e63946', threshold: '#efe3c8', thresholdLine: 'rgba(0,0,0,.5)',
      stairsBg: '#0b0b0d', stairsBar: '#ffcf4d', stairsRing: '#ffcf4d', labelInk: '#f1e4c4',
      center: ['#12779f', '#0b4a68'], centerRing: '#000', centerRing2: '#ffcf4d', centerInk: '#ffcf4d', envelope: ['#fff8e6', '#e6dfcf'], envelopeLine: 'rgba(0,0,0,.45)', seal: '#e63946'
    },
    vegas: {
      frame: { base: ['#1a0622', '#060109'], spots: [[8, 18, 'rgba(255,63,164,.4)', 260], [92, 28, 'rgba(61,245,255,.35)', 260], [80, 92, 'rgba(255,210,63,.3)', 260], [15, 85, 'rgba(61,245,255,.25)', 240]] },
      tiles: [['#8e1a30', '#6e0f22'], ['#84142a', '#64091c'], ['#961f36', '#761328']], tileLine: '#4c0815', tileHi: 'rgba(255,255,255,.08)', tileDots: 'rgba(255,210,63,.55)',
      trim: '#ff3fa4', trimLine: '#000000', neon: 'rgba(255,63,164,.55)', glow: ['rgba(61,245,255,.16)', 45], vignette: 'rgba(0,0,0,.6)',
      floors: [['grid', '#1d0b29', 'rgba(255,255,255,.05)', 20], ['check', '#3a0f52', '#2a0a3a', 20], ['carpet', '#1a0d2c'], ['carpet', '#24102a'], ['lines', '#f3eee6', 90, 30, 'rgba(0,0,0,.05)'], ['carpet', '#28102e'], ['lines', '#e8d9b8', 90, 24, 'rgba(0,0,0,.12)'], ['carpet', '#1f0c26'], ['dots', '#1a1030', 'rgba(255,210,63,.3)', 1.5, 16, 16]],
      plaqueBg: '#000000', plaqueInk: '#ffd23f', plaqueRing: '#ff3fa4', windows: null, door: '#3df5ff', threshold: '#4a3a52', thresholdLine: 'rgba(0,0,0,.5)',
      stairsBg: '#0b0b0d', stairsBar: '#ffd23f', stairsRing: '#ffd23f', labelInk: '#f1e4c4',
      center: ['#12061a', '#0b0410'], centerRing: '#000', centerRing2: '#ffd23f', centerInk: '#ffd23f', envelope: ['#fff5e0', '#e6dcc9'], envelopeLine: 'rgba(0,0,0,.45)', seal: '#ff3fa4'
    },
    party: {
      frame: { base: ['#1d0833', '#08020f'], spots: [[12, 12, 'rgba(255,225,77,.2)', 260], [88, 72, 'rgba(255,90,217,.2)', 280], [50, 100, 'rgba(61,245,255,.15)', 320]] },
      tiles: [['#a87a4e', '#96683f'], ['#9e7046', '#8c6038'], ['#b08254', '#9c6e44']], tileLine: '#6e4627', tileHi: 'rgba(255,255,255,.15)', tileDir: 90,
      trim: '#170c20', trimLine: '#ffe14d', glow: ['rgba(255,90,217,.22)', 45], vignette: 'rgba(0,0,0,.55)',
      floors: [['carpet', '#5a2f80'], ['grass', '#2d7363', '#1e5245'], ['lines', '#9b6a3e', 180, 10, 'rgba(0,0,0,.25)'], ['check', '#f0ece2', '#d8d2c4', 40], ['check', '#e8f0f2', '#c9dde3', 20], ['carpet', '#6a2380'], ['lines', '#8a5a34', 180, 10, 'rgba(0,0,0,.25)'], ['plain', '#6a6a6a', 'stain'], ['carpet', '#2e3480']],
      plaqueBg: '#120818', plaqueInk: '#ff5ad9', plaqueRing: '#3df5ff', windows: '#ffe9a0', windowFrame: '#170c20', door: '#ffe14d', threshold: '#a37147', thresholdLine: 'rgba(0,0,0,.5)',
      stairsBg: '#0b0b0d', stairsBar: '#ff5ad9', stairsRing: '#ff5ad9', labelInk: '#f1e4c4',
      center: ['#230a32', '#16061f'], centerRing: '#000', centerRing2: '#ff5ad9', centerInk: '#ff5ad9', envelope: ['#f5f0ff', '#ddd8e6'], envelopeLine: 'rgba(0,0,0,.45)', seal: '#ff5ad9'
    },
    office: {
      frame: { base: ['#2b4867', '#0a1522'], spots: [[10, 10, 'rgba(255,246,200,.18)', 240], [90, 90, 'rgba(255,246,200,.14)', 240]], panels: true },
      tiles: [['#aab3be', '#99a2ad'], ['#a3acb7', '#929ba6'], ['#b1bac5', '#a0a9b4']], tileLine: '#6c7684', tileHi: 'rgba(255,255,255,.3)',
      trim: '#1f2a36', trimLine: '#f2c14e', glow: ['rgba(255,255,255,.24)', 40], vignette: 'rgba(0,0,0,.3)',
      floors: [['carpet', '#dccfb3'], ['carpet', '#cfd8e3'], ['carpet', '#c3d0db'], ['check', '#e5d6bb', '#d4c5a8', 40], ['plain', '#9a9a96', 'lanes'], ['carpet', '#d4dbe3'], ['grass', '#8a6a3e', '#6b4f2a'], ['carpet', '#d9ccbd'], ['carpet', '#cdd5dc']],
      plaqueBg: '#203750', plaqueInk: '#fbfbf8', plaqueRing: '#f2c14e', windows: '#cfe6f2', windowFrame: '#1f2a36', door: '#f2c14e', threshold: '#dcd7cc', thresholdLine: 'rgba(0,0,0,.5)',
      stairsBg: '#0b0b0d', stairsBar: '#f2c14e', stairsRing: '#f2c14e', labelInk: '#1f2a36',
      center: ['#335880', '#203750'], centerRing: '#000', centerRing2: '#f2c14e', centerInk: '#f2c14e', envelope: ['#fbfbf8', '#e2e2de'], envelopeLine: 'rgba(0,0,0,.45)', seal: '#c62828'
    }
  };

  function shade(hex, f) {
    if (!hex || hex[0] !== '#') return hex;
    var h = hex.slice(1); if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    var n = parseInt(h, 16);
    return 'rgb(' + Math.round(((n >> 16) & 255) * f) + ',' + Math.round(((n >> 8) & 255) * f) + ',' + Math.round((n & 255) * f) + ')';
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  // Roughly how wide a line of Anton is.
  function textW(str, fs, ls) { return str.length * fs * 0.5 + (str.length - 1) * (ls || 0); }

  // A floor pattern as SVG defs + the fill to use.
  function floorDef(id, f) {
    var kind = f[0], d = '', fill;
    if (kind === 'wood') {
      var c1 = Array.isArray(f[1]) ? f[1][0] : f[1], c2 = Array.isArray(f[1]) ? f[1][1] : shade(f[1], 0.8);
      d += '<linearGradient id="' + id + 'g" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c2 + '"/></linearGradient>';
      d += '<pattern id="' + id + '" width="32" height="7" patternUnits="userSpaceOnUse"><rect width="32" height="7" fill="url(#' + id + 'g)"/><rect width="1" height="7" fill="rgba(40,20,5,.35)"/><rect width="32" height="2" fill="rgba(255,255,255,.04)"/></pattern>';
      // the gradient runs across the whole room, so the plank lines go in a pattern over a gradient rect
      fill = { base: 'url(#' + id + 'g)', over: 'url(#' + id + 'p)' };
      d += '<pattern id="' + id + 'p" width="32" height="7" patternUnits="userSpaceOnUse"><rect width="1" height="7" fill="rgba(40,20,5,.35)"/><rect width="32" height="2" fill="rgba(255,255,255,.04)"/></pattern>';
    } else if (kind === 'carpet') {
      d += '<pattern id="' + id + '" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="8" fill="rgba(255,255,255,.05)"/></pattern><pattern id="' + id + 'b" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><rect width="3" height="8" fill="rgba(0,0,0,.08)"/></pattern>';
      fill = { base: f[1], over: 'url(#' + id + ')', over2: 'url(#' + id + 'b)' };
    } else if (kind === 'check') {
      var sz = f[3] || 40;
      d += '<pattern id="' + id + '" width="' + sz * 2 + '" height="' + sz * 2 + '" patternUnits="userSpaceOnUse"><rect width="' + sz * 2 + '" height="' + sz * 2 + '" fill="' + f[2] + '"/><rect width="' + sz + '" height="' + sz + '" fill="' + f[1] + '"/><rect x="' + sz + '" y="' + sz + '" width="' + sz + '" height="' + sz + '" fill="' + f[1] + '"/></pattern>';
      fill = { base: 'url(#' + id + ')' };
    } else if (kind === 'grass') {
      d += '<pattern id="' + id + '" width="13" height="11" patternUnits="userSpaceOnUse"><circle cx="6.5" cy="5.5" r="1.2" fill="' + f[2] + '"/></pattern>';
      fill = { base: f[1], over: 'url(#' + id + ')' };
    } else if (kind === 'dots') {
      d += '<pattern id="' + id + '" width="' + f[4] + '" height="' + f[5] + '" patternUnits="userSpaceOnUse"><circle cx="' + f[4] / 2 + '" cy="' + f[5] / 2 + '" r="' + f[3] + '" fill="' + f[2] + '"/></pattern>';
      fill = { base: f[1], over: 'url(#' + id + ')' };
    } else if (kind === 'grid') {
      d += '<pattern id="' + id + '" width="' + f[3] + '" height="' + f[3] + '" patternUnits="userSpaceOnUse"><rect width="1.5" height="' + f[3] + '" fill="' + f[2] + '"/><rect width="' + f[3] + '" height="1.5" fill="' + f[2] + '"/></pattern>';
      fill = { base: f[1], over: 'url(#' + id + ')' };
    } else if (kind === 'lines') {
      var vert = f[2] === 90;
      d += '<pattern id="' + id + '" width="' + (vert ? f[3] : 1) + '" height="' + (vert ? 1 : f[3]) + '" patternUnits="userSpaceOnUse"><rect width="' + (vert ? 1 : 1) + '" height="' + (vert ? 1 : 1) + '" fill="' + f[4] + '"/></pattern>';
      fill = { base: f[1], over: 'url(#' + id + ')' };
    } else if (kind === 'stripes') {
      d += '<pattern id="' + id + '" width="' + f[3] * 2 + '" height="1" patternUnits="userSpaceOnUse"><rect width="' + f[3] * 2 + '" height="1" fill="' + f[2] + '"/><rect width="' + f[3] + '" height="1" fill="' + f[1] + '"/></pattern>';
      fill = { base: 'url(#' + id + ')' };
    } else fill = { base: f[1], extra: f[2] };
    return { defs: d, fill: fill };
  }

  /* The whole board: the frame, the hallway, the rooms and the case file. Field coordinates
     (0,0 is the top left square); the frame sits 40 px outside the field on every side. */
  D.board = function (look, theme, Bd, opts) {
    opts = opts || {};
    var S = SKINS[look] || SKINS.classic, P = PAL[look] || PAL.classic, CELL = 40, W = Bd.COLS * CELL, H = Bd.ROWS * CELL, F = 40;
    var h = [], defs = [], uid = 'k' + look;
    var i, j, k;
    h.push('<svg class="bsvg" viewBox="' + (-F) + ' ' + (-F) + ' ' + (W + 2 * F) + ' ' + (H + 2 * F) + '" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">');
    // ---- defs
    defs.push('<radialGradient id="' + uid + 'frame" cx="50%" cy="50%" r="70%"><stop offset="0" stop-color="' + S.frame.base[0] + '"/>' + (S.frame.mid ? '<stop offset=".6" stop-color="' + S.frame.mid + '"/>' : '') + '<stop offset="1" stop-color="' + S.frame.base[1] + '"/></radialGradient>');
    (S.frame.spots || []).forEach(function (sp, n) { defs.push('<radialGradient id="' + uid + 'sp' + n + '"><stop offset="0" stop-color="' + sp[2] + '"/><stop offset="1" stop-color="' + sp[2].replace(/,[^,]+\)$/, ',0)') + '"/></radialGradient>'); });
    S.tiles.forEach(function (t, n) { defs.push('<linearGradient id="' + uid + 't' + n + '" x1="0" y1="0" x2="' + (S.tileDir === 90 ? 1 : 1) + '" y2="' + (S.tileDir === 90 ? 0 : 1) + '"><stop offset="0" stop-color="' + t[0] + '"/><stop offset="1" stop-color="' + t[1] + '"/></linearGradient>'); });
    Bd.SUSPECT_COLORS.forEach(function (c, n) { defs.push('<linearGradient id="' + uid + 'st' + n + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c.c1 + '"/><stop offset="1" stop-color="' + c.c2 + '"/></linearGradient>'); });
    defs.push('<radialGradient id="' + uid + 'glow" cx="50%" cy="' + S.glow[1] + '%" r="65%"><stop offset="0" stop-color="' + S.glow[0] + '"/><stop offset="1" stop-color="' + S.glow[0].replace(/,[^,]+\)$/, ',0)') + '"/></radialGradient>');
    defs.push('<radialGradient id="' + uid + 'vig" cx="50%" cy="50%" r="70%"><stop offset=".5" stop-color="' + S.vignette.replace(/,[^,]+\)$/, ',0)') + '"/><stop offset="1" stop-color="' + S.vignette + '"/></radialGradient>');
    defs.push('<linearGradient id="' + uid + 'cen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + S.center[0] + '"/><stop offset="1" stop-color="' + S.center[1] + '"/></linearGradient>');
    defs.push('<linearGradient id="' + uid + 'env" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + S.envelope[0] + '"/><stop offset="1" stop-color="' + S.envelope[1] + '"/></linearGradient>');
    defs.push('<filter id="' + uid + 'blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7"/></filter>');
    defs.push('<filter id="' + uid + 'soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"/></filter>');
    if (S.tileDots) defs.push('<pattern id="' + uid + 'td" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r="1.3" fill="' + S.tileDots + '"/></pattern>');
    var floors = S.floors.map(function (f, n) { var fd = floorDef(uid + 'f' + n, f); defs.push(fd.defs); return fd.fill; });
    Bd.ROOMS.forEach(function (r, n) { defs.push('<clipPath id="' + uid + 'c' + n + '"><rect x="' + r.x * CELL + '" y="' + r.y * CELL + '" width="' + r.w * CELL + '" height="' + r.h * CELL + '"/></clipPath>'); });

    // ---- the frame around the board
    var body = [];
    body.push('<rect x="' + (-F) + '" y="' + (-F) + '" width="' + (W + 2 * F) + '" height="' + (H + 2 * F) + '" fill="url(#' + uid + 'frame)"/>');
    if (S.frame.panels) for (k = 0; k < 9; k++) body.push('<rect x="' + (-F + 118 + k * 121) + '" y="' + (-F) + '" width="3" height="' + (H + 2 * F) + '" fill="rgba(255,255,255,.12)"/>');
    if (S.frame.waves) for (k = 0; k < 40; k++) body.push('<ellipse cx="' + (W / 2) + '" cy="' + (H * 1.3) + '" rx="' + (120 + k * 44) + '" ry="' + (60 + k * 22) + '" fill="none" stroke="rgba(255,255,255,.09)" stroke-width="3"/>');
    (S.frame.spots || []).forEach(function (sp, n) { body.push('<circle cx="' + (-F + (W + 2 * F) * sp[0] / 100) + '" cy="' + (-F + (H + 2 * F) * sp[1] / 100) + '" r="' + sp[3] + '" fill="url(#' + uid + 'sp' + n + ')"/>'); });
    // the suspects' alcoves outside the field, by their start squares
    var AL = [[626, -34, 68, 34, 'top'], [960, 266, 34, 68, 'right'], [626, 1000, 68, 34, 'bottom'], [266, 1000, 68, 34, 'bottom'], [-34, 706, 34, 68, 'left'], [-34, 146, 34, 68, 'left']];
    AL.forEach(function (a, n) {
      var c = Bd.SUSPECT_COLORS[n], side = a[4], x = a[0], y = a[1], w = a[2], hh = a[3], d;
      if (side === 'top') d = 'M' + x + ' ' + (y + hh) + 'V' + (y + 34) + 'A34 34 0 0 1 ' + (x + w) + ' ' + (y + 34) + 'V' + (y + hh) + 'Z';
      else if (side === 'bottom') d = 'M' + x + ' ' + y + 'V' + (y + hh - 34) + 'A34 34 0 0 0 ' + (x + w) + ' ' + (y + hh - 34) + 'V' + y + 'Z';
      else if (side === 'right') d = 'M' + x + ' ' + y + 'H' + (x + w - 34) + 'A34 34 0 0 1 ' + (x + w - 34) + ' ' + (y + hh) + 'H' + x + 'Z';
      else d = 'M' + (x + w) + ' ' + y + 'H' + (x + 34) + 'A34 34 0 0 0 ' + (x + 34) + ' ' + (y + hh) + 'H' + (x + w) + 'Z';
      defs.push('<linearGradient id="' + uid + 'al' + n + '" x1="0" y1="0" x2="' + (side === 'right' ? 1 : side === 'left' ? -1 : 0) + '" y2="' + (side === 'top' || side === 'bottom' ? 1 : 0) + '"' + (side === 'left' ? ' x1="1" x2="0"' : '') + '><stop offset="0" stop-color="' + c.c1 + '"/><stop offset="1" stop-color="' + c.c2 + '"/></linearGradient>');
      body.push('<path d="' + d + '" fill="url(#' + uid + 'al' + n + ')" stroke="rgba(0,0,0,.3)" stroke-width="2"/>');
      var name = String((theme.suspects[n] || {}).name || '').toUpperCase(), words = name.split(' '), l1 = words.slice(0, Math.ceil(words.length / 2)).join(' '), l2 = words.slice(Math.ceil(words.length / 2)).join(' ');
      var cx = x + w / 2, cy = y + hh / 2, rot = side === 'right' ? 90 : side === 'left' ? -90 : 0, fs = Math.min(8.5, 60 / Math.max(l1.length, l2.length, 6) * 1.3);
      body.push('<text transform="translate(' + cx + ' ' + cy + ') rotate(' + rot + ')" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="' + fs.toFixed(1) + '" letter-spacing=".5" fill="' + c.ink + '"><tspan x="0" dy="' + (l2 ? -1.5 : 3) + '">' + esc(l1) + '</tspan>' + (l2 ? '<tspan x="0" dy="' + (fs + 1) + '">' + esc(l2) + '</tspan>' : '') + '</text>');
    });

    // ---- the hallway tiles and the start squares
    for (var y = 0; y < Bd.ROWS; y++) for (var x = 0; x < Bd.COLS; x++) {
      var t = Bd.GRID[y][x];
      if (t !== 'hall' && t !== 'start') continue;
      var X = x * CELL + 1, Y = y * CELL + 1;
      if (t === 'start') {
        var si = Bd.STARTS.findIndex(function (st) { return st.x === x && st.y === y; }), sc = Bd.SUSPECT_COLORS[si];
        body.push('<rect x="' + X + '" y="' + Y + '" width="38" height="38" rx="2" fill="url(#' + uid + 'st' + si + ')"/><rect x="' + (X + 1) + '" y="' + (Y + 1) + '" width="36" height="36" rx="1.5" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="2"/>');
        body.push('<text x="' + (X + 19) + '" y="' + (Y + 23) + '" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="11" letter-spacing="1" fill="' + sc.ink + '">START</text>');
      } else {
        var n = (x * 7 + y * 13) % 3;
        body.push('<rect x="' + X + '" y="' + Y + '" width="38" height="38" rx="2" fill="url(#' + uid + 't' + n + ')"/>' + (S.tileDots ? '<rect x="' + X + '" y="' + Y + '" width="38" height="38" rx="2" fill="url(#' + uid + 'td)"/>' : '') + '<rect x="' + (X + 0.5) + '" y="' + (Y + 0.5) + '" width="37" height="37" rx="1.5" fill="none" stroke="' + S.tileLine + '" stroke-width="1"/><rect x="' + (X + 1.5) + '" y="' + (Y + 1) + '" width="35" height="1" fill="' + S.tileHi + '"/>');
      }
    }

    // ---- the rooms
    Bd.ROOMS.forEach(function (r, n) {
      var X = r.x * CELL, Y = r.y * CELL, Wd = r.w * CELL, Ht = r.h * CELL, fl = floors[n], info = theme.rooms[n] || {};
      var g = ['<g clip-path="url(#' + uid + 'c' + n + ')">'];
      g.push('<rect x="' + X + '" y="' + Y + '" width="' + Wd + '" height="' + Ht + '" fill="' + fl.base + '"/>');
      if (fl.over) g.push('<rect x="' + X + '" y="' + Y + '" width="' + Wd + '" height="' + Ht + '" fill="' + fl.over + '"/>');
      if (fl.over2) g.push('<rect x="' + X + '" y="' + Y + '" width="' + Wd + '" height="' + Ht + '" fill="' + fl.over2 + '"/>');
      if (fl.extra === 'stain') g.push('<ellipse cx="' + (X + Wd * 0.3) + '" cy="' + (Y + Ht * 0.6) + '" rx="' + Wd * 0.3 + '" ry="' + Ht * 0.22 + '" fill="rgba(0,0,0,.35)" filter="url(#' + uid + 'blur)"/>');
      if (fl.extra === 'lanes') g.push('<rect x="' + (X + 30) + '" y="' + Y + '" width="4" height="' + Ht + '" fill="rgba(242,193,78,.7)"/><rect x="' + (X + Wd - 34) + '" y="' + Y + '" width="4" height="' + Ht + '" fill="rgba(242,193,78,.7)"/>');
      g.push('<rect x="' + X + '" y="' + Y + '" width="' + Wd + '" height="' + Ht + '" fill="url(#' + uid + 'vig)"/>');
      g.push('<rect x="' + X + '" y="' + Y + '" width="' + Wd + '" height="' + Ht + '" fill="url(#' + uid + 'glow)"/>');
      // furniture
      if (!opts.bare) g.push(D.room(look, n, X, Y, Wd, Ht));
      // the inner shadow and the trim
      g.push('<rect x="' + X + '" y="' + Y + '" width="' + Wd + '" height="' + Ht + '" fill="none" stroke="rgba(0,0,0,.3)" stroke-width="30" filter="url(#' + uid + 'blur)"/>');
      g.push('<rect x="' + (X + 3.5) + '" y="' + (Y + 3.5) + '" width="' + (Wd - 7) + '" height="' + (Ht - 7) + '" fill="none" stroke="' + S.trim + '" stroke-width="7"/>');
      g.push('<rect x="' + (X + 8) + '" y="' + (Y + 8) + '" width="' + (Wd - 16) + '" height="' + (Ht - 16) + '" fill="none" stroke="' + S.trimLine + '" stroke-width="2"/>');
      // windows on the outside walls
      if (S.windows) {
        var wf = S.windowFrame || S.trim, win = function (wx, wy, vert) {
          var ww = vert ? 9 : 34, wh = vert ? 34 : 9, out = '<rect x="' + wx + '" y="' + wy + '" width="' + ww + '" height="' + wh + '" fill="' + S.windows + '" stroke="' + wf + '" stroke-width="2"/>';
          for (var q = 7; q < (vert ? wh : ww); q += 9) out += vert ? '<rect x="' + wx + '" y="' + (wy + q) + '" width="9" height="2" fill="' + wf + '"/>' : '<rect x="' + (wx + q) + '" y="' + wy + '" width="2" height="9" fill="' + wf + '"/>';
          return '<rect x="' + (wx - 3) + '" y="' + (wy - 3) + '" width="' + (ww + 6) + '" height="' + (wh + 6) + '" fill="rgba(200,230,255,.35)" filter="url(#' + uid + 'soft)"/>' + out;
        };
        if (r.y === 0) [1 / 3, 2 / 3].forEach(function (f) { g.push(win(X + Wd * f - 17, Y, false)); });
        if (r.y + r.h === Bd.ROWS) [1 / 3, 2 / 3].forEach(function (f) { g.push(win(X + Wd * f - 17, Y + Ht - 9, false)); });
        if (r.x === 0) [1 / 3, 2 / 3].forEach(function (f) { g.push(win(X, Y + Ht * f - 17, true)); });
        if (r.x + r.w === Bd.COLS) [1 / 3, 2 / 3].forEach(function (f) { g.push(win(X + Wd - 9, Y + Ht * f - 17, true)); });
      }
      // the secret passage: a staircase and a label
      if (r.passage != null) {
        var right = r.x !== 0, bottom = r.y !== 0, ix = X + (right ? Wd - 42 : 12), iy = Y + (bottom ? Ht - 44 : (S.shortStairs && Ht <= 160 ? Ht - 60 : 40));
        g.push('<rect x="' + ix + '" y="' + iy + '" width="30" height="30" rx="4" fill="' + S.stairsBg + '" stroke="' + S.stairsRing + '" stroke-width="1"/>');
        [[8, 7], [13, 13], [18, 19]].forEach(function (b) { g.push('<rect x="' + (right ? ix + 30 - 4 - b[0] : ix + 4) + '" y="' + (iy + b[1]) + '" width="' + b[0] + '" height="4" fill="' + S.stairsBar + '"/>'); });
        var to = String((theme.rooms[r.passage] || {}).name || '').toUpperCase(), tx = right ? ix - 6 : ix + 36;
        g.push('<text x="' + tx + '" y="' + (iy + 13) + '" text-anchor="' + (right ? 'end' : 'start') + '" font-family="Anton, Impact, sans-serif" font-size="8" letter-spacing=".5" fill="' + S.labelInk + '" style="paint-order:stroke" stroke="rgba(0,0,0,.6)" stroke-width="1.5"><tspan x="' + tx + '">SECRET PASSAGE</tspan><tspan x="' + tx + '" dy="9.5">TO ' + esc(to) + '</tspan></text>');
      }
      g.push('</g>');
      // doors: a threshold in the wall and the door leaf swung open
      r.doors.forEach(function (d) {
        var rx = d[0], ry = d[1], hx = d[2], hy = d[3], leaf = S.door, gap = S.threshold, gl = S.thresholdLine;
        var th = function (gx, gy, gw, gh) { return '<rect x="' + gx + '" y="' + gy + '" width="' + gw + '" height="' + gh + '" fill="' + gap + '" stroke="' + gl + '" stroke-width="1"/>'; };
        var lf = function (lx, ly, lw, lh, rot, ox, oy) { return '<rect x="' + lx + '" y="' + ly + '" width="' + lw + '" height="' + lh + '" rx="2" fill="' + leaf + '" transform="rotate(' + rot + ' ' + ox + ' ' + oy + ')" style="filter:drop-shadow(1px 1px 1px rgba(0,0,0,.5))"/>'; };
        if (hx === rx) {
          var Lx = X + (rx - r.x) * CELL + 6;
          if (hy > ry) g.push(th(Lx, Y + Ht - 9, 28, 10) + lf(Lx + 1, Y + Ht - 13, 26, 4, -60, Lx + 1, Y + Ht - 9));
          else g.push(th(Lx, Y - 1, 28, 10) + lf(Lx + 1, Y + 9, 26, 4, 60, Lx + 1, Y + 9));
        } else {
          var Tp = Y + (ry - r.y) * CELL + 6;
          if (hx > rx) g.push(th(X + Wd - 9, Tp, 10, 28) + lf(X + Wd - 13, Tp + 1, 4, 26, 60, X + Wd - 9, Tp + 1));
          else g.push(th(X - 1, Tp, 10, 28) + lf(X + 9, Tp + 1, 4, 26, -60, X + 9, Tp + 1));
        }
      });
      // the name plaque
      var name = String(info.name || '').toUpperCase();
      var fs = Math.min(22, Math.floor((Wd - 44) / (name.length * 0.62))), rotp = 0;
      fs = Math.max(fs, 12);
      var pw = textW(name, fs, 2) + 36;
      if (Ht > Wd && pw > Wd - 40) { rotp = -90; fs = Math.max(12, Math.min(22, Math.floor((Ht - 44) / (name.length * 0.62)))); pw = textW(name, fs, 2) + 36; }
      var ph = fs + 12, cx = X + Wd / 2, cy = Y + Ht / 2;
      g.push('<g class="plq" transform="translate(' + cx + ' ' + cy + ') rotate(' + rotp + ')"><rect x="' + (-pw / 2 + 2) + '" y="' + (-ph / 2 + 3) + '" width="' + pw + '" height="' + ph + '" rx="' + ph / 2 + '" fill="rgba(0,0,0,.5)" filter="url(#' + uid + 'soft)"/><rect x="' + (-pw / 2) + '" y="' + (-ph / 2) + '" width="' + pw + '" height="' + ph + '" rx="' + ph / 2 + '" fill="' + S.plaqueBg + '" stroke="' + S.plaqueRing + '" stroke-width="2"/><text class="rn" data-room="' + n + '" x="0" y="' + (fs * 0.36) + '" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="' + fs + '" letter-spacing="2" fill="' + S.plaqueInk + '">' + esc(name) + '</text></g>');
      if (S.neon) body.push('<rect x="' + X + '" y="' + Y + '" width="' + Wd + '" height="' + Ht + '" fill="none" stroke="' + S.neon + '" stroke-width="14" filter="url(#' + uid + 'blur)"/>');
      body.push(g.join(''));
    });

    // ---- the case file in the middle
    var c = Bd.CENTER, CX = c.x * CELL, CY = c.y * CELL, CW = c.w * CELL, CH = c.h * CELL;
    body.push('<rect x="' + CX + '" y="' + CY + '" width="' + CW + '" height="' + CH + '" rx="4" fill="url(#' + uid + 'cen)" style="filter:drop-shadow(0 0 16px rgba(0,0,0,.6))"/>');
    body.push('<ellipse cx="' + (CX + CW / 2) + '" cy="' + (CY + CH * 0.2) + '" rx="' + CW * 0.6 + '" ry="' + CH * 0.3 + '" fill="rgba(255,255,255,.12)" filter="url(#' + uid + 'blur)"/>');
    body.push('<rect x="' + (CX + 1.5) + '" y="' + (CY + 1.5) + '" width="' + (CW - 3) + '" height="' + (CH - 3) + '" rx="3" fill="none" stroke="' + S.centerRing + '" stroke-width="3"/><rect x="' + (CX + 4) + '" y="' + (CY + 4) + '" width="' + (CW - 8) + '" height="' + (CH - 8) + '" rx="2" fill="none" stroke="' + S.centerRing2 + '" stroke-width="2"/>');
    var ey;
    if (S.staircase) {
      body.push('<rect x="' + (CX + 66) + '" y="' + (CY + 6) + '" width="68" height="14" fill="#120e11"/>');
      var sx0 = CX + 40, sy0 = CY + 18, sw = 120, shh = 112;
      defs.push('<clipPath id="' + uid + 'stc"><polygon points="' + (sx0 + sw * 0.22) + ',' + sy0 + ' ' + (sx0 + sw * 0.78) + ',' + sy0 + ' ' + (sx0 + sw) + ',' + (sy0 + shh) + ' ' + sx0 + ',' + (sy0 + shh) + '"/></clipPath><linearGradient id="' + uid + 'stg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(0,0,0,.55)"/><stop offset=".7" stop-color="rgba(0,0,0,0)"/></linearGradient>');
      body.push('<g clip-path="url(#' + uid + 'stc)">');
      for (k = 0; k < shh; k += 13) body.push('<rect x="' + sx0 + '" y="' + (sy0 + k) + '" width="' + sw + '" height="7" fill="#a0959e"/><rect x="' + sx0 + '" y="' + (sy0 + k + 7) + '" width="' + sw + '" height="2" fill="#56494f"/><rect x="' + sx0 + '" y="' + (sy0 + k + 9) + '" width="' + sw + '" height="4" fill="#7d717a"/>');
      body.push('<rect x="' + sx0 + '" y="' + sy0 + '" width="' + sw + '" height="' + shh + '" fill="url(#' + uid + 'stg)"/></g>');
      body.push('<text x="' + (CX + CW / 2) + '" y="' + (CY + 160) + '" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="22" letter-spacing="3" fill="' + S.centerInk + '">CASE FILE</text>');
      ey = CY + 176;
    } else {
      var tn = String(theme.name || '').toUpperCase(), tfs = Math.min(24, Math.floor(180 / (tn.length * 0.56)));
      body.push('<text x="' + (CX + CW / 2) + '" y="' + (CY + 26 + tfs) + '" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="' + tfs + '" letter-spacing="2" fill="' + S.centerInk + '" style="paint-order:stroke" stroke="rgba(0,0,0,.4)" stroke-width="2">' + esc(tn) + '</text>');
      body.push('<text x="' + (CX + CW / 2) + '" y="' + (CY + 76) + '" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="13" letter-spacing="4" fill="' + S.centerInk + '" opacity=".85">CASE FILE</text>');
      ey = CY + 96;
    }
    var ex = CX + 36;
    body.push('<rect x="' + ex + '" y="' + ey + '" width="128" height="78" rx="4" fill="url(#' + uid + 'env)" stroke="' + S.envelopeLine + '" stroke-width="2" style="filter:drop-shadow(0 4px 6px rgba(0,0,0,.6))"/>');
    body.push('<polygon points="' + ex + ',' + ey + ' ' + (ex + 128) + ',' + ey + ' ' + (ex + 64) + ',' + (ey + 40) + '" fill="' + shade(S.envelope[0].indexOf('#') === 0 ? S.envelope[0] : '#e8d9b4', 0.88) + '"/>');
    body.push('<circle cx="' + (ex + 64) + '" cy="' + (ey + 40) + '" r="11" fill="' + S.seal + '" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,.5))"/><circle cx="' + (ex + 60) + '" cy="' + (ey + 36) + '" r="3" fill="rgba(255,255,255,.35)"/>');
    body.push('<text x="' + (ex + 64) + '" y="' + (ey + 71) + '" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="12" letter-spacing="2" fill="' + (S.staircase ? '#5a3d1a' : shade(S.seal, 0.7)) + '">TOP SECRET</text>');
    if (!S.staircase && theme.blurb) {
      // the story line, wrapped
      var words = String(theme.blurb).split(' '), lines = [], cur = '';
      words.forEach(function (w) { if ((cur + ' ' + w).trim().length > 30) { lines.push(cur.trim()); cur = w; } else cur += ' ' + w; });
      if (cur.trim()) lines.push(cur.trim());
      lines = lines.slice(0, 4);
      var ly = CY + 206 + (4 - lines.length) * 7;
      body.push('<text x="' + (CX + CW / 2) + '" y="' + ly + '" text-anchor="middle" font-family="Georgia, Times New Roman, serif" font-size="11" fill="' + S.centerInk + '" opacity=".8">' + lines.map(function (l, q) { return '<tspan x="' + (CX + CW / 2) + '" dy="' + (q ? 16 : 0) + '">' + esc(l) + '</tspan>'; }).join('') + '</text>');
    }
    h.push('<defs>' + defs.join('') + '</defs>' + body.join('') + '</svg>');
    return h.join('');
  };
  D.SKINS = SKINS;
  D.has = function (look) { return !!L[look]; };
  D.KINDS = K; D.LAYOUTS = L; D.PALETTES = PAL;
  root.Decor = D;
})(typeof self !== 'undefined' ? self : this);
