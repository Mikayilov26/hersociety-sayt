// HER Society — girişdə QR oxutmaq (bir neçə telefon eyni anda; internet kəsilsə də işləyir)
(function () {
  var HS = window.HS, db = HS.db, e = HS.esc;
  var el = function (id) { return document.getElementById(id); };
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var EV = new URLSearchParams(location.search).get('g') || '';
  var ACAR = 'hs-giris-' + EV;

  if (!/^[0-9a-f-]{36}$/.test(EV) || !db) { el('linkXeta').hidden = false; return; }

  // Yaddaş: {kod, data:{event,list}, novbe:[{acar,usul,vaxt}], yerli:{biletId: vaxt}}
  var S = yukle() || { kod: '', data: null, novbe: [], yerli: {} };
  function yukle() { try { return JSON.parse(localStorage.getItem(ACAR)); } catch (x) { return null; } }
  function saxla() { try { localStorage.setItem(ACAR, JSON.stringify(S)); return true; } catch (x) { return false; } }

  /* ---------- Giriş ---------- */
  function basla() {
    if (S.kod && S.data) { goster(); yenile(); }
    else el('giris').hidden = false;
  }
  el('daxil').addEventListener('click', function () {
    var kod = el('kod').value.trim(); if (!kod) return;
    el('daxil').disabled = true; el('girisXeta').hidden = true;
    db.rpc('giris_ac', { ev: EV, kod: kod }).then(function (r) {
      el('daxil').disabled = false;
      if (r.error || !r.data) { el('girisXeta').hidden = false; el('girisXeta').textContent = r.error ? 'İnternet yoxdur. Bağlantını yoxlayın.' : 'Kod səhvdir və ya giriş hələ açılmayıb.'; return; }
      S = { kod: kod, data: r.data, novbe: [], yerli: {} }; saxla();
      el('giris').hidden = true; goster();
    });
  });
  el('kod').addEventListener('keydown', function (ev) { if (ev.key === 'Enter') el('daxil').click(); });
  el('cixis').addEventListener('click', function () {
    soruş('Çıxış edilsin?', 'Kod bu telefondan silinəcək. Qeyd olunan girişlər itməyəcək' + (S.novbe.length ? ', amma göndərilməmiş ' + S.novbe.length + ' qeyd var — əvvəlcə internetə qoşulun.' : '.'), function () {
      if (S.novbe.length) return;
      try { localStorage.removeItem(ACAR); } catch (x) {} location.reload();
    });
  });

  function goster() {
    el('app').hidden = false; el('giris').hidden = true;
    var ev = S.data.event, t = HS.hisseler(ev.starts_at);
    el('evAd').textContent = ev.title; el('evTarix').textContent = t.gun + ' ' + t.ay + (ev.time_tbd ? '' : ' · ' + t.saat);
    ciz();
  }

  /* ---------- Məlumat ---------- */
  function siyahi() { return (S.data && S.data.list) || []; }
  function gelib(b) { return S.yerli[b.id] || b.in; }
  // Qonaq sirri telefonda saxlanmır, yalnız izi (SHA-256) — oğurlansa da istifadə oluna bilməz
  function iz(s) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then(function (b) {
      return Array.from(new Uint8Array(b), function (x) { return x.toString(16).padStart(2, '0'); }).join('');
    });
  }
  function tap(acar, h) {
    acar = acarTemizle(String(acar || '').trim());
    var up = acar.toUpperCase();
    return siyahi().filter(function (b) { return (h && b.h === h) || b.code === up || b.id === acar; })[0] || null;
  }
  function acarTemizle(metn) {
    var s = String(metn), k = s.match(/[?&]k=([A-Za-z0-9]{20,})/); if (k) return k[1];
    var kohne = s.match(/#t=([A-Z0-9]{6})\./); if (kohne) return kohne[1]; // köhnə sistemin kartları (21 noyabr)
    return s.trim();
  }
  function saat(v) { return HS.hisseler(v).saat; }

  function ciz() {
    var l = siyahi(), aktiv = l.filter(function (b) { return !b.revoked; });
    var gelen = aktiv.filter(gelib);
    el('say').innerHTML = gelen.length + '<small>/' + aktiv.length + '</small>';
    el('gozlenen').textContent = (aktiv.length - gelen.length) + ' gözlənilir';
    var q = el('axtar').value.trim().toLocaleLowerCase('az');
    var gq = aktiv.filter(function (b) { return !gelib(b) && (!q || b.name.toLocaleLowerCase('az').indexOf(q) >= 0 || String(b.num) === q.replace(/^0+/, '')); });
    el('qonaqlar').innerHTML = (gq.slice(0, q ? 50 : 200).map(function (b) {
      return '<div class="setir"><div><div class="ad">№ ' + pad(b.num) + ' · ' + e(b.name) + '</div><div class="alt">Kod ' + b.code + '</div></div><button class="duyme kicik" type="button" data-daxil="' + b.id + '">Daxil et</button></div>';
    }).join('')) || '<p class="bos-qeyd">' + (q ? 'Gözlənilənlər arasında tapılmadı.' : 'Hamı gəlib ✓') + '</p>';
    var gl = gelen.slice().sort(function (a, b) { return new Date(gelib(b)) - new Date(gelib(a)); });
    el('gelenler').innerHTML = gl.map(function (b) {
      return '<div class="setir"><div><div class="ad">№ ' + pad(b.num) + ' · ' + e(b.name) + '</div><div class="alt">' + saat(gelib(b)) + (S.yerli[b.id] && !b.in ? ' · göndərilir…' : '') + '</div></div><button class="duyme kicik tehlike" type="button" data-geri="' + b.id + '">Geri al</button></div>';
    }).join('') || '<p class="bos-qeyd">Hələ heç kim qeyd olunmayıb.</p>';
    var z = el('zolaq');
    if (!navigator.onLine) { z.className = 'zolaq xeb'; z.textContent = 'İnternet yoxdur — oxutmağa davam edin, qeydlər telefonda saxlanır' + (S.novbe.length ? ' (' + S.novbe.length + ' gözləyir)' : '') + '.'; }
    else if (S.novbe.length) { z.className = 'zolaq xeb'; z.textContent = S.novbe.length + ' qeyd göndərilir…'; }
    else { z.className = 'zolaq'; z.textContent = 'Bütün telefonlar eyni siyahını görür ✓'; }
  }
  el('axtar').addEventListener('input', ciz);

  // Serverdən yenilə (başqa telefonların qeydləri də gəlir)
  var yenilenir = false;
  function yenile() {
    if (yenilenir || !navigator.onLine) { ciz(); return Promise.resolve(); }
    yenilenir = true;
    return gonderNovbe().then(function () { return db.rpc('giris_ac', { ev: EV, kod: S.kod }); }).then(function (r) {
      yenilenir = false;
      if (r.error) return;
      if (!r.data) { // kod dəyişib və ya giriş söndürülüb
        el('zolaq').className = 'zolaq xeb'; el('zolaq').textContent = 'Giriş söndürülüb və ya kod dəyişib. Təşkilatçıya müraciət edin.'; return;
      }
      S.data = r.data;
      siyahi().forEach(function (b) { if (b.in && S.yerli[b.id] && !S.novbe.some(function (n) { return n.id === b.id; })) delete S.yerli[b.id]; });
      saxla(); ciz();
    }, function () { yenilenir = false; ciz(); });
  }
  function gonderNovbe() {
    if (!S.novbe.length) return Promise.resolve();
    var n = S.novbe[0];
    return db.rpc('giris_qeyd', { ev: EV, kod: S.kod, acar: n.acar, usul: n.usul, vaxt: n.vaxt }).then(function (r) {
      if (r.error) throw r.error;
      S.novbe.shift(); saxla();
      return gonderNovbe();
    });
  }
  setInterval(yenile, 15000);
  window.addEventListener('online', yenile);
  window.addEventListener('offline', ciz);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') yenile(); });

  /* ---------- Nəticə ekranı ---------- */
  var mesgul = false, actx = null;
  function ses(ok) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      (ok ? [880, 1320] : [220, 180]).forEach(function (f, i) {
        var o = actx.createOscillator(), g = actx.createGain(); o.type = ok ? 'sine' : 'square'; o.frequency.value = f; g.gain.value = ok ? .18 : .08;
        o.connect(g); g.connect(actx.destination); var t = actx.currentTime + i * .13; o.start(t); o.stop(t + .12);
      });
    } catch (x) {}
  }
  function ekran(nov, ic, a, b, c) {
    var o = el('ov'); o.className = nov; o.hidden = false; el('ovIc').textContent = ic; el('ov1').textContent = a; el('ov2').textContent = b; el('ov3').textContent = c || '';
    mesgul = true; ses(nov === 'ok'); if (navigator.vibrate) navigator.vibrate(nov === 'ok' ? 80 : [60, 60, 60]);
    el('novbeti').focus();
  }
  el('novbeti').addEventListener('click', function () { el('ov').hidden = true; mesgul = false; sonVaxt = Date.now(); });

  function netice(r, usul) {
    if (r.status === 'ok') ekran('ok', '✓', 'XOŞ GƏLDİNİZ', r.name, 'Dəvət № ' + pad(r.num) + (usul !== 'qr' ? ' · əl ilə qeyd olundu' : ''));
    else if (r.status === 'artiq') ekran('used', '!', 'ARTIQ DAXİL OLUB', r.name, 'Saat ' + saat(r.in) + '-də daxil olub · № ' + pad(r.num));
    else if (r.status === 'legv') ekran('bad', '✕', 'DƏVƏT LƏĞV OLUNUB', r.name, 'Bu kart təşkilatçı tərəfindən ləğv edilib · № ' + pad(r.num));
    else if (r.status === 'kod') ekran('bad', '!', 'GİRİŞ SÖNDÜRÜLÜB', 'Kod artıq keçərli deyil', 'Təşkilatçıya müraciət edin');
    else ekran('bad', '✕', 'TANINMADI', 'Bu QR bizim dəvət deyil', 'Kodu əl ilə yoxlayın və ya təşkilatçıya müraciət edin');
  }

  // Qeyd: əvvəl serverə (3 san.), alınmasa telefonda saxla və sonra göndər
  function qeyd(metn, usul) {
    var acar = acarTemizle(metn);
    if (acar.length >= 20) iz(acar).then(function (h) { qeydEt(acar, usul, tap(acar, h)); });
    else qeydEt(acar, usul, tap(acar));
  }
  function qeydEt(acar, usul, b) {
    var vaxt = new Date().toISOString();
    var yerliNetice = function () {
      if (!b) return { status: navigator.onLine ? 'yoxdur' : 'yoxdur' };
      if (b.revoked) return { status: 'legv', name: b.name, num: b.num };
      if (gelib(b)) return { status: 'artiq', name: b.name, num: b.num, in: gelib(b) };
      S.yerli[b.id] = vaxt; S.novbe.push({ id: b.id, acar: b.id, usul: usul, vaxt: vaxt }); saxla();
      return { status: 'ok', name: b.name, num: b.num, in: vaxt };
    };
    if (!navigator.onLine) { var r0 = yerliNetice(); netice(r0, usul); ciz(); return; }
    var bitdi = false;
    var taymer = setTimeout(function () { if (bitdi) return; bitdi = true; netice(yerliNetice(), usul); ciz(); }, 3000);
    db.rpc('giris_qeyd', { ev: EV, kod: S.kod, acar: b ? b.id : acar, usul: usul, vaxt: vaxt }).then(function (r) {
      if (bitdi) return; bitdi = true; clearTimeout(taymer);
      if (r.error || !r.data) { netice(yerliNetice(), usul); ciz(); return; }
      var d = r.data;
      if (b && (d.status === 'ok' || d.status === 'artiq')) b.in = d.in;
      if (b && d.status === 'legv') b.revoked = true;
      saxla(); netice(d, usul); ciz();
      if (!b && d.status === 'ok') yenile(); // yeni kart idi, siyahını yenilə
    }, function () { if (bitdi) return; bitdi = true; clearTimeout(taymer); netice(yerliNetice(), usul); ciz(); });
  }

  el('elTesdiq').addEventListener('click', function () {
    var v = el('elKod').value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (v.length !== 6) { ekran('bad', '!', 'KOD 6 SİMVOLDUR', v || '—', 'Kartdakı KOD sözünün yanındakı yazını diqqətlə yazın'); return; }
    el('elKod').value = ''; qeyd(v, 'kod');
  });
  el('qonaqlar').addEventListener('click', function (ev) {
    var bt = ev.target.closest('[data-daxil]'); if (!bt) return;
    var b = siyahi().filter(function (x) { return x.id === bt.getAttribute('data-daxil'); })[0]; if (!b) return;
    soruş('Daxil olaraq qeyd edilsin?', '№ ' + pad(b.num) + ' · ' + b.name, function () { qeyd(b.id, 'siyahi'); });
  });
  el('gelenler').addEventListener('click', function (ev) {
    var bt = ev.target.closest('[data-geri]'); if (!bt) return;
    var b = siyahi().filter(function (x) { return x.id === bt.getAttribute('data-geri'); })[0]; if (!b) return;
    soruş('Qeyd geri alınsın?', '№ ' + pad(b.num) + ' · ' + b.name + ' — səhvən qeyd olunubsa.', function () {
      if (!navigator.onLine) { ekran('bad', '!', 'İNTERNET YOXDUR', 'Geri almaq üçün internet lazımdır', ''); return; }
      db.rpc('giris_geri', { ev: EV, kod: S.kod, bilet: b.id }).then(function (r) {
        if (r.error || !r.data) return;
        b.in = null; delete S.yerli[b.id]; S.novbe = S.novbe.filter(function (n) { return n.id !== b.id; }); saxla(); ciz();
      });
    });
  });

  function soruş(basliq, metn, beli) {
    var m = el('tesdiq'); el('tBasliq').textContent = basliq; el('tMetn').textContent = metn; m.hidden = false;
    el('tXeyr').onclick = function () { m.hidden = true; };
    el('tBeli').onclick = function () { m.hidden = true; beli(); };
  }

  /* ---------- Kamera ---------- */
  var axin = null, oxuyur = false, sonMetn = '', sonVaxt = 0, sonOxu = 0;
  var cv = el('cv'), cx = cv.getContext('2d', { willReadFrequently: true });
  el('kameraAc').addEventListener('click', function () {
    el('kameraXeta').hidden = true;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false }).then(function (s) {
      axin = s; var v = el('cam'); v.srcObject = s; v.play().catch(function () {});
      el('camwrap').hidden = false; el('kameraAc').hidden = true;
      try { if ('wakeLock' in navigator) navigator.wakeLock.request('screen'); } catch (x) {}
      try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); actx.resume && actx.resume(); } catch (x) {}
      oxuyur = true; requestAnimationFrame(dovr);
    }, function () {
      el('kameraXeta').hidden = false;
      el('kameraXeta').textContent = 'Kamera açılmadı. Safari-də ünvan sətrindəki "aA" → Veb sayt ayarları → Kamera → İcazə ver.';
    });
  });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && oxuyur) { try { if ('wakeLock' in navigator) navigator.wakeLock.request('screen'); } catch (x) {} } });
  function dovr(ts) {
    if (!oxuyur) return;
    requestAnimationFrame(dovr);
    if (mesgul || ts - sonOxu < 120) return;
    sonOxu = ts;
    var v = el('cam'); if (v.readyState < 2 || !v.videoWidth) return;
    var s = Math.min(v.videoWidth, v.videoHeight), side = Math.min(s, 720);
    cv.width = side; cv.height = side;
    cx.drawImage(v, (v.videoWidth - s) / 2, (v.videoHeight - s) / 2, s, s, 0, 0, side, side);
    var r = jsQR(cx.getImageData(0, 0, side, side).data, side, side, { inversionAttempts: 'dontInvert' });
    if (r && r.data) {
      if (r.data === sonMetn && Date.now() - sonVaxt < 2500) return;
      sonMetn = r.data; sonVaxt = Date.now();
      mesgul = true; qeyd(r.data, 'qr');
    }
  }

  basla();
})();
