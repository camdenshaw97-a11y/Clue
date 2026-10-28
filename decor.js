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

  K.rug = function (x, y, w, h, P) {
    return R(x, y, w, h, P.rug, { rx: 6, s: P.line, sw: 1 }) + R(x + 6, y + 6, w - 12, h - 12, 'none', { rx: 4, s: P.rug2, sw: 2, dash: '6 4' }) +
      E(x + w / 2, y + h / 2, Math.min(w, h) * 0.28, Math.min(w, h) * 0.2, P.rug2, { op: 0.55 }) + E(x + w / 2, y + h / 2, Math.min(w, h) * 0.12, Math.min(w, h) * 0.08, P.rug, {});
  };
  K.runner = function (x, y, w, h, P) {
    return R(x, y, w, h, P.rug, { s: P.line, sw: 1 }) + R(x + 5, y + 5, w - 10, h - 10, 'none', { s: P.rug2, sw: 2 });
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
    classic: { wood: '#7a4a28', wood2: '#5a3418', fabric: '#8e2c2c', fabric2: '#2f5d50', rug: '#9c3b2f', rug2: '#e2b85c', metal: '#9aa3ab', plant: '#4f9a52', plant2: '#2c6b36', pot: '#a0522d', water: '#5fb4d9', felt: '#2e8b57', stone: '#c9c0ae', line: '#2b1a0c', white: '#f7f1e3', glow: '#ffe39a' },
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
    [['rug', 54, 48, 176, 100], ['desk', 70, 54, 80, 34, 0, { mug: 1 }], ['armchair', 176, 58, 38, 36, -20], ['lamp', 226, 52, 14, 14], ['shelf', 250, 48, 22, 104], ['plant', 12, 116, 32, 32]],
    [['runner', 92, 46, 56, 228], ['plant', 12, 48, 32, 32], ['plant', 196, 48, 32, 32], ['bench', 14, 96, 24, 60], ['clock', 206, 92, 22, 34], ['bench', 202, 150, 24, 70], ['plant', 12, 236, 30, 30], ['plant', 198, 236, 30, 30]],
    [['rug', 56, 76, 168, 104], ['fireplace', 8, 80, 22, 88], ['sofa', 86, 56, 112, 36], ['table', 116, 108, 52, 28, 0, { chairs: false }], ['armchair', 62, 112, 38, 38, -90], ['armchair', 186, 112, 38, 38, 90], ['lamp', 212, 64, 14, 14], ['plant', 238, 196, 30, 30]],
    [['rug', 44, 62, 232, 156], ['table', 76, 104, 168, 64, 0, { cloth: 1, plates: 1 }], ['chandelier', 146, 122, 28, 28], ['shelf', 290, 66, 20, 110], ['plant', 284, 220, 28, 28], ['plant', 12, 220, 28, 28]],
    [['counter', 8, 48, 26, 176, 0, { stove: 1, sink: 1 }], ['counter', 96, 46, 104, 22], ['fridge', 206, 46, 28, 40], ['table', 74, 112, 106, 52], ['crates', 200, 100, 32, 46]],
    [['dance', 76, 60, 168, 132, 0, { colors: ['#d8b27a', '#b88a52'] }], ['chandelier', 146, 112, 28, 28], ['piano', 14, 150, 72, 58], ['plant', 16, 48, 28, 28], ['plant', 276, 48, 28, 28], ['bench', 284, 144, 24, 72]],
    [['palm', 118, 48, 64, 64], ['plant', 56, 50, 36, 36], ['round', 62, 104, 66, 58, 0, { n: 2 }], ['plant', 146, 126, 40, 40], ['plant', 150, 182, 34, 34]],
    [['billiard', 46, 52, 148, 82], ['shelf', 8, 54, 14, 100], ['armchair', 204, 52, 30, 30, 90], ['lamp', 210, 98, 14, 14]],
    [['shelf', 8, 46, 20, 146], ['shelf', 212, 42, 20, 34], ['shelf', 212, 126, 20, 66], ['rug', 46, 66, 154, 94], ['round', 98, 82, 50, 50, 0, { n: 0 }], ['armchair', 56, 88, 34, 34, -90], ['armchair', 158, 88, 34, 34, 90], ['lamp', 34, 52, 14, 14]]
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
    [['sand', 0, 44, 280, 50], ['sea', 0, 94, 280, 66], ['rocks', 54, 76, 84, 40], ['seals', 150, 92, 80, 40], ['umbrella', 196, 46, 36, 36], ['towel', 240, 52, 20, 32]],
    [['street', 78, 44, 84, 236], ['lamppost', 62, 64, 14, 14], ['lamppost', 164, 120, 14, 14], ['lamppost', 62, 176, 14, 14], ['round', 10, 92, 52, 52, 0, { n: 2, umbrella: 1 }], ['round', 178, 160, 52, 52, 0, { n: 2, umbrella: 1 }], ['round', 10, 196, 52, 52, 0, { n: 2 }], ['palm', 182, 54, 46, 46]],
    [['pool', 70, 72, 138, 78], ['lounger', 30, 70, 22, 50], ['lounger', 226, 92, 22, 50], ['palm', 16, 150, 54, 54], ['umbrella', 214, 160, 44, 44], ['plant', 100, 166, 30, 30]],
    [['round', 46, 66, 64, 64, 0, { n: 4, umbrella: 1 }], ['round', 210, 66, 64, 64, 0, { n: 4, umbrella: 1 }], ['round', 128, 128, 64, 64, 0, { n: 4, cloth: 1 }], ['flowers', 282, 150, 30, 40], ['plant', 12, 220, 28, 28], ['palm', 274, 214, 40, 40]],
    [['sand', 0, 44, 240, 236], ['sea', 0, 230, 240, 50], ['umbrella', 36, 66, 44, 44], ['towel', 86, 72, 22, 38], ['umbrella', 140, 122, 44, 44], ['towel', 94, 140, 22, 38], ['umbrella', 40, 170, 36, 36]],
    [['sea', 0, 44, 320, 236], ['deck', 34, 56, 252, 172], ['jet', 70, 74, 84, 76], ['jet', 172, 112, 76, 70]],
    [['grass', 0, 44, 200, 196], ['tree', 20, 54, 56, 56], ['palm', 118, 50, 56, 56], ['pond', 60, 116, 92, 52], ['tree', 140, 168, 50, 50]],
    [['diamond', 20, 48, 200, 132]],
    [['grass', 0, 44, 240, 156], ['fountain', 86, 66, 68, 68], ['palm', 16, 60, 46, 46], ['palm', 178, 118, 46, 46], ['flowers', 174, 54, 40, 34], ['flowers', 20, 120, 40, 34]]
  ];
  L.vegas = [
    [['gold', 60, 56, 56, 32], ['gold', 122, 62, 56, 32], ['safe', 192, 50, 40, 40], ['safe', 238, 50, 34, 34], ['gold', 196, 100, 50, 28], ['crates', 60, 100, 44, 22]],
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
    [['grass', 0, 44, 240, 236], ['car', 150, 54, 52, 94, 0, { color: '#e0303e' }], ['car', 36, 130, 52, 94, 0, { color: '#3df5ff' }], ['trash', 14, 54, 22, 22], ['trash', 40, 54, 22, 22], ['flowers', 160, 220, 50, 36]],
    [['deck', 30, 56, 216, 150, 0, { planks: 1, color: '#9b6a3e' }], ['hottub', 96, 70, 86, 86], ['towel', 48, 82, 22, 40], ['towel', 200, 104, 22, 40], ['lamp', 52, 150, 14, 14]],
    [['counter', 86, 96, 150, 50, 0, { pizza: 1, cups: 1 }], ['fridge', 282, 46, 30, 42], ['counter', 110, 46, 120, 22, 0, { sink: 1 }], ['trash', 284, 210, 24, 24], ['beanbag', 20, 210, 40, 30]],
    [['tub', 8, 48, 44, 96], ['toilet', 84, 48, 30, 42], ['sink', 132, 48, 48, 26], ['rug', 76, 110, 104, 56], ['towel', 200, 52, 22, 36]],
    [['dj', 112, 50, 96, 32], ['dance', 74, 94, 172, 112, 0, { ball: 1 }], ['beanbag', 16, 56, 40, 32], ['beanbag', 266, 56, 40, 32, 0, { color: '#ff5ad9' }]],
    [['deck', 20, 48, 164, 120, 0, { planks: 1, color: '#9b6a3e' }], ['firepit', 72, 78, 56, 56], ['beanbag', 30, 60, 30, 26], ['beanbag', 140, 120, 30, 26, 0, { color: '#ff5ad9' }], ['grass', 46, 176, 140, 60]],
    [['car', 14, 50, 62, 112, 0, { color: '#ffe14d' }], ['pongtable', 100, 66, 108, 52], ['fridge', 206, 46, 28, 40], ['crates', 98, 136, 62, 24]],
    [['rug', 54, 66, 132, 96], ['tv', 70, 46, 100, 12], ['sofa', 70, 104, 100, 34], ['beanbag', 22, 76, 36, 30], ['beanbag', 178, 112, 36, 30, 0, { color: '#ff5ad9' }], ['shelf', 212, 42, 20, 34]]
  ];
  L.office = [
    [['rug', 84, 48, 148, 100], ['desk', 104, 52, 92, 38, 0, { mug: 1 }], ['filing', 58, 50, 26, 34], ['sofa', 240, 64, 32, 88, 0, { color: '#6e4e30' }], ['plant', 12, 116, 30, 30], ['armchair', 204, 108, 30, 30, 0, { color: '#56606e' }]],
    [['counter', 58, 58, 124, 32, 0, { monitor: 1 }], ['plant', 12, 48, 32, 32], ['plant', 196, 48, 32, 32], ['seats', 12, 108, 26, 78], ['cooler', 202, 116, 26, 26], ['seats', 202, 160, 26, 60]],
    [['table', 62, 88, 156, 58], ['tv', 8, 84, 10, 70], ['whiteboard', 262, 100, 8, 70], ['plant', 238, 196, 30, 30], ['cooler', 34, 186, 24, 24]],
    [['vending', 278, 48, 34, 46], ['vending', 278, 100, 34, 46], ['fridge', 12, 46, 28, 42], ['counter', 116, 46, 112, 22, 0, { sink: 1 }], ['round', 62, 92, 66, 66], ['round', 168, 124, 66, 66], ['cooler', 238, 52, 24, 24]],
    [['rack', 8, 48, 24, 180], ['rack', 58, 58, 24, 140], ['crates', 108, 56, 66, 66], ['forklift', 112, 140, 42, 58], ['crates', 196, 50, 38, 62]],
    [['cubicle', 30, 56, 116, 92], ['cubicle', 174, 56, 116, 92], ['copier', 286, 156, 26, 32], ['plant', 12, 166, 30, 30], ['plant', 284, 222, 28, 28]],
    [['grass', 0, 44, 200, 196], ['rows', 22, 58, 104, 72], ['barn', 140, 52, 52, 48], ['tree', 136, 120, 52, 52], ['trash', 70, 150, 20, 20]],
    [['desk', 34, 54, 70, 34], ['desk', 132, 54, 70, 34], ['filing', 206, 46, 26, 40], ['plant', 12, 138, 28, 28], ['copier', 204, 140, 26, 30]],
    [['desk', 56, 66, 58, 36], ['desk', 118, 66, 58, 36], ['desk', 87, 112, 58, 36, 0, { chair: false }], ['plant', 14, 48, 28, 28], ['filing', 206, 126, 26, 40], ['cooler', 206, 46, 24, 24]]
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
  D.has = function (look) { return !!L[look]; };
  D.KINDS = K; D.LAYOUTS = L; D.PALETTES = PAL;
  root.Decor = D;
})(typeof self !== 'undefined' ? self : this);
