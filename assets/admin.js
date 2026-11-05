// HER Society — admin panel
(function () {
  var HS = window.HS, db = HS.db, e = HS.esc;
  var el = function (id) { return document.getElementById(id); };
  var ALBOM_LINK = 'https://hersociety.az/albom';
  var ZIP_HISSE = 60;
  var EV_SAHELER = 'id,title,topic,guest_name,guest_title,starts_at,venue,venue_detail,card_note,map_url,album_open,published,door_active';

  var istifadeci = null, gorusler = [], sekiller = [], url = {}, secilen = new Set(), filtr = 'hamisi', redakte = null;

  /* ---------- Köməkçilər ---------- */
  var bTaymer;
  function bildir(m) {
    var b = el('bildiris'); b.textContent = m; b.hidden = false;
    clearTimeout(bTaymer); bTaymer = setTimeout(function () { b.hidden = true; }, 3500);
  }
  function tesdiq(basliq, metn, beli) {
    return new Promise(function (res) {
      el('tBasliq').textContent = basliq; el('tMetn').textContent = metn;
      el('tBeli').textContent = beli || 'Bəli';
      var m = el('tesdiq'); m.hidden = false;
      function bitir(v) { m.hidden = true; el('tBeli').onclick = el('tXeyr').onclick = null; res(v); }
      el('tBeli').onclick = function () { bitir(true); };
      el('tXeyr').onclick = function () { bitir(false); };
    });
  }
  function gozle(metn, i, n) {
    var m = el('gozle');
    if (metn === false) { m.hidden = true; return; }
    m.hidden = false; el('gzMetn').textContent = metn;
    el('gzBar').style.width = n ? Math.round(i / n * 100) + '%' : '0%';
    el('gzSay').textContent = n ? i + ' / ' + n : '';
  }
  function gorusAdi(g) {
    var t = HS.hisseler(g.starts_at);
    return t.gun + ' ' + t.ay + ' ' + t.il + ' · ' + g.title + (g.guest_name ? ' · ' + g.guest_name : '');
  }
  function xeta(err) { console.error(err); bildir('Xəta baş verdi. İnterneti yoxlayıb yenidən cəhd edin.'); }

  if (!db) { el('giris').hidden = false; el('gXeta').hidden = false; el('gXeta').textContent = 'Bağlantı qurulmayıb.'; return; }

  /* ---------- Giriş ---------- */
  function girisEkrani() { el('giris').hidden = false; el('girisForm').hidden = false; el('mfaForm').hidden = true; el('app').hidden = true; el('cixis').hidden = true; el('emeliyyat').hidden = true; }
  function yoxla(session) {
    if (!session) return girisEkrani();
    // İki addımlı yoxlama qurulubsa, əvvəlcə kodu soruş
    db.auth.mfa.getAuthenticatorAssuranceLevel().then(function (a) {
      var s = a.data || {};
      if (s.nextLevel === 'aal2' && s.currentLevel !== 'aal2') return mfaSorus();
      adminYoxla(session);
    });
  }
  function mfaSorus() {
    el('giris').hidden = false; el('girisForm').hidden = true; el('mfaForm').hidden = false; el('app').hidden = true;
    el('mfaKod').value = ''; el('mfaXeta').hidden = true; setTimeout(function () { el('mfaKod').focus(); }, 100);
  }
  el('mfaForm').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var kod = el('mfaKod').value.replace(/\D/g, '');
    if (kod.length !== 6) { el('mfaXeta').hidden = false; el('mfaXeta').textContent = '6 rəqəmli kodu yazın.'; return; }
    db.auth.mfa.listFactors().then(function (r) {
      var f = (r.data && r.data.totp || [])[0];
      if (!f) throw new Error('faktor yoxdur');
      return db.auth.mfa.challengeAndVerify({ factorId: f.id, code: kod });
    }).then(function (r) {
      if (r.error) { el('mfaXeta').hidden = false; el('mfaXeta').textContent = 'Kod düz deyil və ya vaxtı keçib. Tətbiqdəki yeni kodu yazın.'; el('mfaKod').value = ''; return; }
      el('mfaForm').hidden = true; el('girisForm').hidden = false;
      db.auth.getSession().then(function (s) { adminYoxla(s.data.session); });
    }).catch(function () { el('mfaXeta').hidden = false; el('mfaXeta').textContent = 'Xəta baş verdi. Yenidən cəhd edin.'; });
  });
  el('mfaLegv').addEventListener('click', function () { db.auth.signOut().then(function () { location.reload(); }); });

  function adminYoxla(session) {
    db.rpc('is_admin').then(function (r) {
      if (r.data !== true) {
        db.auth.signOut();
        girisEkrani(); el('gXeta').hidden = false; el('gXeta').textContent = 'Bu hesabın admin icazəsi yoxdur.';
        return;
      }
      istifadeci = session.user;
      el('giris').hidden = true; el('app').hidden = false; el('cixis').hidden = false;
      el('hEmail').textContent = istifadeci.email;
      basla();
    });
  }
  db.auth.getSession().then(function (r) { yoxla(r.data.session); });

  el('girisForm').addEventListener('submit', function (ev) {
    ev.preventDefault();
    el('gXeta').hidden = true;
    db.auth.signInWithPassword({ email: el('gEmail').value.trim().toLowerCase(), password: el('gSifre').value }).then(function (r) {
      if (r.error) { el('gXeta').hidden = false; el('gXeta').textContent = 'Email və ya şifrə yanlışdır.'; return; }
      yoxla(r.data.session);
    });
  });
  el('cixis').addEventListener('click', function () { db.auth.signOut().then(function () { location.reload(); }); });

  /* ---------- Tablar ---------- */
  function tab(ad) {
    document.querySelectorAll('[data-tab]').forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-tab') === ad ? 'true' : 'false'); });
    document.querySelectorAll('[data-tabpanel]').forEach(function (p) { p.hidden = p.getAttribute('data-tabpanel') !== ad; });
    if (ad === 'albom') albomYukle(); else { secilen.clear(); emeliyyatPaneli(); }
    if (ad === 'hesab') adminler();
    if (ad === 'devetler') dvSiyahi();
    try { sessionStorage.setItem('hs-tab', ad); } catch (x) {}
  }
  document.querySelectorAll('[data-tab]').forEach(function (b) { b.addEventListener('click', function () { tab(b.getAttribute('data-tab')); }); });

  function basla() {
    gorusleriYukle().then(function () {
      var t = 'gorusler'; try { t = sessionStorage.getItem('hs-tab') || 'gorusler'; } catch (x) {}
      menimHesab().then(function (m) { tab(m && m.must_change ? 'hesab' : t); });
    });
  }

  /* ---------- Görüşlər ---------- */
  function gorusleriYukle() {
    return db.from('events').select(EV_SAHELER).order('starts_at', { ascending: false }).then(function (r) {
      if (r.error) return xeta(r.error);
      gorusler = r.data || [];
      gorusCiz(); gorusSecimi();
    });
  }
  function gorusCiz() {
    var indi = Date.now() - 6 * 3600e3;
    var acig = {};
    document.querySelectorAll('#gorusSiyahi details[open]').forEach(function (d) { acig[d.getAttribute('data-id')] = true; });
    el('gorusSiyahi').innerHTML = gorusler.map(function (g) {
      var t = HS.hisseler(g.starts_at), gelecek = new Date(g.starts_at).getTime() >= indi;
      return '<details class="ev-acilan' + (gelecek ? '' : ' kecmis') + '" data-id="' + g.id + '"' + (acig[g.id] ? ' open' : '') + '>' +
        '<summary><span class="sol"><span class="tarix-et">' + t.gun + ' ' + t.ay + ' ' + t.il + (gelecek ? '' : ' · keçmiş') + '</span>' +
        '<b>' + e(g.guest_name || g.title) + '</b></span>' +
        (g.album_open ? '<span class="nisan yasil">Albom açıq</span>' : '') + (!g.published ? '<span class="nisan">Gizli</span>' : '') +
        '</summary><div class="ev-ic">' +
        '<p class="tarix-et">' + t.hefte + ' · ' + t.saat + '</p>' +
        '<h3>' + e(g.title) + (g.topic ? ' — <i>' + e(g.topic) + '</i>' : '') + '</h3>' +
        '<p>' + (g.guest_name ? 'Qonaq: ' + e(g.guest_name) + (g.guest_title ? ', ' + e(g.guest_title) : '') : 'Qonaq yazılmayıb') + '<br>' +
        e([g.venue, g.venue_detail].filter(Boolean).join(', ') || 'Məkan yazılmayıb') + '</p>' +
        '<div class="duymeler">' +
        '<button class="duyme kicik ' + (g.album_open ? '' : 'dolu') + '" type="button" data-albom="' + g.id + '">' + (g.album_open ? 'Albomu bağla' : 'Albomu aç') + '</button>' +
        '<button class="duyme kicik" type="button" data-redakte="' + g.id + '">Düzəlt</button>' +
        '<button class="duyme kicik" type="button" data-sekiller="' + g.id + '">Şəkillər</button>' +
        '<button class="duyme kicik tehlike" type="button" data-sil="' + g.id + '">Sil</button>' +
        '</div></div></details>';
    }).join('') || '<p class="bos-qeyd">Hələ görüş yoxdur.</p>';
  }

  el('gorusSiyahi').addEventListener('click', function (ev) {
    var b = ev.target.closest('button'); if (!b) return;
    var id = b.getAttribute('data-albom') || b.getAttribute('data-redakte') || b.getAttribute('data-sekiller') || b.getAttribute('data-sil');
    var g = gorusler.filter(function (x) { return x.id === id; })[0]; if (!g) return;
    if (b.hasAttribute('data-albom')) albomAcBagla(g);
    if (b.hasAttribute('data-redakte')) formAc(g);
    if (b.hasAttribute('data-sekiller')) { el('aGorus').value = g.id; tab('albom'); }
    if (b.hasAttribute('data-sil')) gorusSil(g);
  });

  function albomAcBagla(g) {
    var ac = !g.album_open;
    var mesaj = ac ? 'Qonaqlar hersociety.az/albom linki ilə bu görüşə şəkil yükləyə biləcək. Başqa açıq albom varsa, o bağlanacaq.' : 'Albom bağlananda qonaqlar daha şəkil yükləyə bilməyəcək. Yüklənmiş şəkillər qalır.';
    tesdiq(ac ? 'Albom açılsın?' : 'Albom bağlansın?', mesaj, ac ? 'Albomu aç' : 'Albomu bağla').then(function (ok) {
      if (!ok) return;
      var once = ac ? db.from('events').update({ album_open: false }).eq('album_open', true).neq('id', g.id) : Promise.resolve({});
      once.then(function (r) {
        if (r.error) throw r.error;
        return db.from('events').update({ album_open: ac }).eq('id', g.id);
      }).then(function (r) {
        if (r.error) throw r.error;
        bildir(ac ? 'Albom açıldı.' : 'Albom bağlandı.');
        gorusleriYukle();
      }).catch(xeta);
    });
  }

  function gorusSil(g) {
    db.from('photos').select('id', { count: 'exact', head: true }).eq('event_id', g.id).then(function (r) {
      if (r.count > 0) { bildir('Bu görüşün ' + r.count + ' şəkli var. Əvvəlcə Albom bölməsində şəkilləri silin.'); return; }
      tesdiq('Görüş silinsin?', gorusAdi(g) + ' saytdan və siyahıdan silinəcək. Bunu geri qaytarmaq olmur.', 'Sil').then(function (ok) {
        if (!ok) return;
        db.from('events').delete().eq('id', g.id).then(function (r2) {
          if (r2.error) return xeta(r2.error);
          bildir('Görüş silindi.'); gorusleriYukle();
        });
      });
    });
  }

  function formAc(g) {
    redakte = g || null;
    el('formBasliq').textContent = g ? 'Görüşü düzəlt' : 'Yeni görüş';
    var t = g ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Baku', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(g.starts_at)) : '';
    el('fTitle').value = g ? g.title : 'Çay Süfrəsi';
    el('fTopic').value = g ? (g.topic || '') : '';
    el('fGuest').value = g ? (g.guest_name || '') : '';
    el('fGuestTitle').value = g ? (g.guest_title || '') : '';
    el('fDate').value = t;
    el('fTime').value = g ? HS.hisseler(g.starts_at).saat : '13:00';
    el('fVenue').value = g ? (g.venue || '') : '';
    el('fVenueDetail').value = g ? (g.venue_detail || '') : '';
    el('fCardNote').value = g ? (g.card_note || '') : '';
    el('fMap').value = g ? (g.map_url || '') : '';
    mapSon = el('fMap').value; el('fMapQeyd').hidden = true;
    el('fPublished').checked = g ? g.published : true;
    el('fXeta').hidden = true;
    el('gorusForm').hidden = false;
    el('gorusForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  // Google Maps linkindən ad və ünvanı doldur
  var mapSon = '';
  function mapOxu() {
    var u = (el('fMap').value.match(/https:\/\/\S+/) || [''])[0];
    var q = el('fMapQeyd');
    if (!u || u === mapSon) return;
    mapSon = u; q.hidden = false; q.textContent = 'Ünvan axtarılır…';
    db.functions.invoke('xerite', { body: { url: u } }).then(function (r) {
      var d = r.data || {};
      if (r.error || d.error) { q.textContent = 'Ünvanı avtomatik tapa bilmədik. Link işləyəcək, ünvanı istəsəniz özünüz yazın.'; return; }
      if (d.ad && !el('fVenue').value.trim()) el('fVenue').value = d.ad;
      if (d.unvan) el('fVenueDetail').value = d.unvan;
      q.textContent = d.unvan ? 'Ünvan linkdən götürüldü. Lazım olsa düzəldin.' : 'Link qəbul olundu. Ünvan tapılmadı — istəsəniz özünüz yazın.';
    }).catch(function () { q.textContent = 'Ünvanı avtomatik tapa bilmədik. Link işləyəcək.'; });
  }
  el('fMap').addEventListener('change', mapOxu);
  el('fMap').addEventListener('paste', function () { setTimeout(mapOxu, 50); });
  el('yeniGorus').addEventListener('click', function () { formAc(null); });
  el('formLegv').addEventListener('click', function () { el('gorusForm').hidden = true; });
  el('gorusForm').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var d = el('fDate').value, s = el('fTime').value;
    if (!d || !s) { el('fXeta').hidden = false; el('fXeta').textContent = 'Tarix və saatı seçin.'; return; }
    var melumat = {
      title: el('fTitle').value.trim() || 'Çay Süfrəsi',
      topic: el('fTopic').value.trim() || null,
      guest_name: el('fGuest').value.trim() || null,
      guest_title: el('fGuestTitle').value.trim() || null,
      starts_at: d + 'T' + s + ':00+04:00',
      venue: el('fVenue').value.trim() || null,
      venue_detail: el('fVenueDetail').value.trim() || null,
      card_note: el('fCardNote').value.trim() || null,
      map_url: (function (u) { u = u.trim(); var m = u.match(/https:\/\/\S+/); return m ? m[0] : null; })(el('fMap').value),
      published: el('fPublished').checked
    };
    var sorgu = redakte ? db.from('events').update(melumat).eq('id', redakte.id) : db.from('events').insert(melumat);
    sorgu.then(function (r) {
      if (r.error) { el('fXeta').hidden = false; el('fXeta').textContent = 'Saxlanmadı. Yenidən cəhd edin.'; console.error(r.error); return; }
      el('gorusForm').hidden = true;
      bildir(redakte ? 'Dəyişikliklər saxlandı. Saytda artıq görünür.' : 'Yeni görüş əlavə olundu. Saytda artıq görünür.');
      gorusleriYukle();
    });
  });

  /* ---------- Albom ---------- */
  function gorusSecimi() {
    var sec = el('aGorus'), evvel = sec.value;
    sec.innerHTML = gorusler.map(function (g) { return '<option value="' + g.id + '">' + e(gorusAdi(g)) + (g.album_open ? ' (açıq)' : '') + '</option>'; }).join('');
    var acik = gorusler.filter(function (g) { return g.album_open; })[0];
    sec.value = evvel && gorusler.some(function (g) { return g.id === evvel; }) ? evvel : (acik ? acik.id : (gorusler[0] ? gorusler[0].id : ''));
  }
  el('aGorus').addEventListener('change', function () { secilen.clear(); albomYukle(); });

  function albomYukle() {
    var id = el('aGorus').value; if (!id) { el('aGrid').innerHTML = ''; el('aBos').hidden = false; return; }
    db.from('photos').select('*').eq('event_id', id).order('created_at', { ascending: false }).then(function (r) {
      if (r.error) return xeta(r.error);
      sekiller = r.data || [];
      var yollar = sekiller.map(function (s) { return s.thumb_path; }).filter(function (p) { return p && !url[p]; });
      var p = yollar.length ? db.storage.from('albom').createSignedUrls(yollar, 3600 * 6) : Promise.resolve({ data: [] });
      return p.then(function (r2) {
        (r2.data || []).forEach(function (x) { if (x.signedUrl) url[x.path] = x.signedUrl; });
        albomCiz();
      });
    }).catch(xeta);
    kohneXeberdarliq();
  }

  function kohneXeberdarliq() {
    var hedd = new Date(Date.now() - 30 * 864e5).toISOString();
    db.from('photos').select('id', { count: 'exact', head: true }).is('downloaded_at', null).eq('on_site', false).lt('created_at', hedd).then(function (r) {
      el('aXeberdarliq').innerHTML = r.count > 0 ? '<p class="xeberdarliq">' + r.count + ' şəkil 30 gündən çoxdur ki, endirilməyib. Yer dolmasın deyə onları endirib silin.</p>' : '';
    });
  }

  function gorunenler() {
    return sekiller.filter(function (s) {
      if (filtr === 'gizli') return !s.on_site;
      if (filtr === 'saytda') return s.on_site;
      if (filtr === 'endirilmeyib') return !s.downloaded_at;
      return true;
    });
  }

  function albomCiz() {
    var saytda = sekiller.filter(function (s) { return s.on_site; }).length;
    var endirilib = sekiller.filter(function (s) { return s.downloaded_at; }).length;
    var hecm = sekiller.reduce(function (a, s) { return a + (s.size_bytes || 0); }, 0);
    el('aSay').innerHTML = '<span><b>' + sekiller.length + '</b>şəkil</span><span><b>' + saytda + '</b>saytda</span><span><b>' + endirilib + '</b>endirilib</span>' + (hecm ? '<span><b>' + HS.mb(hecm) + '</b>yer</span>' : '');
    var silinecek = sekiller.filter(function (s) { return s.downloaded_at && !s.on_site; }).length;
    el('endirilenleriSil').textContent = 'Endirilənləri sil' + (silinecek ? ' (' + silinecek + ')' : '');
    el('endirilenleriSil').disabled = !silinecek;
    var list = gorunenler();
    el('aBos').hidden = list.length > 0;
    el('aBos').textContent = sekiller.length ? 'Bu süzgəcdə şəkil yoxdur.' : 'Bu görüş üçün hələ şəkil yoxdur.';
    el('aGrid').innerHTML = list.map(function (s) {
      var sec = secilen.has(s.id);
      return '<div style="position:relative"><button type="button" class="adm-sekil" data-sec="' + s.id + '" aria-pressed="' + sec + '" aria-label="Şəkil seç">' +
        '<img loading="lazy" src="' + (url[s.thumb_path] || '') + '" alt="">' +
        '<span class="isare" aria-hidden="true">' + (sec ? '✓' : '') + '</span>' +
        '<span class="etiketler">' + (s.on_site ? '<span>Saytda</span>' : '') + (s.downloaded_at ? '<span>↓</span>' : '') + (!s.consent ? '<span>İcazəsiz</span>' : '') + '</span>' +
        (s.uploader ? '<span class="yukleyen">' + e(s.uploader) + '</span>' : '') +
        '</button><button type="button" class="boyut-dg" data-boyut="' + s.id + '" aria-label="Şəkli böyüt">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 9V4h5M20 15v5h-5M15 4h5v5M9 20H4v-5"/></svg></button></div>';
    }).join('');
    emeliyyatPaneli();
  }

  document.querySelectorAll('[data-f]').forEach(function (b) {
    b.addEventListener('click', function () {
      filtr = b.getAttribute('data-f');
      document.querySelectorAll('[data-f]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      albomCiz();
    });
  });

  el('aGrid').addEventListener('click', function (ev) {
    var bo = ev.target.closest('[data-boyut]');
    if (bo) { onizle(bo.getAttribute('data-boyut')); return; }
    var b = ev.target.closest('[data-sec]'); if (!b) return;
    var id = b.getAttribute('data-sec');
    secilen.has(id) ? secilen.delete(id) : secilen.add(id);
    albomCiz();
  });
  el('hamisiniSec').addEventListener('click', function () {
    var list = gorunenler();
    var hamisi = list.every(function (s) { return secilen.has(s.id); });
    list.forEach(function (s) { hamisi ? secilen.delete(s.id) : secilen.add(s.id); });
    albomCiz();
  });
  el('eTemizle').addEventListener('click', function () { secilen.clear(); albomCiz(); });

  function emeliyyatPaneli() {
    var n = secilen.size;
    el('emeliyyat').hidden = n === 0;
    el('secSay').textContent = n + ' seçildi';
    el('hamisiniSec').textContent = (gorunenler().length && gorunenler().every(function (s) { return secilen.has(s.id); })) ? 'Seçimi təmizlə' : 'Hamısını seç';
  }
  function secilenler() { return sekiller.filter(function (s) { return secilen.has(s.id); }); }

  function onizle(id) {
    var s = sekiller.filter(function (x) { return x.id === id; })[0]; if (!s) return;
    el('onizleSekil').src = url[s.thumb_path] || '';
    el('onizleAd').textContent = (s.uploader ? 'Yükləyən: ' + s.uploader : 'Ad yazılmayıb') + ' · ' + HS.hisseler(s.created_at).saat + (s.consent ? ' · paylaşmağa icazə var' : ' · icazə yoxdur');
    el('onizle').hidden = false;
    db.storage.from('albom').createSignedUrl(s.path, 3600).then(function (r) { if (r.data) el('onizleSekil').src = r.data.signedUrl; });
  }
  el('onizleBagla').addEventListener('click', function () { el('onizle').hidden = true; });
  el('onizle').addEventListener('click', function (ev) { if (ev.target === el('onizle')) el('onizle').hidden = true; });

  function boyukFayl(s) {
    return db.storage.from('albom').download(s.path).then(function (r) { if (r.error) throw r.error; return r.data; });
  }

  // Ardıcıl işlə (telefon yaddaşı üçün)
  function ardicil(list, metn, is) {
    var i = 0, ugursuz = 0;
    gozle(metn, 0, list.length);
    return list.reduce(function (p, s) {
      return p.then(function () { return is(s); }).catch(function (x) { ugursuz++; console.error(x); })
        .then(function () { i++; gozle(metn, i, list.length); });
    }, Promise.resolve()).then(function () { gozle(false); return ugursuz; });
  }

  el('eSayt').addEventListener('click', function () {
    var ev = el('aGorus').value;
    var icazesiz = secilenler().filter(function (s) { return !s.on_site && !s.consent; }).length;
    var list = secilenler().filter(function (s) { return !s.on_site && s.consent; });
    if (!list.length) { bildir(icazesiz ? 'Bu şəkillərin paylaşılmasına icazə verilməyib.' : 'Seçilən şəkillər artıq saytdadır.'); return; }
    ardicil(list, 'Sayta əlavə olunur…', function (s) {
      var yol = ev + '/' + s.id + '.jpg';
      return boyukFayl(s).then(function (blob) { return HS.kicilt(blob, 1600, 0.82); })
        .then(function (kicik) { return db.storage.from('sayt').upload(yol, kicik, { contentType: 'image/jpeg', upsert: true }); })
        .then(function (r) { if (r.error) throw r.error; return db.from('photos').update({ on_site: true, site_path: yol }).eq('id', s.id); })
        .then(function (r) { if (r.error) throw r.error; });
    }).then(function (u) {
      bildir(u ? (list.length - u) + ' şəkil saytda, ' + u + ' alınmadı.' : list.length + ' şəkil artıq saytdadır.');
      secilen.clear(); albomYukle();
    });
  });

  el('eSaytdanCix').addEventListener('click', function () {
    var list = secilenler().filter(function (s) { return s.on_site; });
    if (!list.length) { bildir('Seçilən şəkillər saytda deyil.'); return; }
    var yollar = list.map(function (s) { return s.site_path; }).filter(Boolean);
    gozle('Saytdan çıxarılır…');
    db.storage.from('sayt').remove(yollar).then(function () {
      return db.from('photos').update({ on_site: false, site_path: null }).in('id', list.map(function (s) { return s.id; }));
    }).then(function (r) {
      gozle(false);
      if (r.error) return xeta(r.error);
      bildir(list.length + ' şəkil saytdan çıxarıldı.'); secilen.clear(); albomYukle();
    }).catch(function (x) { gozle(false); xeta(x); });
  });

  function sekilleriSil(list) {
    var albomYollar = [], saytYollar = [];
    list.forEach(function (s) { albomYollar.push(s.path); if (s.thumb_path) albomYollar.push(s.thumb_path); if (s.site_path) saytYollar.push(s.site_path); });
    gozle('Silinir…');
    var parca = [];
    for (var i = 0; i < albomYollar.length; i += 100) parca.push(albomYollar.slice(i, i + 100));
    return parca.reduce(function (p, c) { return p.then(function () { return db.storage.from('albom').remove(c); }); }, Promise.resolve())
      .then(function () { return saytYollar.length ? db.storage.from('sayt').remove(saytYollar) : null; })
      .then(function () { return db.from('photos').delete().in('id', list.map(function (s) { return s.id; })); })
      .then(function (r) { gozle(false); if (r && r.error) throw r.error; })
      .catch(function (x) { gozle(false); throw x; });
  }

  el('eSil').addEventListener('click', function () {
    var list = secilenler();
    var saytda = list.filter(function (s) { return s.on_site; }).length;
    var endirilmeyib = list.filter(function (s) { return !s.downloaded_at; }).length;
    var metn = list.length + ' şəkil həmişəlik silinəcək.' + (endirilmeyib ? ' Onlardan ' + endirilmeyib + ' hələ endirilməyib.' : '') + (saytda ? ' ' + saytda + ' şəkil saytdan da çıxacaq.' : '');
    tesdiq('Şəkillər silinsin?', metn, 'Sil').then(function (ok) {
      if (!ok) return;
      sekilleriSil(list).then(function () { bildir(list.length + ' şəkil silindi.'); secilen.clear(); albomYukle(); }).catch(xeta);
    });
  });

  el('endirilenleriSil').addEventListener('click', function () {
    var list = sekiller.filter(function (s) { return s.downloaded_at && !s.on_site; });
    if (!list.length) return;
    tesdiq('Endirilənlər silinsin?', list.length + ' endirilmiş şəkil anbardan silinəcək və yer boşalacaq. Saytda göstərilən şəkillər qalır.', 'Sil').then(function (ok) {
      if (!ok) return;
      sekilleriSil(list).then(function () { bildir(list.length + ' şəkil silindi, yer boşaldı.'); secilen.clear(); albomYukle(); }).catch(xeta);
    });
  });

  // ZIP kimi endir (çox şəkil olanda bir neçə hissə)
  el('eEndir').addEventListener('click', function () {
    if (!window.JSZip) { bildir('Endirmə aləti yüklənmədi. Səhifəni yeniləyin.'); return; }
    var list = secilenler(); if (!list.length) return;
    var g = gorusler.filter(function (x) { return x.id === el('aGorus').value; })[0];
    var t = g ? HS.hisseler(g.starts_at) : null;
    var ad = 'her-society' + (t ? '-' + t.gun + '-' + t.ay + '-' + t.il : '');
    var hisseler = [];
    for (var i = 0; i < list.length; i += ZIP_HISSE) hisseler.push(list.slice(i, i + ZIP_HISSE));
    var endirilen = [], umumi = list.length, bitdi = 0;
    hisseler.reduce(function (p, hisse, hi) {
      return p.then(function () {
        var zip = new JSZip();
        return hisse.reduce(function (p2, s, si) {
          return p2.then(function () {
            gozle('Hazırlanır…' + (hisseler.length > 1 ? ' (hissə ' + (hi + 1) + '/' + hisseler.length + ')' : ''), bitdi, umumi);
            return boyukFayl(s).then(function (blob) {
              var kim = (s.uploader || '').toLowerCase().replace(/[^a-z0-9əğıöşüç]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 30);
              zip.file(ad + '-' + String(hi * ZIP_HISSE + si + 1).padStart(3, '0') + (kim ? '-' + kim : '') + '.jpg', blob);
              endirilen.push(s.id);
            }).catch(function (x) { console.error(x); }).then(function () { bitdi++; });
          });
        }, Promise.resolve()).then(function () {
          gozle('ZIP yaradılır…', bitdi, umumi);
          return zip.generateAsync({ type: 'blob', compression: 'STORE' });
        }).then(function (zblob) {
          var a = document.createElement('a');
          a.href = URL.createObjectURL(zblob);
          a.download = ad + (hisseler.length > 1 ? '-hisse-' + (hi + 1) : '') + '.zip';
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 60000);
        });
      });
    }, Promise.resolve()).then(function () {
      gozle(false);
      if (!endirilen.length) { bildir('Şəkillər endirilmədi.'); return; }
      return db.from('photos').update({ downloaded_at: new Date().toISOString() }).in('id', endirilen).then(function () {
        bildir(endirilen.length + ' şəkil endirildi. Faylı yadda saxladıqdan sonra "Endirilənləri sil" ilə yer boşalda bilərsiniz.');
        secilen.clear(); albomYukle();
      });
    }).catch(function (x) { gozle(false); xeta(x); });
  });

  // Admin öz şəkillərini yükləyir
  el('adminFayl').addEventListener('change', function (ev) {
    var fayllar = [].slice.call(ev.target.files || []); ev.target.value = '';
    var gid = el('aGorus').value;
    if (!fayllar.length || !gid) return;
    ardicil(fayllar, 'Şəkillər yüklənir…', function (f) {
      var ad = HS.id() + '.jpg';
      return HS.kicilt(f, 480, 0.75).then(function (k) {
        return db.storage.from('albom').upload(gid + '/kicik/' + ad, k, { contentType: 'image/jpeg' });
      }).then(function (r) { if (r.error) throw r.error; return HS.kicilt(f, 3000, 0.88); })
        .then(function (b) { return db.storage.from('albom').upload(gid + '/' + ad, b, { contentType: 'image/jpeg' }); })
        .then(function (r) { if (r.error) throw r.error; return db.from('photos').update({ uploader: 'HER Society', consent: true, consent_at: new Date().toISOString() }).eq('path', gid + '/' + ad); });
    }).then(function (u) {
      bildir(u ? (fayllar.length - u) + ' şəkil yükləndi, ' + u + ' alınmadı.' : fayllar.length + ' şəkil yükləndi.');
      albomYukle();
    });
  });

  /* ---------- Hesab ---------- */
  var menim = { super: false, must_change: false };
  function menimHesab() {
    return db.from('admins').select('email,super,must_change').then(function (r) {
      var list = r.data || [], me = (istifadeci && istifadeci.email || '').toLowerCase();
      menim = list.filter(function (a) { return a.email === me; })[0] || menim;
      el('adminPanel').hidden = !menim.super;
      el('mecburiSifre').hidden = !menim.must_change;
      el('adminSiyahi').innerHTML = list.map(function (a) {
        return '<div class="qonaq-setir"><div><div class="ad">' + e(a.email) + '</div><div class="alt">' + (a.super ? 'baş admin' : 'admin') + (a.must_change ? ' · müvəqqəti şifrə ilə' : '') + '<span data-mfa="' + e(a.email) + '"></span></div></div>' +
          (a.email === me ? '' : '<button class="duyme kicik" type="button" data-sifirla="' + e(a.email) + '">Yeni şifrə</button>') + '</div>';
      }).join('');
      if (menim.super) db.rpc('admin_mfa_veziyyeti').then(function (m) {
        (Array.isArray(m.data) ? m.data : []).forEach(function (x) {
          var s = el('adminSiyahi').querySelector('[data-mfa="' + x.email + '"]');
          if (s) s.textContent = x.mfa ? ' · iki addımlı ✓' : ' · iki addımlı yox';
        });
      });
      return menim;
    });
  }
  function adminler() { menimHesab(); mfaVeziyyeti(); }

  /* ---------- İki addımlı yoxlama (Google Authenticator) ---------- */
  var mfaYeni = null;
  function mfaVeziyyeti() {
    el('mfaQurulus').hidden = true;
    db.auth.mfa.listFactors().then(function (r) {
      var aktiv = (r.data && r.data.totp || []).filter(function (f) { return f.status === 'verified'; })[0];
      el('mfaVeziyyet').innerHTML = aktiv ? '<b>Aktivdir ✓</b> Hər girişdə şifrədən sonra telefonunuzdakı 6 rəqəmli kod soruşulur.'
        : '<b>Aktiv deyil.</b> Yandırsanız, şifrəniz oğurlansa belə telefonunuz olmadan heç kim panelə girə bilməz. Tövsiyə edirik.';
      el('mfaQur').hidden = !!aktiv; el('mfaSondur').hidden = !aktiv;
      el('mfaSondur').dataset.id = aktiv ? aktiv.id : '';
    });
  }
  el('mfaQur').addEventListener('click', function () {
    el('mfaQur').disabled = true;
    db.auth.mfa.listFactors().then(function (r) {
      var kohne = (r.data && r.data.all || []).filter(function (f) { return f.status !== 'verified'; });
      return Promise.all(kohne.map(function (f) { return db.auth.mfa.unenroll({ factorId: f.id }); }));
    }).then(function () {
      return db.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'HER Society ' + Date.now(), issuer: 'HER Society' });
    }).then(function (r) {
      el('mfaQur').disabled = false;
      if (r.error) { bildir('Qurmaq alınmadı. Səhifəni yeniləyib yenidən cəhd edin.'); return; }
      mfaYeni = r.data;
      el('mfaLink').href = r.data.totp.uri;
      el('mfaSirr').textContent = r.data.totp.secret.replace(/(.{4})/g, '$1 ').trim();
      el('mfaQr').src = r.data.totp.qr_code;
      el('mfaQurulus').hidden = false; el('mfaQur').hidden = true; el('mfaYeniKod').value = ''; el('mfaQurXeta').hidden = true;
    });
  });
  el('mfaTesdiq').addEventListener('click', function () {
    var kod = el('mfaYeniKod').value.replace(/\D/g, '');
    if (!mfaYeni || kod.length !== 6) { el('mfaQurXeta').hidden = false; el('mfaQurXeta').textContent = 'Tətbiqdəki 6 rəqəmli kodu yazın.'; return; }
    db.auth.mfa.challengeAndVerify({ factorId: mfaYeni.id, code: kod }).then(function (r) {
      if (r.error) { el('mfaQurXeta').hidden = false; el('mfaQurXeta').textContent = 'Kod düz deyil. Tətbiqdəki yeni kodu yazın.'; return; }
      mfaYeni = null; bildir('İki addımlı yoxlama yandırıldı ✓'); mfaVeziyyeti(); menimHesab();
    });
  });
  el('mfaSondur').addEventListener('click', function () {
    tesdiq('İki addımlı yoxlama söndürülsün?', 'Bundan sonra panelə yalnız şifrə ilə girmək olacaq. Bu, hesabı daha az qorunan edir.', 'Söndür').then(function (ok) {
      if (!ok) return;
      db.auth.mfa.unenroll({ factorId: el('mfaSondur').dataset.id }).then(function (r) {
        if (r.error) return bildir('Söndürmək alınmadı.');
        bildir('İki addımlı yoxlama söndürüldü.'); mfaVeziyyeti(); menimHesab();
      });
    });
  });
  el('adminSiyahi').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-sifirla]'); if (!b) return;
    var kim = b.getAttribute('data-sifirla');
    tesdiq('Yeni şifrə yaradılsın?', kim + ' üçün müvəqqəti şifrə yaradılacaq. Köhnə şifrəsi dərhal işləməz olacaq.', 'Yarat').then(function (ok) {
      if (!ok) return;
      db.rpc('admin_sifre_sifirla', { hedef: kim }).then(function (r) {
        if (r.error || !r.data) return xeta(r.error);
        el('smKime').textContent = kim; el('smSifre').textContent = r.data; el('sifreModal').hidden = false;
        menimHesab();
      });
    });
  });
  el('smBagla').addEventListener('click', function () { el('sifreModal').hidden = true; el('smSifre').textContent = ''; });
  el('smPaylas').addEventListener('click', function () {
    var metn = 'HER Society admin panel: https://hersociety.az/admin\nEmail: ' + el('smKime').textContent + '\nMüvəqqəti şifrə: ' + el('smSifre').textContent + '\nGirəndən sonra Hesab bölməsində öz şifrənizi qoyun.';
    if (navigator.share) navigator.share({ text: metn }).catch(function () {});
    else if (navigator.clipboard) navigator.clipboard.writeText(metn).then(function () { bildir('Kopyalandı.'); });
  });
  function sifreYoxla(a, b) {
    if (a !== b) return 'Şifrələr eyni deyil.';
    if (a.length < 10) return 'Şifrə ən azı 10 simvol olmalıdır.';
    if (!/[A-Za-zƏəĞğİıÖöŞşÜüÇç]/.test(a) || !/\d/.test(a)) return 'Şifrədə həm hərf, həm rəqəm olmalıdır.';
    return '';
  }
  el('hamisindanCix').addEventListener('click', function () {
    tesdiq('Bütün cihazlardan çıxılsın?', 'Bu hesabla açıq olan bütün telefon və kompüterlərdə panel bağlanacaq. Yenidən daxil olmaq üçün şifrə lazım olacaq.', 'Çıx').then(function (ok) {
      if (!ok) return;
      db.auth.signOut({ scope: 'global' }).then(function () { location.reload(); });
    });
  });
  el('sifreForm').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var a = el('hSifre').value, b = el('hSifre2').value;
    el('hXeta').hidden = true;
    var sx = sifreYoxla(a, b); if (sx) { el('hXeta').hidden = false; el('hXeta').textContent = sx; return; }
    db.auth.updateUser({ password: a }).then(function (r) {
      if (r.error) { el('hXeta').hidden = false; el('hXeta').textContent = 'Şifrə dəyişmədi. Yenidən cəhd edin.'; return; }
      el('hSifre').value = el('hSifre2').value = '';
      db.rpc('sifre_deyisdi').then(function () { el('mecburiSifre').hidden = true; });
      bildir('Yeni şifrə yadda saxlandı.');
    });
  });
})();
