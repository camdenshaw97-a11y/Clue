/* The cast editor: your own suspects, weapons and rooms. Lives on the TV page. */
(function () {
  'use strict';
  var F = window.Game, B = window.Boards, $ = F.$, esc = F.esc;
  var KEY = 'clue.casts';
  var CLASSIC = B.THEMES[0];
  // Where each room sits on the board, so people know which one they're naming.
  var WHERE = ['top left, secret passage to the bottom right', 'top middle', 'top right, secret passage to the bottom left', 'right side', 'bottom right, secret passage to the top left', 'bottom middle', 'bottom left, secret passage to the top right', 'left side, lower', 'left side, upper'];

  F.savedCasts = function () {
    var list = F.store.get(KEY, []);
    return Array.isArray(list) ? list.filter(function (b) { return b && typeof b === 'object' && b.name; }).slice(0, 12) : [];
  };

  F.openEditor = function (opts) {
    var casts = F.savedCasts();
    var back = document.createElement('div');
    back.className = 'ed-back';
    back.innerHTML = '<div class="ed"></div>';
    document.body.appendChild(back);
    var ed = $('.ed', back);

    function save() { F.store.set(KEY, casts); if (opts.onChange) opts.onChange({ boards: casts }); }
    function close() { back.classList.add('out'); setTimeout(function () { back.remove(); }, 220); }
    function count(c) { var n = 0; ['suspects', 'weapons', 'rooms'].forEach(function (k) { (c[k] || []).forEach(function (v) { if (v) n++; }); }); return n; }

    function list() {
      var h = '<div class="ed-top"><h2>MY CASTS</h2><button class="ed-btn ghost" data-a="close">Done</button></div>';
      h += '<p>Put your friends in as the suspects, name the weapons after inside jokes, turn the rooms into places you all know. It plays on the classic mansion with the same rules. Pick it when you set up a game.</p>';
      h += '<div class="ed-row"><button class="ed-btn pri" data-a="new">New cast</button><button class="ed-btn" data-a="export">Save to file</button><button class="ed-btn" data-a="import">Load from file</button></div>';
      if (!casts.length) h += '<div class="ed-empty">No casts yet.</div>';
      casts.forEach(function (c, k) {
        h += '<div class="ed-q"><b>' + esc(c.name) + '<small>' + count(c) + ' of 21 cards named' + (c.victim ? ' · victim: ' + esc(c.victim) : '') + '</small></b><button class="ed-btn" data-a="edit" data-k="' + k + '">Edit</button><button class="ed-btn red" data-a="del" data-k="' + k + '">Delete</button></div>';
      });
      ed.innerHTML = h;
    }

    function form(c, k) {
      var h = '<div class="ed-top"><h2>' + (c.name ? esc(c.name.toUpperCase()) : 'NEW CAST') + '</h2><button class="ed-btn ghost" data-a="back">Back</button></div>';
      h += '<p>Leave anything blank to keep the classic card. If you repeat a name, the game numbers them.</p>';
      h += '<div class="ed-grid" style="grid-template-columns:2fr 1fr"><div><label>NAME OF THE CAST (WHERE IT HAPPENED)</label><input id="edName" maxlength="24" value="' + esc(c.name || '') + '" placeholder="e.g. Jake’s Apartment"></div><div><label>THE VICTIM</label><input id="edVictim" maxlength="22" value="' + esc(c.victim || '') + '" placeholder="' + esc(CLASSIC.victim) + '"></div></div>';
      h += '<h3>SIX SUSPECTS</h3><div class="ed-grid">';
      CLASSIC.suspects.forEach(function (x, i) { var col = B.SUSPECT_COLORS[i]; h += '<div><label><i style="background:' + col.c2 + '"></i>' + (i === 0 ? 'goes first' : 'plays ' + ordinal(i + 1)) + '</label><input data-kind="suspects" data-i="' + i + '" maxlength="22" value="' + esc((c.suspects || [])[i] || '') + '" placeholder="' + esc(x.name) + '"></div>'; });
      h += '</div><h3>SIX WEAPONS</h3><div class="ed-grid">';
      CLASSIC.weapons.forEach(function (x, i) { h += '<div><label>weapon ' + (i + 1) + '</label><input data-kind="weapons" data-i="' + i + '" maxlength="22" value="' + esc((c.weapons || [])[i] || '') + '" placeholder="' + esc(x.name) + '"></div>'; });
      h += '</div><h3>NINE ROOMS</h3><div class="ed-grid">';
      CLASSIC.rooms.forEach(function (x, i) { h += '<div><label>' + WHERE[i] + '</label><input data-kind="rooms" data-i="' + i + '" maxlength="20" value="' + esc((c.rooms || [])[i] || '') + '" placeholder="' + esc(x.name) + '"></div>'; });
      h += '</div><div class="ed-err" id="edErr"></div><div class="ed-row"><button class="ed-btn pri" data-a="save" data-k="' + (k == null ? '' : k) + '">Save the cast</button><button class="ed-btn ghost" data-a="back">Cancel</button></div>';
      ed.innerHTML = h;
      setTimeout(function () { var n = $('#edName', ed); if (n && !n.value) n.focus(); }, 60);
    }
    function ordinal(n) { return n + (['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : (n % 10 < 4 ? n % 10 : 0)]); }

    function read() {
      var c = { name: $('#edName', ed).value.trim(), victim: $('#edVictim', ed).value.trim(), suspects: [], weapons: [], rooms: [] };
      ed.querySelectorAll('input[data-kind]').forEach(function (inp) { c[inp.getAttribute('data-kind')][Number(inp.getAttribute('data-i'))] = inp.value.trim(); });
      return c;
    }

    ed.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b) return;
      var a = b.getAttribute('data-a'), k = b.getAttribute('data-k');
      if (a === 'close') close();
      else if (a === 'new') form({}, null);
      else if (a === 'edit') form(casts[Number(k)], Number(k));
      else if (a === 'back') list();
      else if (a === 'del') {
        F.confirm('DELETE ' + casts[Number(k)].name.toUpperCase() + '?', 'It’s gone from this computer for good.', 'Delete', true).then(function (ok) { if (ok) { casts.splice(Number(k), 1); save(); list(); } });
      } else if (a === 'save') {
        var c = read(), err = '';
        if (!c.name) err = 'Give the cast a name.';
        else if (!count(c)) err = 'Name at least one card.';
        else if (casts.some(function (x, j) { return x.name.toLowerCase() === c.name.toLowerCase() && String(j) !== k; })) err = 'You already have a cast with that name.';
        if (err) { $('#edErr', ed).textContent = err; F.shake($('#edErr', ed)); return; }
        if (k === '' || k == null) casts.push(c); else casts[Number(k)] = c;
        save(); list();
      } else if (a === 'export') {
        var blob = new Blob([JSON.stringify({ kind: 'friend-clue casts', casts: casts }, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob), aa = document.createElement('a');
        aa.href = url; aa.download = 'friend-clue-casts.json'; document.body.appendChild(aa); aa.click(); aa.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      } else if (a === 'import') {
        var inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
        inp.onchange = function () {
          var f = inp.files && inp.files[0]; if (!f) return;
          f.text().then(function (txt) {
            var d = JSON.parse(txt), got = 0;
            (d.casts || []).forEach(function (c) { if (c && c.name && !casts.some(function (x) { return x.name.toLowerCase() === String(c.name).toLowerCase(); })) { casts.push(c); got++; } });
            casts = casts.slice(0, 12); save(); list();
            F.dialog({ title: got ? 'LOADED' : 'NOTHING NEW', text: got ? F.plural(got, 'cast') + ' added.' : 'Every cast in that file is already here.' });
          }).catch(function () { F.dialog({ title: 'CAN’T READ THAT', text: 'That doesn’t look like a file saved from here.' }); });
        };
        inp.click();
      }
    });
    list();
  };
})();
