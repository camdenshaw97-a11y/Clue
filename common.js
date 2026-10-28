/* Shared by the TV page and the phone page. */
(function () {
  'use strict';
  var F = window.Game = {};
  var B = window.Boards;

  // Change this to rename the game everywhere.
  F.TITLE = 'FRIEND CLUE';
  // Shown small on the start screens. Goes up with every change; CHANGELOG.md says what each one was.
  F.VERSION = '1.1';

  F.$ = function (sel, root) { return (root || document).querySelector(sel); };
  F.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  F.plural = function (n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); };
  F.clock = function (ms) {
    var s = Math.max(0, Math.ceil(ms / 1000)), m = Math.floor(s / 60), h = Math.floor(m / 60);
    s = s % 60; m = m % 60;
    return (h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (s < 10 ? '0' : '') + s;
  };

  F.store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) { /* private mode */ } }
  };

  /* ---- live connection with automatic reconnect ---- */
  F.connect = function (opts) {
    var ws = null, timer = null, tries = 0, stopped = false;
    var myBuild = document.documentElement.getAttribute('data-build');
    function freshCheck() {
      if (!myBuild || !window.fetch) return;
      fetch('/version', { cache: 'no-store' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (v) {
        if (!/^[0-9a-f]{12}$/.test(v) || v === myBuild) return;
        var last = Number(F.store.get('clue.reloadAt', 0));
        if (Date.now() - last < 30000) return;
        F.store.set('clue.reloadAt', Date.now());
        try { sessionStorage.setItem('clue.auto', '1'); } catch (e) { /* private mode */ }
        location.reload();
      }).catch(function () { /* offline: try again next time */ });
    }
    function open() {
      timer = null;
      if (stopped) return;
      try {
        ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
      } catch (e) { return retry(); }
      var mine = ws;
      mine.onopen = function () {
        tries = 0;
        freshCheck();
        if (opts.onStatus) opts.onStatus(true);
        var h = opts.hello && opts.hello();
        if (h) mine.send(JSON.stringify(h));
      };
      mine.onmessage = function (e) {
        var m; try { m = JSON.parse(e.data); } catch (err) { return; }
        opts.onMessage(m);
      };
      mine.onclose = function () {
        if (ws !== mine) return;
        if (opts.onStatus) opts.onStatus(false);
        retry();
      };
      mine.onerror = function () { try { mine.close(); } catch (e) { /* ignore */ } };
    }
    function retry() {
      if (stopped || timer) return;
      timer = setTimeout(open, Math.min(4000, 300 + 500 * tries++));
    }
    var api = {
      send: function (m) {
        if (ws && ws.readyState === 1) { ws.send(JSON.stringify(m)); return true; }
        return false;
      },
      stop: function () { stopped = true; if (timer) clearTimeout(timer); try { ws.close(); } catch (e) { /* ignore */ } }
    };
    open();
    setInterval(function () { api.send({ t: 'ping' }); }, 20000);
    setInterval(function () { try { fetch('/health').catch(function () {}); freshCheck(); } catch (e) { /* ignore */ } }, 4 * 60 * 1000);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && !stopped && (!ws || ws.readyState > 1)) {
        if (timer) { clearTimeout(timer); timer = null; }
        tries = 0; open();
      }
    });
    return api;
  };

  /* ---- keep the screen awake while the game is open ---- */
  F.stayAwake = function () {
    var lock = null;
    function ask() {
      if (!navigator.wakeLock || document.hidden) return;
      try { navigator.wakeLock.request('screen').then(function (l) { lock = l; }).catch(function () {}); } catch (e) { /* not allowed here */ }
    }
    ask();
    document.addEventListener('visibilitychange', function () { if (!document.hidden) ask(); });
    document.addEventListener('click', function () { if (!lock) ask(); }, { passive: true });
  };

  /* ---- shrink text until it fits ---- */
  F.fit = function (el, min) {
    el.style.fontSize = '';
    var size = parseFloat(getComputedStyle(el).fontSize);
    var floor = min || size * 0.45;
    var guard = 0;
    while (el.scrollWidth > el.clientWidth + 1 && size > floor && guard++ < 60) {
      size -= Math.max(1, size * 0.05);
      el.style.fontSize = size + 'px';
    }
  };

  /* ---- motion helpers ---- */
  var calm = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  F.motionOK = function () { return !(calm && calm.matches); };
  F.anim = function (el, frames, opts) {
    if (!el || !el.animate || !F.motionOK()) return null;
    try { return el.animate(frames, opts); } catch (e) { return null; }
  };
  F.bump = function (el, scale) {
    return F.anim(el, [{ transform: 'scale(1)' }, { transform: 'scale(' + (scale || 1.2) + ')', offset: 0.4 }, { transform: 'scale(1)' }],
      { duration: 380, easing: 'cubic-bezier(.3, 1.3, .5, 1)' });
  };
  F.shake = function (el) {
    return F.anim(el, [0, -6, 12, -18, 18, -14, 12, -8, 4, 0].map(function (x) { return { transform: 'translateX(' + x + 'px)' }; }), { duration: 480, easing: 'ease-out' });
  };

  /* ---- redraw a block of HTML without throwing away what is already on screen ----
     data-key="..." (or an id) marks an element as "the same one" between redraws.
     data-live means "leave my contents alone": a script is animating them. */
  function keyOf(n) { return n.nodeType === 1 ? (n.getAttribute('data-key') || n.id || null) : null; }
  function morphKids(from, to) {
    var want = {}, cur = from.firstChild, next = to.firstChild, n, k, hit, c, clear;
    function id(x) { var kk = keyOf(x); return kk ? x.nodeName + '|' + kk : null; }
    function drop(x) { if (x === cur) cur = cur.nextSibling; from.removeChild(x); }
    for (n = to.firstChild; n; n = n.nextSibling) if (id(n)) want[id(n)] = 1;
    while (next) {
      n = next; next = next.nextSibling;
      while (cur && id(cur) && !want[id(cur)]) drop(cur);
      k = id(n); hit = null;
      for (c = cur; c; c = c.nextSibling) if (k ? id(c) === k : (!id(c) && c.nodeName === n.nodeName)) { hit = c; break; }
      if (hit && hit !== cur) {
        clear = true;
        for (c = cur; c !== hit; c = c.nextSibling) if (id(c) && want[id(c)]) { clear = false; break; }
        if (clear) while (cur !== hit) drop(cur);
      }
      if (hit) {
        if (hit === cur) cur = cur.nextSibling; else from.insertBefore(hit, cur);
        morphNode(hit, n);
      } else from.insertBefore(n, cur);
    }
    while (cur) drop(cur);
  }
  function morphNode(a, b) {
    if (a.nodeType !== 1) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return; }
    var i, at, name;
    for (i = a.attributes.length - 1; i >= 0; i--) {
      name = a.attributes[i].name;
      if (!b.hasAttribute(name) && name.indexOf('data-fx-') !== 0) a.removeAttribute(name);
    }
    for (i = 0; i < b.attributes.length; i++) {
      at = b.attributes[i];
      if (a.getAttribute(at.name) !== at.value) a.setAttribute(at.name, at.value);
    }
    if (a.nodeName === 'INPUT' || a.nodeName === 'TEXTAREA' || a.nodeName === 'SELECT') {
      if (document.activeElement !== a) { var v = b.getAttribute('value') || ''; if (a.value !== v) a.value = v; }
      return;
    }
    if (a.hasAttribute('data-live')) return;
    // SVG drawn once (the board) is left alone unless its key changes.
    if (a.hasAttribute('data-static')) return;
    morphKids(a, b);
  }
  F.morph = function (root, html) {
    var t = document.createElement('template');
    t.innerHTML = html;
    morphKids(root, t.content);
  };

  /* Buttons stay pressed for a beat even on a quick tap, so every tap is felt. */
  F.pressFx = function () {
    var held = null, t0 = 0;
    function release() {
      var b = held; held = null;
      if (b) setTimeout(function () { b.removeAttribute('data-fx-press'); }, Math.max(0, 110 - (performance.now() - t0)));
    }
    document.addEventListener('pointerdown', function (e) {
      var b = e.target.closest ? e.target.closest('button, a.tvbtn, a.link, .tap') : null;
      if (!b || b.disabled) return;
      if (held && held !== b) held.removeAttribute('data-fx-press');
      held = b; t0 = performance.now();
      b.setAttribute('data-fx-press', '');
    }, { passive: true });
    ['pointerup', 'pointercancel', 'blur'].forEach(function (ev) { addEventListener(ev, release, { passive: true }); });
    document.addEventListener('touchstart', function () {}, { passive: true });
  };

  /* ---- dialogs styled like the game (instead of the browser's own) ----
     F.dialog({ title, text, html, buttons: [{ label, kind, value }], input: { placeholder, value, maxlength } })
     resolves with the button's value (and, with an input, { value, text }). */
  F.dialog = function (o) {
    return new Promise(function (resolve) {
      var back = document.createElement('div');
      back.className = 'dlg-back';
      var h = '<div class="dlg" role="dialog">' + (o.title ? '<h2>' + F.esc(o.title) + '</h2>' : '') + (o.text ? '<p>' + F.esc(o.text) + '</p>' : '') + (o.html || '');
      if (o.input) h += '<input class="dlg-in" maxlength="' + (o.input.maxlength || 40) + '" placeholder="' + F.esc(o.input.placeholder || '') + '" value="' + F.esc(o.input.value || '') + '">';
      h += '<div class="dlg-row">' + (o.buttons || [{ label: 'OK', kind: 'pri', value: true }]).map(function (b, i) { return '<button class="dlg-btn ' + (b.kind || '') + '" data-i="' + i + '">' + F.esc(b.label) + '</button>'; }).join('') + '</div></div>';
      back.innerHTML = h;
      document.body.appendChild(back);
      var inp = back.querySelector('.dlg-in');
      function done(v) { back.classList.add('out'); setTimeout(function () { back.remove(); }, 180); resolve(v); }
      back.addEventListener('click', function (e) {
        var b = e.target.closest('.dlg-btn');
        if (b) { var bt = (o.buttons || [{ value: true }])[Number(b.getAttribute('data-i'))]; done(inp ? { value: bt.value, text: inp.value } : bt.value); }
        else if (e.target === back && !o.input) done(o.cancel === undefined ? false : o.cancel);
      });
      if (inp) { setTimeout(function () { inp.focus(); inp.select(); }, 60); inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { var pri = (o.buttons || []).findIndex(function (b) { return b.kind === 'pri'; }); done({ value: pri >= 0 ? o.buttons[pri].value : true, text: inp.value }); } }); }
      addEventListener('keydown', function esc(e) { if (e.key === 'Escape' && back.parentNode) { done(o.cancel === undefined ? false : o.cancel); removeEventListener('keydown', esc); } });
    });
  };
  F.confirm = function (title, text, okLabel, danger) {
    return F.dialog({ title: title, text: text, buttons: [{ label: okLabel || 'OK', kind: danger ? 'red' : 'pri', value: true }, { label: 'Cancel', kind: 'ghost', value: false }] });
  };

  /* ---- sound effects, synthesized so there are no audio files to load ---- */
  F.sfx = (function () {
    var ctx = null, muted = false, master = null;
    function ac() {
      if (!ctx) {
        var C = window.AudioContext || window.webkitAudioContext;
        if (C) { ctx = new C(); master = ctx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ctx.destination); }
      }
      if (ctx && ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    function tone(o) {
      var c = ac(); if (!c || muted) return;
      var t = c.currentTime + (o.t || 0), d = o.d || 0.3;
      var osc = c.createOscillator(), g = c.createGain();
      osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(o.f, t);
      if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + d);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(o.g || 0.3, t + (o.a || 0.012));
      if (o.hold) g.gain.setValueAtTime(o.g || 0.3, t + d - 0.06);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      osc.connect(g); g.connect(master);
      osc.start(t); osc.stop(t + d + 0.05);
    }
    function noise(t, d, g, freq, q) {
      var c = ac(); if (!c || muted) return;
      var n = Math.floor(c.sampleRate * d), buf = c.createBuffer(1, n, c.sampleRate), data = buf.getChannelData(0);
      for (var i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
      var src = c.createBufferSource(), f = c.createBiquadFilter(), gn = c.createGain();
      src.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq || 2500; f.Q.value = q || 1.2;
      gn.gain.value = g;
      src.connect(f); f.connect(gn); gn.connect(master);
      src.start(c.currentTime + (t || 0));
    }
    function bell(f, t, g) {
      tone({ f: f, t: t, d: 1.0, g: g }); tone({ f: f * 2, t: t, d: 0.6, g: g * 0.35 }); tone({ f: f * 3.01, t: t, d: 0.3, g: g * 0.15 });
    }
    return {
      unlock: ac,
      ctx: ac,
      mute: function (v) { muted = v; if (master) master.gain.setTargetAtTime(v ? 0 : 1, ctx.currentTime, 0.03); },
      isMuted: function () { return muted; },
      step: function () { noise(0, 0.035, 0.3, 900); tone({ f: 160, type: 'triangle', d: 0.05, g: 0.08 }); },          // a footstep in the hall
      dice: function () { for (var i = 0; i < 6; i++) noise(i * 0.07, 0.04, 0.5, 900 + i * 300); tone({ f: 420, type: 'square', t: 0.42, d: 0.06, g: 0.08 }); },
      door: function () { tone({ f: 180, f2: 120, type: 'sawtooth', d: 0.5, g: 0.05 }); tone({ f: 240, f2: 200, type: 'triangle', t: 0.05, d: 0.4, g: 0.06 }); noise(0.42, 0.06, 0.6, 500); },  // a creaky door
      secret: function () { tone({ f: 110, f2: 55, type: 'sine', d: 1.0, g: 0.25 }); noise(0, 0.9, 0.25, 300, 0.6); tone({ f: 660, f2: 1320, type: 'sine', t: 0.3, d: 0.6, g: 0.05 }); },
      turn: function () { tone({ f: 523, type: 'sine', d: 0.12, g: 0.12 }); tone({ f: 784, type: 'sine', t: 0.12, d: 0.3, g: 0.12 }); },
      join: function () { tone({ f: 660, d: 0.09, g: 0.14 }); tone({ f: 990, t: 0.08, d: 0.2, g: 0.14 }); },
      // A suggestion: a low, suspicious motif.
      suggest: function () { [220, 262, 247, 196].forEach(function (f, i) { tone({ f: f, type: 'triangle', t: i * 0.16, d: i === 3 ? 0.7 : 0.2, g: 0.16 }); }); tone({ f: 55, type: 'sine', d: 1.2, g: 0.3 }); },
      no: function () { tone({ f: 330, type: 'square', d: 0.08, g: 0.06 }); tone({ f: 247, type: 'square', t: 0.09, d: 0.14, g: 0.06 }); },       // someone can't disprove it
      show: function () { noise(0, 0.25, 0.4, 3500, 0.8); tone({ f: 880, type: 'sine', t: 0.18, d: 0.25, g: 0.08 }); tone({ f: 1175, type: 'sine', t: 0.26, d: 0.3, g: 0.07 }); },   // a card slides across
      flip: function () { noise(0, 0.08, 0.5, 4500); tone({ f: 1320, type: 'triangle', t: 0.05, d: 0.2, g: 0.08 }); },
      deal: function () { for (var i = 0; i < 8; i++) noise(i * 0.09, 0.05, 0.35, 3800 + (i % 3) * 400); },
      sting: function () { tone({ f: 98, type: 'sawtooth', d: 1.4, g: 0.2, hold: true }); tone({ f: 104, type: 'sawtooth', d: 1.4, g: 0.15, hold: true }); tone({ f: 1568, f2: 196, type: 'square', d: 0.5, g: 0.06 }); noise(0, 0.6, 0.6, 200, 0.5); },   // nobody could disprove it
      drum: function (secs) { var n = Math.round((secs || 3) * 14); for (var i = 0; i < n; i++) noise(i / 14, 0.06, 0.35 + 0.5 * i / n, 180, 0.7); tone({ f: 65, type: 'sine', t: n / 14, d: 0.8, g: 0.4 }); },   // a drum roll before the envelope opens
      right: function () {
        [392, 523, 659, 784, 1047].forEach(function (f, i) { tone({ f: f, type: 'triangle', t: i * 0.1, d: i === 4 ? 1.4 : 0.18, g: 0.24 }); });
        [262, 330, 392, 523].forEach(function (f) { tone({ f: f, type: 'sawtooth', t: 0.45, d: 1.3, g: 0.05 }); });
        bell(2093, 0.5, 0.1);
      },
      wrong: function () { tone({ f: 155, type: 'sawtooth', d: 0.7, g: 0.22, hold: true }); tone({ f: 146, type: 'sawtooth', d: 0.7, g: 0.18, hold: true }); tone({ f: 110, type: 'square', t: 0.7, d: 0.9, g: 0.15, hold: true }); },
      escape: function () { [392, 370, 349, 311, 294].forEach(function (f, i) { tone({ f: f, type: 'sawtooth', t: i * 0.25, d: i === 4 ? 1.3 : 0.28, g: 0.13 }); }); tone({ f: 73, type: 'sine', t: 1.0, d: 1.6, g: 0.3 }); },   // the killer got away
      tick: function () { tone({ f: 1000, type: 'square', d: 0.04, g: 0.08 }); },
      ping: function () { tone({ f: 1760, type: 'sine', d: 0.1, g: 0.14 }); tone({ f: 2349, type: 'sine', t: 0.1, d: 0.25, g: 0.12 }); },
      thunder: function () { noise(0, 1.6, 1.0, 120, 0.4); noise(0.05, 0.4, 0.7, 600, 0.6); tone({ f: 50, f2: 30, type: 'triangle', d: 1.8, g: 0.35 }); },
      shake: function () { for (var i = 0; i < 4; i++) noise(i * 0.09, 0.05, 0.4, 1500 + i * 200); },
      // The start of a game: a few bars of something ominous.
      intro: function () {
        [[220, 0], [262, 0.35], [247, 0.7], [208, 1.05], [220, 1.6]].forEach(function (n) { tone({ f: n[0], type: 'triangle', t: n[1], d: n[1] === 1.6 ? 1.6 : 0.34, g: 0.15 }); });
        [110, 131, 165].forEach(function (f) { tone({ f: f, type: 'sawtooth', t: 1.6, d: 1.8, g: 0.05 }); });
        tone({ f: 55, type: 'sine', d: 3.2, g: 0.25, a: 0.5 });
      }
    };
  })();

  /* ---- drawings ---- */

  // The classic six weapons as line drawings; the other boards use emoji.
  var ART = {
    candlestick: '<path d="M22 58h20M25 58c0-5 3-6 7-6s7 1 7 6" fill="#d9a441" stroke="#6b4a12" stroke-width="2"/><rect x="29" y="26" width="6" height="26" fill="#d9a441" stroke="#6b4a12" stroke-width="2"/><path d="M23 26h18l-3 4H26z" fill="#d9a441" stroke="#6b4a12" stroke-width="2"/><rect x="28" y="12" width="8" height="14" rx="1" fill="#fff6dc" stroke="#6b4a12" stroke-width="2"/><path d="M32 2c4 5 4 8 0 10-4-2-4-5 0-10z" fill="#ff9f1c" stroke="#a24b00" stroke-width="1.5"/>',
    knife: '<path d="M10 54 38 26l6 6-28 28c-3 1-6-2-6-6z" fill="#7a4a24" stroke="#3b2210" stroke-width="2"/><path d="M38 26 56 6c2 6-2 16-8 22l-4 4z" fill="#dfe6ec" stroke="#4a5560" stroke-width="2"/><path d="M34 22l12 12" stroke="#3b2210" stroke-width="3"/>',
    pipe: '<rect x="10" y="26" width="44" height="12" rx="3" transform="rotate(-35 32 32)" fill="#9aa3ab" stroke="#3d454c" stroke-width="2"/><rect x="6" y="24" width="10" height="16" rx="2" transform="rotate(-35 32 32)" fill="#7d868e" stroke="#3d454c" stroke-width="2"/><rect x="48" y="24" width="10" height="16" rx="2" transform="rotate(-35 32 32)" fill="#7d868e" stroke="#3d454c" stroke-width="2"/>',
    revolver: '<path d="M6 22h40l2-4h8v8H30l-2 4h-6z" fill="#5d6670" stroke="#22282e" stroke-width="2"/><circle cx="26" cy="28" r="7" fill="#7b858f" stroke="#22282e" stroke-width="2"/><path d="M14 30h10l-4 24h-10z" fill="#6e4426" stroke="#2e1a0c" stroke-width="2"/><path d="M26 36c2 6 0 8-4 8" fill="none" stroke="#22282e" stroke-width="2"/>',
    rope: '<g fill="none" stroke="#a87b3e" stroke-width="5" stroke-linecap="round"><ellipse cx="32" cy="40" rx="20" ry="10"/><ellipse cx="32" cy="34" rx="16" ry="8"/><path d="M48 36c6-8 4-22-6-28"/></g><g fill="none" stroke="#6b4a1e" stroke-width="1.4" stroke-dasharray="2 3"><ellipse cx="32" cy="40" rx="20" ry="10"/><ellipse cx="32" cy="34" rx="16" ry="8"/></g>',
    wrench: '<path d="M44 6a12 12 0 0 0-10 16L8 48a5 5 0 0 0 8 8l26-26A12 12 0 0 0 58 20l-8 4-6-6 4-8z" fill="#aab3bb" stroke="#3d454c" stroke-width="2" stroke-linejoin="round"/>'
  };
  F.icon = function (icon) {
    if (icon && icon.indexOf('svg:') === 0) { var a = ART[icon.slice(4)]; if (a) return '<svg class="ico" viewBox="0 0 64 64" aria-hidden="true">' + a + '</svg>'; }
    return '<span class="emo">' + F.esc(icon || '❓') + '</span>';
  };
  // A suspect: a colored medallion with their emoji, or a plain silhouette on the classic board.
  F.suspectArt = function (theme, i) {
    var c = B.SUSPECT_COLORS[i], s = theme.suspects[i];
    var inner = s && s.icon ? '<span class="emo">' + F.esc(s.icon) + '</span>'
      : '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="24" r="12" fill="' + c.ink + '" opacity=".85"/><path d="M10 60c2-14 11-21 22-21s20 7 22 21z" fill="' + c.ink + '" opacity=".85"/></svg>';
    return '<span class="med" style="--c1:' + c.c1 + ';--c2:' + c.c2 + '">' + inner + '</span>';
  };
  F.cardArt = function (theme, c) {
    var kind = B.cardKind(c), x = B.cardOf(theme, c);
    if (kind === 'suspect') return F.suspectArt(theme, B.cardIndex(c));
    return F.icon(x && x.icon);
  };
  F.KIND = { suspect: 'SUSPECT', weapon: 'WEAPON', room: 'ROOM' };
  // A playing card. size: '' | 'sm' | 'lg'. opts.back draws the back instead.
  F.cardHtml = function (theme, c, opts) {
    opts = opts || {};
    if (opts.back) return '<div class="ccard back ' + (opts.size || '') + '"' + (opts.key ? ' data-key="' + opts.key + '"' : '') + '><i>?</i></div>';
    var kind = B.cardKind(c), x = B.cardOf(theme, c), col = kind === 'suspect' ? B.SUSPECT_COLORS[B.cardIndex(c)] : null;
    var nm = x ? x.name : '?', longest = Math.max.apply(null, nm.split(' ').map(function (w) { return w.length; }));
    var fit = nm.length > 17 || longest > 10 ? ' xlong' : nm.length > 11 || longest > 8 ? ' long' : '';
    return '<div class="ccard ' + kind + fit + ' ' + (opts.size || '') + (opts.cls ? ' ' + opts.cls : '') + '"' + (opts.key ? ' data-key="' + opts.key + '"' : '') + (opts.attrs || '') +
      (col ? ' style="--c1:' + col.c1 + ';--c2:' + col.c2 + '"' : '') + '><small>' + F.KIND[kind] + '</small><div class="art">' + F.cardArt(theme, c) + '</div><b>' + F.esc(x ? x.name : '?') + '</b></div>';
  };

  // The game's mark: a magnifying glass over a question mark.
  F.LOGO = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="42" cy="42" r="31" fill="#f4ead5" stroke="#1a0a06" stroke-width="5"/><circle cx="42" cy="42" r="31" fill="none" stroke="#e2b85c" stroke-width="9"/><circle cx="42" cy="42" r="31" fill="none" stroke="#1a0a06" stroke-width="2" opacity=".5"/><path d="M64 64l24 24" stroke="#1a0a06" stroke-width="17" stroke-linecap="round"/><path d="M64 64l24 24" stroke="#7a1a26" stroke-width="10" stroke-linecap="round"/><text x="42" y="57" font-family="Georgia, Times New Roman, serif" font-weight="700" font-size="44" text-anchor="middle" fill="#7a1a26">?</text><path d="M26 30a20 20 0 0 1 14-10" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".8"/></svg>';

  /* ---- the board ---- */

  var CELL = 40;
  F.CELL = CELL;
  F.BOARD_W = B.COLS * CELL; F.BOARD_H = B.ROWS * CELL;

  // Where a piece goes, in board pixels. In a room every suspect has its own spot along the
  // bottom and every weapon its own spot above them, so nothing ever jumps around.
  F.spot = function (at, slot, isWeapon) {
    if (!at) return null;
    if (at.r == null) return { x: at.x * CELL + CELL / 2, y: at.y * CELL + CELL / 2 };
    var r = B.ROOMS[at.r], X = r.x * CELL, Y = r.y * CELL, W = r.w * CELL, H = r.h * CELL;
    var step = Math.min(34, (W - 14) / 6), x0 = X + W / 2 - step * 2.5;
    return { x: x0 + slot * step, y: Y + H - (isWeapon ? 58 : 22) };
  };

  // The whole board as one SVG (rooms, hallways, doors, passages, start squares, the case file).
  F.boardSvg = function (theme, opts) {
    opts = opts || {};
    var L = B.lookOf(theme), lookId = (theme && (theme.look || theme.id)) || 'classic', W = F.BOARD_W, H = F.BOARD_H, esc = F.esc, x, y, k, h = [];
    h.push('<svg class="bsvg" viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">');
    h.push('<defs><pattern id="rt" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="14" fill="#fff" opacity=".07"/></pattern>' +
      '<radialGradient id="cg" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></radialGradient></defs>');
    h.push('<rect width="' + W + '" height="' + H + '" fill="' + L.frame + '"/>');
    // hallways: a checker of tiles
    h.push('<g>');
    for (y = 0; y < B.ROWS; y++) for (x = 0; x < B.COLS; x++) {
      var t = B.GRID[y][x];
      if (t !== 'hall' && t !== 'start') continue;
      h.push('<rect x="' + (x * CELL + 0.5) + '" y="' + (y * CELL + 0.5) + '" width="' + (CELL - 1) + '" height="' + (CELL - 1) + '" rx="2" fill="' + ((x + y) % 2 ? L.floorAlt : L.floor) + '" stroke="' + L.line + '" stroke-width="1"/>');
    }
    h.push('</g>');
    // start squares, each in its suspect's color
    B.STARTS.forEach(function (s, i) {
      var c = B.SUSPECT_COLORS[i];
      h.push('<circle cx="' + (s.x * CELL + CELL / 2) + '" cy="' + (s.y * CELL + CELL / 2) + '" r="15" fill="' + c.c2 + '" stroke="' + c.c1 + '" stroke-width="3" opacity=".9"/>');
    });
    // rooms
    B.ROOMS.forEach(function (r, i) {
      var X = r.x * CELL, Y = r.y * CELL, Wd = r.w * CELL, Ht = r.h * CELL, info = theme.rooms[i] || {};
      h.push('<rect x="' + X + '" y="' + Y + '" width="' + Wd + '" height="' + Ht + '" fill="' + L.rooms[i] + '"/>');
      h.push('<rect x="' + X + '" y="' + Y + '" width="' + Wd + '" height="' + Ht + '" fill="url(#rt)"/>');
      // the furniture, like the printed board (drawn before the walls so it sits inside them)
      var furnished = window.Decor && Decor.has(lookId);
      if (furnished) h.push(Decor.room(lookId, i, X, Y, Wd, Ht));
      h.push('<rect x="' + (X + 2.5) + '" y="' + (Y + 2.5) + '" width="' + (Wd - 5) + '" height="' + (Ht - 5) + '" fill="none" stroke="' + L.wall + '" stroke-width="5"/>');
      // with no furniture, the room's picture, faint, in the middle
      if (!furnished) h.push('<text x="' + (X + Wd / 2) + '" y="' + (Y + Ht / 2 + (r.h <= 4 ? 4 : 12)) + '" font-size="' + (r.h <= 4 ? 46 : 66) + '" text-anchor="middle" dominant-baseline="middle" opacity=".32">' + esc(info.icon && info.icon.indexOf('svg:') !== 0 ? info.icon : '') + '</text>');
      var name = String(info.name || '').toUpperCase(), fs = Math.min(26, Math.floor((Wd - 18) / Math.max(4, name.length * 0.52)));
      h.push('<text class="rn" data-room="' + i + '" x="' + (X + Wd / 2) + '" y="' + (Y + 30) + '" font-family="Anton, Impact, sans-serif" font-size="' + fs + '" letter-spacing="1" text-anchor="middle" fill="' + L.ink + '" stroke="' + L.rooms[i] + '" stroke-width="5" paint-order="stroke">' + esc(name) + '</text>');
    });
    // doors: a gap in the wall with a bright threshold
    B.DOORS.forEach(function (d) {
      var x1, y1, x2, y2;
      if (d.x === d.rx) { var ey = d.y > d.ry ? (d.ry + 1) * CELL : d.ry * CELL; x1 = d.rx * CELL + 6; x2 = (d.rx + 1) * CELL - 6; y1 = y2 = ey; }
      else { var ex = d.x > d.rx ? (d.rx + 1) * CELL : d.rx * CELL; y1 = d.ry * CELL + 6; y2 = (d.ry + 1) * CELL - 6; x1 = x2 = ex; }
      h.push('<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + L.floor + '" stroke-width="12"/>');
      h.push('<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + L.door + '" stroke-width="5" stroke-linecap="round"/>');
    });
    // secret passages: a staircase in the room's outer corner
    B.ROOMS.forEach(function (r, i) {
      if (r.passage == null) return;
      var cx = (r.x === 0 ? r.x * CELL + 26 : (r.x + r.w) * CELL - 26), cy = (r.y === 0 ? r.y * CELL + 60 : (r.y + r.h) * CELL - 96);
      if (r.y !== 0 && r.h > 4) cy = (r.y + r.h) * CELL - 100;
      h.push('<g class="pass" data-room="' + i + '"><rect x="' + (cx - 17) + '" y="' + (cy - 17) + '" width="34" height="34" rx="5" fill="' + L.frame + '" opacity=".85"/>');
      for (k = 0; k < 4; k++) h.push('<rect x="' + (cx - 13 + k * 6) + '" y="' + (cy + 9 - k * 6) + '" width="' + (26 - k * 6) + '" height="5" fill="' + L.accent + '"/>');
      h.push('</g>');
    });
    // the case file in the middle
    var c = B.CENTER, CX = c.x * CELL, CY = c.y * CELL, CW = c.w * CELL, CH = c.h * CELL;
    h.push('<rect x="' + CX + '" y="' + CY + '" width="' + CW + '" height="' + CH + '" rx="8" fill="' + L.center + '" stroke="' + L.centerInk + '" stroke-width="3"/>');
    h.push('<rect x="' + CX + '" y="' + CY + '" width="' + CW + '" height="' + CH + '" rx="8" fill="url(#cg)"/>');
    if (!opts.noEnvelope) {
      var ex0 = CX + 30, ey0 = CY + 56, ew = CW - 60, eh = 92;
      h.push('<g class="env"><rect x="' + ex0 + '" y="' + ey0 + '" width="' + ew + '" height="' + eh + '" rx="4" fill="#efe1bf" stroke="#5a3d1a" stroke-width="2"/><path d="M' + ex0 + ' ' + ey0 + 'L' + (ex0 + ew / 2) + ' ' + (ey0 + 44) + 'L' + (ex0 + ew) + ' ' + ey0 + '" fill="#e2cfa3" stroke="#5a3d1a" stroke-width="2"/><circle cx="' + (ex0 + ew / 2) + '" cy="' + (ey0 + 44) + '" r="11" fill="#9b1b2a"/><text x="' + (ex0 + ew / 2) + '" y="' + (ey0 + 80) + '" font-family="Anton, Impact, sans-serif" font-size="15" letter-spacing="2" text-anchor="middle" fill="#5a3d1a">TOP SECRET</text></g>');
      h.push('<text x="' + (CX + CW / 2) + '" y="' + (CY + 34) + '" font-family="Anton, Impact, sans-serif" font-size="22" letter-spacing="3" text-anchor="middle" fill="' + L.centerInk + '">CASE FILE</text>');
    }
    h.push('</svg>');
    return h.join('');
  };
})();
