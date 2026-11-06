// HER Society — admin: dəvət kartları, qonaq siyahısı, giriş linki
(function () {
  var HS = window.HS, db = HS.db, e = HS.esc;
  var el = function (id) { return document.getElementById(id); };
  if (!db) return;

  var gorusler = [], biletler = [], cari = null, sonKart = null, axtaris = '';
  var GIRIS_LINK = 'https://hersociety.az/giris/?g=';

  function bildir(m) { var b = el('bildiris'); b.textContent = m; b.hidden = false; clearTimeout(bildir.t); bildir.t = setTimeout(function () { b.hidden = true; }, 3500); }
  function saatsiz(b) { return b.checked_in_via === 'kohne-saatsiz'; }
  function tarix(g) { var t = HS.hisseler(g.starts_at); return t.gun + ' ' + t.ay + ' ' + t.il + (g.time_tbd ? '' : ' · ' + t.saat); }
  function xeta(x) { console.error(x); bildir('Xəta baş verdi. İnterneti yoxlayıb yenidən cəhd edin.'); }

  /* ---------- Görüşlər siyahısı (sağda gələn/kart sayı) ---------- */
  window.dvSiyahi = function () {
    el('dvDetal').hidden = true; el('dvSiyahi').hidden = false; cari = null;
    Promise.all([
      db.from('events').select('id,title,topic,guest_name,guest_title,starts_at,time_tbd,venue,venue_detail,card_note,door_active').is('deleted_at', null).order('starts_at', { ascending: false }),
      db.from('tickets').select('event_id,revoked,checked_in_at')
    ]).then(function (r) {
      if (r[0].error) throw r[0].error;
      gorusler = r[0].data || [];
      var say = {};
      (r[1].data || []).forEach(function (b) {
        if (b.revoked) return;
        var s = say[b.event_id] || (say[b.event_id] = { kart: 0, gelen: 0 });
        s.kart++; if (b.checked_in_at) s.gelen++;
      });
      var indi = Date.now() - 6 * 3600e3;
      el('dvSiyahi').innerHTML = gorusler.map(function (g) {
        var s = say[g.id] || { kart: 0, gelen: 0 }, gelecek = new Date(g.starts_at).getTime() >= indi;
        return '<button type="button" class="ev-setir" data-ev="' + g.id + '"><span class="sol"><span class="tarix-et">' + tarix(g) + (gelecek ? '' : ' · keçmiş') + '</span>' +
          '<b>' + e(g.title) + '</b><span>' + e(g.guest_name || g.topic || '') + '</span></span>' +
          '<span class="say">' + s.gelen + '/' + s.kart + '<small>gəlib / kart</small></span></button>';
      }).join('') || '<p class="bos-qeyd">Əvvəlcə Görüşlər bölməsində görüş əlavə edin.</p>';
    }).catch(xeta);
  };
  el('dvSiyahi').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-ev]'); if (!b) return;
    detalAc(b.getAttribute('data-ev'));
  });
  el('dvGeri').addEventListener('click', function () { dvSiyahi(); window.scrollTo(0, 0); });

  /* ---------- Görüşün içi ---------- */
  function detalAc(id) {
    cari = gorusler.filter(function (g) { return g.id === id; })[0]; if (!cari) return;
    el('dvSiyahi').hidden = true; el('dvDetal').hidden = false;
    el('dvTarix').textContent = tarix(cari);
    el('dvBasliq').textContent = cari.title + (cari.guest_name ? ' · ' + cari.guest_name : '');
    el('kartNetice').hidden = true; el('kXeta').hidden = true; el('kartAcilan').open = false; el('girisAcilan').open = false; el('kAd').value = ''; el('dvAxtar').value = ''; axtaris = '';
    girisVeziyyeti();
    biletleriYukle();
    window.scrollTo(0, 0);
  }

  function biletleriYukle() {
    return db.from('tickets').select('id,num,name,code,secret,revoked,checked_in_at,checked_in_via,created_by,created_at').eq('event_id', cari.id).order('num').then(function (r) {
      if (r.error) throw r.error;
      biletler = r.data || [];
      var aktiv = biletler.filter(function (b) { return !b.revoked; });
      var gelen = aktiv.filter(function (b) { return b.checked_in_at; }).length;
      el('dvStat').textContent = gelen + ' / ' + aktiv.length + ' gəlib' + (biletler.length > aktiv.length ? ' · ' + (biletler.length - aktiv.length) + ' kart ləğv olunub' : '');
      el('kNum').value = biletler.reduce(function (m, b) { return Math.max(m, b.num); }, 0) + 1;
      qonaqlariCiz();
    }).catch(xeta);
  }

  function qonaqlariCiz() {
    var q = axtaris.toLocaleLowerCase('az');
    var list = biletler.filter(function (b) {
      return !q || b.name.toLocaleLowerCase('az').indexOf(q) >= 0 || b.code.toLowerCase().indexOf(q) >= 0 || String(b.num) === q.replace(/^0+/, '');
    }).sort(function (a, b) { return b.num - a.num; });
    el('dvQonaqlar').innerHTML = list.map(function (b) {
      var st = b.revoked ? 'ləğv olunub' : b.checked_in_at ? 'gəlib' + (saatsiz(b) ? '' : ' · ' + HS.hisseler(b.checked_in_at).saat) : 'gözlənilir';
      return '<div class="qonaq-setir' + (b.revoked ? ' legv' : '') + '"><div><div class="ad">№ ' + HS.pad(b.num) + ' · ' + e(b.name) + '</div>' +
        '<div class="alt">Kod ' + b.code + ' · ' + st + '</div></div><div class="duymeler">' +
        (b.revoked ? '<button class="duyme kicik" type="button" data-berpa="' + b.id + '">Bərpa et</button>' :
          '<button class="duyme kicik" type="button" data-kart="' + b.id + '">Kart</button><button class="duyme kicik tehlike" type="button" data-legv="' + b.id + '">Ləğv</button>') +
        '</div></div>';
    }).join('') || '<p class="bos-qeyd">' + (biletler.length ? 'Axtarışa uyğun qonaq yoxdur.' : 'Hələ kart yaradılmayıb.') + '</p>';
  }
  el('dvAxtar').addEventListener('input', function () { axtaris = el('dvAxtar').value.trim(); qonaqlariCiz(); });

  el('dvQonaqlar').addEventListener('click', function (ev) {
    var b = ev.target.closest('button'); if (!b) return;
    var id = b.getAttribute('data-kart') || b.getAttribute('data-legv') || b.getAttribute('data-berpa');
    var bl = biletler.filter(function (x) { return x.id === id; })[0]; if (!bl) return;
    if (b.hasAttribute('data-kart')) { el('kartAcilan').open = true; kartGoster(bl).then(function () { el('kartNetice').scrollIntoView({ behavior: 'smooth', block: 'start' }); }); }
    if (b.hasAttribute('data-legv')) legvEt(bl, true);
    if (b.hasAttribute('data-berpa')) legvEt(bl, false);
  });

  function legvEt(bl, legv) {
    var m = el('tesdiq');
    el('tBasliq').textContent = legv ? 'Kart ləğv edilsin?' : 'Kart bərpa edilsin?';
    el('tMetn').textContent = '№ ' + HS.pad(bl.num) + ' · ' + bl.name + (legv ? ' — girişdə bu kart "ləğv olunub" kimi göstəriləcək.' : ' — kart yenidən etibarlı olacaq.');
    el('tBeli').textContent = legv ? 'Ləğv et' : 'Bərpa et'; m.hidden = false;
    el('tXeyr').onclick = function () { m.hidden = true; };
    el('tBeli').onclick = function () {
      m.hidden = true;
      db.from('tickets').update({ revoked: legv }).eq('id', bl.id).then(function (r) {
        if (r.error) return xeta(r.error);
        bildir(legv ? 'Kart ləğv olundu.' : 'Kart bərpa olundu.'); biletleriYukle();
      });
    };
  }

  /* ---------- Kart yarat ---------- */
  el('kartForm').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var ad = el('kAd').value.replace(/\s+/g, ' ').trim(), num = parseInt(el('kNum').value, 10);
    if (!el('kNum').value.trim()) num = biletler.reduce(function (m, b) { return Math.max(m, b.num); }, 0) + 1;
    el('kXeta').hidden = true;
    if (!ad) { el('kXeta').hidden = false; el('kXeta').textContent = 'Qonağın adını yazın.'; return; }
    if (!(num >= 1 && num <= 9999)) { el('kXeta').hidden = false; el('kXeta').textContent = 'Dəvət nömrəsini yazın.'; return; }
    if (biletler.some(function (b) { return b.num === num && !b.revoked; })) { el('kXeta').hidden = false; el('kXeta').textContent = '№ ' + HS.pad(num) + ' artıq istifadə olunub. Başqa nömrə yazın.'; return; }
    var cehd = 0;
    (function yarat() {
      var yeni = { event_id: cari.id, num: num, name: ad, code: HS.yeniKod(), secret: HS.yeniSirr(), created_by: (db.auth && el('hEmail').textContent) || null };
      db.from('tickets').insert(yeni).then(function (r) {
        if (r.error) { if (r.error.code === '23505' && cehd++ < 3) return yarat(); return xeta(r.error); }
        el('kAd').value = '';
        biletler.push(Object.assign({ id: 'yeni', revoked: false, checked_in_at: null }, yeni));
        kartGoster(yeni); biletleriYukle();
      });
    })();
  });

  function kartGoster(bl) {
    el('kartNetice').hidden = false; el('kartOnizle').removeAttribute('src');
    return HS.kartCiz(cari, bl, '../').then(function (c) {
      return new Promise(function (res) { c.toBlob(res, 'image/jpeg', 0.93); });
    }).then(function (blob) {
      var url = URL.createObjectURL(blob);
      var fad = 'HerSociety_Devet_' + bl.name.replace(/[^\p{L}\p{N}]+/gu, '_') + '.jpg';
      el('kartOnizle').src = url; el('kartYukle').href = url; el('kartYukle').download = fad;
      sonKart = new File([blob], fad, { type: 'image/jpeg' });
    }).catch(xeta);
  }
  el('kartPaylas').addEventListener('click', function () {
    if (!sonKart) return;
    var d = { files: [sonKart], title: 'HER Society · Dəvət' };
    if (navigator.canShare && navigator.canShare(d)) navigator.share(d).catch(function () {});
    else el('kartYukle').click();
  });

  /* ---------- Giriş linki ---------- */
  function girisVeziyyeti() {
    el('grVeziyyet').innerHTML = cari.door_active ? '<b>Giriş aktivdir.</b> İşçilər linki açıb kodu yazaraq QR oxuda bilər.' : 'Giriş hələ açılmayıb. Kod seçin və linki yaradın.';
    el('grSondur').hidden = !cari.door_active;
    el('grLinkQutu').hidden = !cari.door_active;
    el('grLink').textContent = GIRIS_LINK + cari.id;
    el('girisBasliq').textContent = cari.door_active ? 'Giriş linki · aktiv ✓' : 'Giriş linki (işçilər)';
  }
  el('grQoy').addEventListener('click', function () {
    var kod = el('grKod').value.trim();
    if (kod.length < 6 || !/[a-zəğıöşüç]/i.test(kod) || !/\d/.test(kod)) { bildir('Kod ən azı 6 simvol olmalı, içində həm hərf, həm rəqəm olsun.'); return; }
    db.rpc('giris_kodu_qoy', { ev: cari.id, kod: kod }).then(function (r) {
      if (r.error) return xeta(r.error);
      cari.door_active = true; girisVeziyyeti(); el('grKod').value = '';
      bildir('Giriş kodu qoyuldu. Linki işçilərə göndərin.');
      grSonKod = kod;
    });
  });
  var grSonKod = '';
  el('grSondur').addEventListener('click', function () {
    db.rpc('giris_sondur', { ev: cari.id }).then(function (r) {
      if (r.error) return xeta(r.error);
      cari.door_active = false; girisVeziyyeti(); bildir('Giriş söndürüldü. Link artıq işləmir.');
    });
  });
  el('grPaylas').addEventListener('click', function () {
    var link = GIRIS_LINK + cari.id;
    var metn = cari.title + ' · ' + tarix(cari) + ' — giriş səhifəsi' + (grSonKod ? ' (kod: ' + grSonKod + ')' : '');
    if (navigator.share) navigator.share({ title: 'HER Society · Giriş', text: metn, url: link }).catch(function () {});
    else if (navigator.clipboard) navigator.clipboard.writeText(link).then(function () { bildir('Link kopyalandı.'); });
  });

  /* ---------- Excel ---------- */
  el('dvExcel').addEventListener('click', function () {
    if (!window.XLSX) { bildir('Excel aləti yüklənmədi. Səhifəni yeniləyin.'); return; }
    var setirler = biletler.slice().sort(function (a, b) { return a.num - b.num; }).map(function (b) {
      var c = b.created_at ? HS.hisseler(b.created_at) : null;
      return {
        '№': b.num, 'Ad': b.name, 'Kod': b.code,
        'Status': b.revoked ? 'Ləğv olunub' : b.checked_in_at ? 'Gəlib' : 'Gəlməyib',
        'Gəlmə saatı': b.checked_in_at && !saatsiz(b) ? HS.hisseler(b.checked_in_at).saat : '',
        'Kart yaradılıb': c ? c.gun + ' ' + c.ay + ' ' + c.saat : '',
        'Yaradan': b.created_by || ''
      };
    });
    var ws = XLSX.utils.json_to_sheet(setirler);
    ws['!cols'] = [{ wch: 5 }, { wch: 28 }, { wch: 9 }, { wch: 13 }, { wch: 12 }, { wch: 18 }, { wch: 26 }];
    var wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Qonaqlar');
    var t = HS.hisseler(cari.starts_at);
    XLSX.writeFile(wb, 'HER-Society-qonaqlar-' + t.gun + '-' + t.ay + '-' + t.il + '.xlsx');
  });
})();
