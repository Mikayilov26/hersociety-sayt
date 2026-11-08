// HER Society — admin: statistika və qonaq rəyləri
(function () {
  var HS = window.HS, db = HS.db, e = HS.esc;
  var el = function (id) { return document.getElementById(id); };
  if (!db) return;

  var reyler = [], gorusler = [];

  function faiz(a, b) { return b ? Math.round(a / b * 100) : 0; }
  function tarix(g) { var t = HS.hisseler(g.starts_at); return t.gun + ' ' + t.ay + ' ' + t.il; }
  function qiymetYaz(q) { var s = ''; for (var i = 1; i <= 5; i++) s += i <= q ? '♥' : '<span class="bos">♥</span>'; return s; }
  function bildir(m) { var b = el('bildiris'); b.textContent = m; b.hidden = false; clearTimeout(bildir.t); bildir.t = setTimeout(function () { b.hidden = true; }, 3500); }

  // Sistem vəziyyəti: bazadakı veziyyet_hesabati() (yalnız oxuyur) — tədbirdən əvvəl hər şeyi bir baxışda göstərir
  var MERHELE = { gelecek: 'gələcək', bu_gun: 'bu gün', kecib: 'keçib', arxiv: 'arxiv', gizli: 'gizli' };
  function veziyyetYukle() {
    var k = el('stVeziyyet'); if (!k) return;
    k.innerHTML = '<p class="alt">Yoxlanılır…</p>';
    db.rpc('veziyyet_hesabati').then(function (r) {
      if (r.error || !r.data) { k.innerHTML = '<p class="alt">Vəziyyəti yoxlamaq alınmadı. Səhifəni yeniləyin.</p>'; return; }
      var d = r.data, x = d.xeberdarliqlar || [], html = '';
      html += x.length
        ? x.map(function (m) { return '<p class="xeberdarliq">' + e(m) + '</p>'; }).join('')
        : '<h3>Hər şey qaydasındadır ✓</h3>';
      (d.gorusler || []).filter(function (g) { return g.merhele === 'gelecek' || g.merhele === 'bu_gun'; }).forEach(function (g) {
        var kt = g.kartlar || {};
        html += '<div class="st-setir"><span><b>' + e(g.ad) + '</b> · ' + (MERHELE[g.merhele] || g.merhele) + '</span></div>' +
          '<div class="st-setir"><span>Kart: ' + (kt.etibarli || 0) + ' · gəlib ' + (kt.gelib || 0) + (kt.legv ? ' · ləğv ' + kt.legv : '') + '</span></div>' +
          '<div class="st-setir"><span>Saat: ' + (g.saat_belli ? 'bəlli' : 'hələ yazılmayıb') + ' · Albom: ' + (g.albom_acik ? 'açıq' : 'bağlı') + ' · Giriş: ' + (g.giris_acik ? 'açıq' : 'bağlı') + '</span></div>';
      });
      var eh = d.ehtiyat || {}, dr = d.drive || {};
      html += '<div class="st-setir"><span>Son ehtiyat nüsxəsi: ' + (eh.son ? (function (t) { return t.gun + ' ' + t.ay + ', ' + t.saat; })(HS.hisseler(eh.son)) : 'yoxdur') + '</span></div>' +
        '<div class="st-setir"><span>Google Drive: ' + (dr.qosulub ? (dr.xeta ? 'xəta var' : 'qoşulub ✓') : 'qoşulmayıb') + (dr.gozleyen ? ' · köçməyi gözləyən ' + dr.gozleyen : '') + '</span></div>';
      k.innerHTML = html;
    }).catch(function () { k.innerHTML = '<p class="alt">Vəziyyəti yoxlamaq alınmadı. Səhifəni yeniləyin.</p>'; });
  }

  window.stYukle = function () {
    veziyyetYukle();
    el('stSiyahi').innerHTML = '<p class="bos-qeyd">Yüklənir…</p>';
    Promise.all([
      db.from('events').select('id,title,topic,guest_name,starts_at').is('deleted_at', null).order('starts_at', { ascending: false }),
      db.from('tickets').select('event_id,revoked,checked_in_at'),
      db.from('photos').select('event_id,on_site,size_bytes'),
      db.from('feedback').select('id,event_id,rating,liked,wish,name,created_at').order('created_at', { ascending: false })
    ]).then(function (r) {
      for (var i = 0; i < r.length; i++) if (r[i].error) throw r[i].error;
      gorusler = r[0].data || []; reyler = r[3].data || [];
      var s = {};
      function al(id) { return s[id] || (s[id] = { kart: 0, gelen: 0, sekil: 0, saytda: 0, hecm: 0, rey: 0, qcem: 0, qsay: 0 }); }
      (r[1].data || []).forEach(function (b) { if (b.revoked) return; var x = al(b.event_id); x.kart++; if (b.checked_in_at) x.gelen++; });
      (r[2].data || []).forEach(function (p) { if (!p.event_id) return; var x = al(p.event_id); x.sekil++; if (p.on_site) x.saytda++; x.hecm += p.size_bytes || 0; });
      reyler.forEach(function (f) { var x = al(f.event_id); x.rey++; if (f.rating) { x.qcem += f.rating; x.qsay++; } });

      var c = { kart: 0, gelen: 0, sekil: 0, rey: 0, qcem: 0, qsay: 0 }, indi = Date.now();
      gorusler.forEach(function (g) {
        var x = al(g.id);
        c.sekil += x.sekil; c.rey += x.rey; c.qcem += x.qcem; c.qsay += x.qsay;
        if (new Date(g.starts_at).getTime() < indi) { c.kart += x.kart; c.gelen += x.gelen; }
      });
      el('stCem').innerHTML =
        '<div><span>Keçirilən görüş</span><b>' + gorusler.filter(function (g) { return new Date(g.starts_at).getTime() < indi; }).length + '</b></div>' +
        '<div><span>Gələn qonaq</span><b>' + c.gelen + '</b></div>' +
        '<div><span>Gəlmə faizi</span><b>' + (c.kart ? faiz(c.gelen, c.kart) + '%' : '—') + '</b></div>' +
        '<div><span>Orta qiymət</span><b>' + (c.qsay ? (c.qcem / c.qsay).toFixed(1).replace('.', ',') + ' / 5' : '—') + '</b></div>' +
        '<div><span>Yüklənən şəkil</span><b>' + c.sekil + '</b></div>' +
        '<div><span>Rəy</span><b>' + c.rey + '</b></div>';

      el('stSiyahi').innerHTML = gorusler.map(function (g) {
        var x = al(g.id), kecib = new Date(g.starts_at).getTime() < indi, f = faiz(x.gelen, x.kart);
        var evReyler = reyler.filter(function (y) { return y.event_id === g.id; });
        return '<div class="st-ev">' +
          '<p class="etiket">' + tarix(g) + (kecib ? '' : ' · gələcək') + '</p>' +
          '<h3>' + e(g.title) + (g.topic ? ' · ' + e(g.topic) : '') + '</h3>' +
          (g.guest_name ? '<p class="alt">Qonaq: ' + e(g.guest_name) + '</p>' : '') +
          '<div class="st-setir"><span>' + (kecib ? 'Gəlib ' + x.gelen + ' / kart ' + x.kart : 'Verilən kart: ' + x.kart) + '</span><span>' + (kecib && x.kart ? f + '%' : '') + '</span></div>' +
          (kecib && x.kart ? '<div class="st-zolaq" aria-hidden="true"><i style="width:' + f + '%"></i></div>' : '') +
          '<div class="st-setir"><span>Şəkil: ' + x.sekil + (x.saytda ? ' (saytda ' + x.saytda + ')' : '') + '</span><span>' + (x.hecm ? HS.mb(x.hecm) : '') + '</span></div>' +
          '<div class="st-setir"><span>Rəy: ' + x.rey + '</span><span>' + (x.qsay ? (x.qcem / x.qsay).toFixed(1).replace('.', ',') + ' / 5' : '') + '</span></div>' +
          (evReyler.length ? '<details><summary>Rəyləri oxu (' + evReyler.length + ')</summary>' +
            evReyler.map(function (y) {
              var t = HS.hisseler(y.created_at);
              return '<div class="rey-kart"><div class="ust"><span>' + e(y.name || 'Adsız') + ' · ' + t.gun + ' ' + t.ay + '</span>' +
                (y.rating ? '<span class="q" aria-label="' + y.rating + ' / 5">' + qiymetYaz(y.rating) + '</span>' : '') + '</div>' +
                (y.liked ? '<p><b>Xoşa gələn:</b> ' + e(y.liked) + '</p>' : '') +
                (y.wish ? '<p><b>Növbəti dəfə:</b> ' + e(y.wish) + '</p>' : '') + '</div>';
            }).join('') +
            '<button class="duyme kicik" type="button" data-excel="' + g.id + '" style="margin-top:10px">Rəyləri yüklə (Excel)</button></details>' : '') +
          '</div>';
      }).join('') || '<p class="bos-qeyd">Hələ görüş yoxdur.</p>';
    }).catch(function (x) { console.error(x); el('stSiyahi').innerHTML = '<p class="xeta">Yüklənmədi. İnterneti yoxlayıb bölməni yenidən açın.</p>'; });
  };

  el('stSiyahi').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-excel]'); if (!b || !window.XLSX) return;
    var g = gorusler.filter(function (x) { return x.id === b.getAttribute('data-excel'); })[0];
    var setirler = reyler.filter(function (y) { return y.event_id === g.id; }).map(function (y) {
      var t = HS.hisseler(y.created_at);
      return { 'Tarix': t.gun + ' ' + t.ay + ' ' + t.saat, 'Ad': y.name || '', 'Qiymət (1–5)': y.rating || '', 'Xoşa gələn': y.liked || '', 'Növbəti dəfə': y.wish || '' };
    });
    var ws = XLSX.utils.json_to_sheet(setirler), wb = XLSX.utils.book_new();
    ws['!cols'] = [{ wch: 16 }, { wch: 20 }, { wch: 12 }, { wch: 50 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Rəylər');
    var t = HS.hisseler(g.starts_at);
    XLSX.writeFile(wb, 'HER-Society-reyler-' + t.il + '-' + t.gun + '-' + t.ay + '.xlsx');
    bildir('Rəylər yükləndi.');
  });
})();
