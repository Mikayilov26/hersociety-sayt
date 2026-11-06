// HER Society — admin: ehtiyat nüsxələri və silinən görüşlər
(function () {
  var HS = window.HS, db = HS.db, e = HS.esc;
  var el = function (id) { return document.getElementById(id); };
  if (!db || !el('ehtiyatPanel')) return;

  function bildir(m) { var b = el('bildiris'); b.textContent = m; b.hidden = false; clearTimeout(bildir.t); bildir.t = setTimeout(function () { b.hidden = true; }, 3500); }
  function vaxt(s) { var t = HS.hisseler(s); return t.gun + ' ' + t.ay + ' ' + t.il + ', ' + t.saat; }
  function kb(n) { return n > 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }
  var NOV = { gunluk: 'gündəlik', ayliq: 'aylıq', el: 'əl ilə' };

  function veziyyet(list) {
    var son = list[0];
    if (!son) { el('ehVeziyyet').innerHTML = '<span style="color:var(--qirmizi)">Hələ nüsxə yoxdur.</span>'; return; }
    var saat = (Date.now() - new Date(son.vaxt).getTime()) / 3600e3;
    el('ehVeziyyet').innerHTML = (saat < 36 ? '<b>✓ Qaydasındadır.</b> ' : '<b style="color:var(--qirmizi)">Diqqət: son nüsxə ' + Math.round(saat / 24) + ' gün əvvəldir.</b> ') +
      'Son nüsxə: ' + vaxt(son.vaxt) + ' · ' + son.sayi.gorus + ' görüş, ' + son.sayi.kart + ' kart, ' + son.sayi.rey + ' rəy, ' + son.sayi.sekil + ' şəkil.';
  }
  function siyahi(list) {
    el('ehSiyahi').innerHTML = list.map(function (x) {
      return '<div class="qonaq-setir"><div><div class="ad">' + vaxt(x.vaxt) + '</div><div class="alt">' + NOV[x.novu] + ' · ' + kb(x.olcu) + ' · ' + x.sayi.kart + ' kart</div></div>' +
        '<button class="duyme kicik" type="button" data-eh="' + x.id + '">Excel</button></div>';
    }).join('') || '<p class="bos-qeyd">Yoxdur.</p>';
  }
  function silinenler() {
    return db.from('events').select('id,title,topic,guest_name,starts_at,deleted_at').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }).then(function (r) {
      var l = (r.data || []).filter(function (g) { return g.deleted_at; });
      el('silinenler').innerHTML = l.map(function (g) {
        var t = HS.hisseler(g.starts_at), qalan = Math.max(0, 30 - Math.floor((Date.now() - new Date(g.deleted_at).getTime()) / 864e5));
        return '<div class="qonaq-setir"><div><div class="ad">' + t.gun + '.' + ('0' + (['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avqust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'].indexOf(t.ay) + 1)).slice(-2) + '.' + t.il + ' - ' + e(g.guest_name || g.title) + '</div>' +
          '<div class="alt">' + qalan + ' gün sonra birdəfəlik silinəcək</div></div><button class="duyme kicik" type="button" data-qaytar="' + g.id + '">Geri qaytar</button></div>';
      }).join('') || '<p class="bos-qeyd">Yoxdur.</p>';
    });
  }
  window.ehYukle = function () {
    db.rpc('ehtiyat_siyahi').then(function (r) {
      if (r.error) { el('ehVeziyyet').textContent = 'Yüklənmədi.'; return; }
      veziyyet(r.data || []); siyahi(r.data || []);
    });
    silinenler();
  };

  // Excel: hər cədvəl ayrıca vərəqdə
  function excel(d, ad) {
    if (!window.XLSX) { bildir('Excel hazırlanmadı. Səhifəni yeniləyin.'); return; }
    var wb = XLSX.utils.book_new();
    function vereq(adi, list, xerite) {
      var ws = XLSX.utils.json_to_sheet((list || []).map(xerite));
      XLSX.utils.book_append_sheet(wb, ws, adi);
    }
    var gAd = {}; (d.events || []).forEach(function (g) { gAd[g.id] = HS.hisseler(g.starts_at).gun + ' ' + HS.hisseler(g.starts_at).ay + ' ' + HS.hisseler(g.starts_at).il + ' · ' + (g.guest_name || g.title); });
    vereq('Görüşlər', d.events, function (g) { return { 'Tarix': vaxt(g.starts_at), 'Saat bəlli deyil': g.time_tbd ? 'bəli' : '', 'Ad': g.title, 'Mövzu': g.topic || '', 'Qonaq': g.guest_name || '', 'Titul': g.guest_title || '', 'Məkan': g.venue || '', 'Ünvan': g.venue_detail || '', 'Kartdakı cümlə': g.card_note || '', 'Saytda': g.published ? 'bəli' : 'xeyr', 'Silinib': g.deleted_at ? vaxt(g.deleted_at) : '', 'id': g.id }; });
    vereq('Kartlar', d.tickets, function (b) { return { 'Görüş': gAd[b.event_id] || '', '№': b.num, 'Ad': b.name, 'Kod': b.code, 'Ləğv': b.revoked ? 'bəli' : '', 'Gəlib': b.checked_in_at ? vaxt(b.checked_in_at) : '', 'Yaradan': b.created_by || '', 'Yaradılıb': vaxt(b.created_at), 'açar': b.secret, 'id': b.id }; });
    vereq('Rəylər', d.feedback, function (f) { return { 'Görüş': gAd[f.event_id] || '', 'Tarix': vaxt(f.created_at), 'Ad': f.name || '', 'Qiymət': f.rating || '', 'Xoşa gələn': f.liked || '', 'Növbəti dəfə': f.wish || '' }; });
    vereq('Şəkillər', d.photos, function (p) { return { 'Görüş': gAd[p.event_id] || '', 'Yükləyən': p.uploader || '', 'Mənbə': p.source, 'Saytda': p.on_site ? 'bəli' : '', 'Endirilib': p.downloaded_at ? vaxt(p.downloaded_at) : '', 'Fayl': p.path, 'Yüklənib': vaxt(p.created_at) }; });
    XLSX.writeFile(wb, ad);
  }
  function fayl(t) { var h = HS.hisseler(t); return 'HER-Society-ehtiyat-' + h.il + '-' + h.gun + '-' + h.ay + '.xlsx'; }

  el('ehIndi').addEventListener('click', function () {
    var b = el('ehIndi'); b.disabled = true;
    db.rpc('ehtiyat_indi').then(function (r) {
      b.disabled = false;
      if (r.error) { bildir('Nüsxə alınmadı.'); return; }
      bildir('Nüsxə alındı.'); window.ehYukle();
    });
  });
  el('ehExcel').addEventListener('click', function () {
    db.rpc('ehtiyat_data', { nid: null }).then(function (r) {
      if (r.error || !r.data) { bildir('Yüklənmədi.'); return; }
      excel(r.data, fayl(new Date().toISOString())); bildir('Excel yükləndi.');
    });
  });
  el('ehSiyahi').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-eh]'); if (!b) return;
    db.rpc('ehtiyat_data', { nid: +b.getAttribute('data-eh') }).then(function (r) {
      if (r.error || !r.data) { bildir('Yüklənmədi.'); return; }
      excel(r.data, fayl(r.data.vaxt)); bildir('Excel yükləndi.');
    });
  });
  el('silinenler').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-qaytar]'); if (!b) return;
    db.from('events').update({ deleted_at: null }).eq('id', b.getAttribute('data-qaytar')).then(function (r) {
      if (r.error) { bildir('Qaytarılmadı.'); return; }
      bildir('Görüş geri qaytarıldı.'); silinenler(); if (window.gorusleriYenile) window.gorusleriYenile();
    });
  });

  /* ---------- Google Drive ---------- */
  function gb(n) { return n >= 1073741824 ? (n / 1073741824).toFixed(1).replace('.', ',') + ' GB' : Math.round(n / 1048576) + ' MB'; }
  function gGoster(v) {
    el('gAcarlar').hidden = true; el('gQos').hidden = true; el('gQosulub').hidden = true;
    if (!v.client) { el('gVez').textContent = 'Hələ qoşulmayıb. Əvvəlcə Google açarlarını əlavə edin.'; el('gAcarlar').hidden = false; return; }
    if (!v.qosulub) {
      el('gVez').innerHTML = 'Açarlar saxlanılıb. İndi hersociety.az@gmail.com hesabı ilə icazə verin.' + (v.xeta ? '<br><span style="color:var(--qirmizi)">Son xəta: ' + e(v.xeta) + '</span>' : '');
      el('gQos').hidden = false; return;
    }
    el('gVez').innerHTML = '<b>✓ Qoşulub:</b> ' + e(v.email || '') + (v.xeta ? '<br><span style="color:var(--qirmizi)">Son xəta: ' + e(v.xeta) + '</span>' : '');
    el('gQosulub').hidden = false;
    if (v.limit) {
      var f = Math.round(v.istifade / v.limit * 100);
      el('gBar').style.width = Math.min(100, f) + '%'; el('gBar').style.background = f >= 80 ? 'var(--qirmizi)' : '';
      el('gYer').innerHTML = 'Drive: ' + gb(v.istifade) + ' / ' + gb(v.limit) + ' (' + f + '%)' + (f >= 80 ? ' — <b style="color:var(--qirmizi)">yer dolmağa yaxındır</b>' : '');
    } else el('gYer').textContent = '';
  }
  function gYukle() { return db.rpc('google_veziyyet').then(function (r) { if (!r.error && r.data) gGoster(r.data); }); }
  var evvelki = window.ehYukle;
  window.ehYukle = function () { evvelki(); gYukle(); };
  el('gSaxla').addEventListener('click', function () {
    var c = el('gClient').value.trim(), s = el('gSecret').value.trim();
    el('gXeta').hidden = true;
    if (!/\.apps\.googleusercontent\.com$/.test(c)) { el('gXeta').hidden = false; el('gXeta').textContent = 'Client ID “.apps.googleusercontent.com” ilə bitməlidir.'; return; }
    if (s.length < 10) { el('gXeta').hidden = false; el('gXeta').textContent = 'Client secret-i yapışdırın.'; return; }
    db.rpc('google_ayar_saxla', { cid: c, csec: s }).then(function (r) {
      if (r.error) { el('gXeta').hidden = false; el('gXeta').textContent = 'Saxlanmadı. Yenidən yoxlayın.'; return; }
      el('gClient').value = ''; el('gSecret').value = ''; bildir('Açarlar saxlanıldı.'); gYukle();
    });
  });
  el('gQos').addEventListener('click', function () {
    var b = el('gQos'); b.disabled = true; b.textContent = 'Google açılır…';
    db.functions.invoke('google', { body: { action: 'url' } }).then(function (r) {
      if (r.data && r.data.url) { location.href = r.data.url; return; }
      b.disabled = false; b.textContent = 'Google Drive-ı qoş'; bildir('Alınmadı. Açarları yoxlayın.');
    });
  });
  el('gYenile').addEventListener('click', function () {
    db.functions.invoke('google', { body: { action: 'yoxla' } }).then(function (r) {
      bildir(r.data && r.data.ok ? 'Yeniləndi.' : 'Google ilə əlaqə alınmadı.'); gYukle();
    });
  });
  el('gAcarDeyis').addEventListener('click', function () { el('gAcarlar').hidden = false; });
  el('gAyir').addEventListener('click', function () {
    if (!window.confirm('Google Drive ayrılsın? Drive-dakı fayllar silinmir.')) return;
    db.rpc('google_ayir').then(function () { bildir('Ayrıldı.'); gYukle(); });
  });
  // Google-dan qayıdanda
  var qp = new URLSearchParams(location.search).get('google');
  if (qp) {
    var mesaj = { ok: 'Google Drive qoşuldu.', redd: 'İcazə verilmədi.', vaxt: 'Vaxt keçdi, yenidən “Google Drive-ı qoş” basın.', xeta: 'Qoşulmadı. Yenidən cəhd edin.' }[qp] || '';
    history.replaceState(null, '', location.pathname);
    var say = 0;
    (function gozle() {
      var t = document.querySelector('[data-tab="hesab"]');
      if (t && t.offsetParent !== null) { t.click(); if (mesaj) bildir(mesaj); return; }
      if (++say < 40) setTimeout(gozle, 250);
    })();
  }
})();
