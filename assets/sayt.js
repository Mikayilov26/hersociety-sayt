// HER Society — sayt: görüşlər, saytdakı şəkillər, ortaq albom
(function () {
  var HS = window.HS, db = HS.db;
  var el = function (id) { return document.getElementById(id); };

  // Bağlantı olmasa göstəriləcək ehtiyat məlumat
  var EHTIYAT = [
    { id: 'e2', title: 'Çay Süfrəsi', topic: 'Bir qadının bir neçə rolu', guest_name: 'Dilarə Əliyeva', guest_title: 'Azərbaycanın Əməkdar artisti', starts_at: '2026-11-21T13:00:00+04:00', venue: 'Latitude & Longitude', venue_detail: 'Bar Lounge · The Merchant Baku', album_open: false },
    { id: 'e1', title: 'Çay Süfrəsi', topic: null, guest_name: "Sabina xanım (Papillon's)", guest_title: 'süfrə təqdimatı', starts_at: '2026-10-23T13:00:00+04:00', venue: 'Luciano restoranı, Bakı', album_open: false }
  ];

  var gorusler = [], sekiller = [], acikGorus = null;

  /* ---------- Naviqasiya ---------- */
  var gorunusler = ['ana', 'gorusler', 'haqqimizda', 'albom'];
  var menyu = el('menyu'), menyuAc = el('menyuAc');
  function goster() {
    var h = (location.hash || '#ana').slice(1);
    if (h === 'rey') h = 'albom';
    if (gorunusler.indexOf(h) < 0) h = 'ana';
    document.querySelectorAll('[data-view]').forEach(function (v) { v.hidden = v.getAttribute('data-view') !== h; });
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      if (a.getAttribute('data-nav') === h) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    document.title = { ana: 'HER Society — Bakıda qadınlar üçün icma · Çay Süfrəsi görüşləri', gorusler: 'Görüşlər · HER Society', haqqimizda: 'Haqqımızda · HER Society', albom: 'Ortaq albom · HER Society' }[h];
    menyu.classList.remove('acik'); menyuAc.setAttribute('aria-expanded', 'false');
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', goster);
  goster();
  menyuAc.addEventListener('click', function () {
    var a = menyu.classList.toggle('acik'); menyuAc.setAttribute('aria-expanded', a ? 'true' : 'false');
  });

  /* ---------- Görüşlər ---------- */
  function novbetiVePecmis() {
    var indi = Date.now() - 6 * 3600e3; // görüş günü bitənə qədər "növbəti" sayılır
    var gelecek = gorusler.filter(function (g) { return new Date(g.starts_at).getTime() >= indi; })
      .sort(function (a, b) { return new Date(a.starts_at) - new Date(b.starts_at); });
    var kecmis = gorusler.filter(function (g) { return new Date(g.starts_at).getTime() < indi; })
      .sort(function (a, b) { return new Date(b.starts_at) - new Date(a.starts_at); });
    return { gelecek: gelecek, kecmis: kecmis };
  }

  var geriSayimTaymer;
  // Google üçün növbəti görüşün strukturlaşdırılmış təsviri (səhifədə görünmür)
  function sxemTedbir(g) {
    var kohne = document.getElementById('sxemTedbir'); if (kohne) kohne.remove();
    if (!g || !g.canli) return;
    var d = {
      '@context': 'https://schema.org', '@type': 'Event',
      name: g.title + (g.topic ? ': ' + g.topic : ''),
      description: 'HER Society görüşü — yalnız qadınlar üçün.' + (g.guest_name ? ' Qonaq: ' + g.guest_name + (g.guest_title ? ', ' + g.guest_title : '') + '.' : '') + ' Yerlər məhduddur.',
      startDate: g.time_tbd ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Baku' }).format(new Date(g.starts_at)) : g.starts_at,
      eventStatus: 'https://schema.org/EventScheduled', eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: { '@type': 'Place', name: g.venue || 'Bakı', address: { '@type': 'PostalAddress', streetAddress: g.venue_detail || '', addressLocality: 'Bakı', addressCountry: 'AZ' } },
      organizer: { '@type': 'Organization', name: 'HER Society', url: 'https://hersociety.az/' },
      image: 'https://hersociety.az/assets/og.png', inLanguage: 'az', url: 'https://hersociety.az/#gorusler'
    };
    if (g.guest_name) d.performer = { '@type': 'Person', name: g.guest_name };
    var s = document.createElement('script'); s.type = 'application/ld+json'; s.id = 'sxemTedbir'; s.textContent = JSON.stringify(d);
    document.head.appendChild(s);
  }
  function novbetiKart(g) {
    var k = el('novbetiKart');
    if (!g) {
      k.innerHTML = '<div class="devet"><div class="devet-ic"><p class="etiket" lang="en">HER Society</p>' +
        '<h3>Növbəti görüş tezliklə</h3><p class="qeyd-italik">Yeni görüşü ilk siz eşitmək üçün Instagram səhifəmizi izləyin.</p>' +
        '<a class="duyme dolu" href="https://instagram.com/hersociety.az" target="_blank" rel="noopener">@hersociety.az</a></div></div>';
      return;
    }
    var t = HS.hisseler(g.starts_at), e = HS.esc;
    k.innerHTML = '<div class="devet"><div class="devet-ic">' +
      '<p class="etiket" lang="en">HER Society presents</p>' +
      '<h3>' + e(g.title) + '</h3>' +
      (g.topic ? '<p class="movzu">' + e(g.topic) + '</p>' : '') +
      (g.guest_name ? '<div class="ayirici" aria-hidden="true"><i></i>✦<i></i></div><p class="etiket">Qonağımız</p><p class="qonaq-ad">' + e(g.guest_name) + '</p>' +
        (g.guest_title ? '<p class="qeyd-italik">' + e(g.guest_title) + '</p>' : '') : '') +
      '<div class="melumat">' +
      '<div><span class="etiket">Tarix</span><span>' + t.gun + ' ' + t.ay + ', ' + t.hefte + '</span></div>' +
      '<div><span class="etiket">Saat</span><span>' + (g.time_tbd ? HS.SAAT_YOX : t.saat) + '</span></div>' +
      '<div><span class="etiket">Məkan</span><span>' + e(mekan(g)) + '</span></div>' +
      '</div>' +
      '<div class="geri-sayim" id="geriSayim" aria-label="Görüşə qalan vaxt">' +
      '<div><strong data-g="gun">–</strong><small>gün</small></div><div><strong data-g="saat">–</strong><small>saat</small></div><div><strong data-g="deq">–</strong><small>dəq</small></div></div>' +
      '<p class="qeyd-italik" style="margin-top:18px"><span class="setir">Yerlər məhduddur.</span><span class="setir">Yerinizi ayırmaq üçün bizə yazın.</span></p>' +
      '<a class="duyme dolu" href="https://ig.me/m/hersociety.az" target="_blank" rel="noopener">Bizə yazın</a>' +
      '</div></div>';
    clearInterval(geriSayimTaymer);
    if (g.time_tbd) { var gs = el('geriSayim'); if (gs) gs.remove(); return; }
    var hedef = new Date(g.starts_at).getTime();
    function say() {
      var kutu = el('geriSayim'); if (!kutu) return;
      var q = hedef - Date.now();
      if (q <= 0) { kutu.innerHTML = '<p class="qeyd-italik">Görüş bu gündür. Sizi aramızda görməyə şad olarıq.</p>'; clearInterval(geriSayimTaymer); return; }
      kutu.querySelector('[data-g="gun"]').textContent = Math.floor(q / 864e5);
      kutu.querySelector('[data-g="saat"]').textContent = Math.floor(q % 864e5 / 36e5);
      kutu.querySelector('[data-g="deq"]').textContent = Math.floor(q % 36e5 / 6e4);
    }
    say(); geriSayimTaymer = setInterval(say, 30000);
  }

  function mekan(g) { return [g.venue, g.venue_detail].filter(Boolean).join(', '); }

  function mevqe(s) {
    if (s.focus_x == null && s.focus_y == null) return '';
    var x = s.focus_x == null ? 50 : s.focus_x, y = s.focus_y == null ? 50 : s.focus_y;
    return ' style="object-position:' + (+x).toFixed(1) + '% ' + (+y).toFixed(1) + '%"';
  }
  function qalereyaHtml(list) {
    return list.map(function (s) {
      return '<button type="button" data-lb="' + s.id + '" aria-label="Şəkli böyüt"><img loading="lazy" src="' + HS.saytUrl(s.site_path) + '" alt=""' + mevqe(s) + '></button>';
    }).join('');
  }

  function gorusSiyahi() {
    var nv = novbetiVePecmis(), e = HS.esc, html = '';
    nv.gelecek.forEach(function (g, i) {
      var t = HS.hisseler(g.starts_at);
      html += '<article class="gorus"><p class="tarix">' + t.gun + ' ' + t.ay + '<small>' + t.hefte + (g.time_tbd ? '' : ' · ' + t.saat) + '</small></p><div>' +
        '<h3>' + e(g.title) + '</h3>' + (g.topic ? '<p style="font-style:italic;font-size:22px">' + e(g.topic) + '</p>' : '') +
        '<p style="margin-top:8px">' + (g.guest_name ? 'Qonaq: ' + e(g.guest_name) + (g.guest_title ? ', ' + e(g.guest_title) : '') + '. ' : '') + e(mekan(g)) + '</p>' +
        '<a class="duyme krem" style="margin-top:20px" href="https://ig.me/m/hersociety.az" target="_blank" rel="noopener">Yerinizi ayırın</a></div>' +
        '<span class="status yaxin">' + (i === 0 ? 'Növbəti' : 'Tezliklə') + '</span></article>';
    });
    nv.kecmis.forEach(function (g) {
      var t = HS.hisseler(g.starts_at);
      var s = sekiller.filter(function (x) { return x.event_id === g.id; });
      html += '<article class="gorus"><p class="tarix">' + t.gun + ' ' + t.ay + '<small>' + t.il + '</small></p><div>' +
        '<h3>' + e(g.title) + '</h3>' + (g.topic ? '<p style="font-style:italic;font-size:22px">' + e(g.topic) + '</p>' : '') +
        '<p style="margin-top:4px">' + (g.guest_name ? 'Qonaq: ' + e(g.guest_name) + (g.guest_title ? ', ' + e(g.guest_title) : '') + '. ' : '') + e(mekan(g)) + '</p>' +
        (s.length ? '<div class="qalereya">' + qalereyaHtml(s) + '</div>' : '') +
        '</div><span class="status">Keçirildi</span></article>';
    });
    el('gorusSiyahi').innerHTML = html || '<p class="bos-qeyd">Görüşlər tezliklə burada olacaq.</p>';
  }

  function qalereyalar() {
    var var_ = sekiller.length > 0;
    el('anaQalereyaBolme').hidden = !var_;
    el('anaAlbomBolme').hidden = var_;
    el('albomQalereyaBolme').hidden = !var_;
    el('anaQalereya').innerHTML = qalereyaHtml(sekiller.slice(0, 8));
    el('albomQalereya').innerHTML = qalereyaHtml(sekiller);
  }

  function albomVeziyyeti() {
    acikGorus = gorusler.filter(function (g) { return g.album_open; })[0] || null;
    el('albomBagli').hidden = !!acikGorus;
    el('albomAcik').hidden = !acikGorus;
    if (acikGorus) {
      var t = HS.hisseler(acikGorus.starts_at);
      el('albomEtiket').textContent = acikGorus.title + ' · ' + t.gun + ' ' + t.ay;
    } else {
      el('albomEtiket').textContent = 'Ortaq albom';
    }
  }

  function hamisi() {
    novbetiKart(novbetiVePecmis().gelecek[0]);
    sxemTedbir(novbetiVePecmis().gelecek[0]);
    gorusSiyahi(); qalereyalar(); albomVeziyyeti(); reyVeziyyeti();
  }

  function yukle() {
    if (!db) { gorusler = EHTIYAT; hamisi(); return; }
    Promise.all([
      db.from('events').select('id,title,topic,guest_name,guest_title,starts_at,time_tbd,venue,venue_detail,album_open').eq('published', true).is('deleted_at', null),
      db.from('photos').select('id,event_id,site_path,created_at,focus_x,focus_y').eq('on_site', true).not('site_path', 'is', null).order('created_at', { ascending: false })
    ]).then(function (r) {
      if (r[0].error) throw r[0].error;
      gorusler = r[0].data || [];
      gorusler.forEach(function (g) { g.canli = true; });
      sekiller = (r[1].data || []);
      try { localStorage.setItem('hs-gorusler', JSON.stringify(gorusler)); } catch (e) {}
      hamisi();
    }).catch(function () {
      var yaddas = null;
      try { yaddas = JSON.parse(localStorage.getItem('hs-gorusler')); } catch (e) {}
      gorusler = (yaddas && yaddas.length) ? yaddas : EHTIYAT;
      gorusler.forEach(function (g) { g.album_open = false; });
      hamisi();
    });
  }
  gorusler = EHTIYAT; hamisi(); // dərhal göstər, sonra yenilə
  yukle();

  /* ---------- Lightbox ---------- */
  var lb = el('lightbox'), lbList = [], lbI = 0;
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-lb]'); if (!b) return;
    var kap = b.parentElement;
    lbList = [].map.call(kap.querySelectorAll('[data-lb] img'), function (i) { return i.src; });
    lbI = [].indexOf.call(kap.querySelectorAll('[data-lb]'), b);
    lbAc();
  });
  function lbAc() { el('lbSekil').src = lbList[lbI]; lb.hidden = false; el('lbBagla').focus(); }
  function lbBagla() { lb.hidden = true; }
  el('lbBagla').addEventListener('click', lbBagla);
  el('lbEvvel').addEventListener('click', function () { lbI = (lbI - 1 + lbList.length) % lbList.length; lbAc(); });
  el('lbSonra').addEventListener('click', function () { lbI = (lbI + 1) % lbList.length; lbAc(); });
  lb.addEventListener('click', function (ev) { if (ev.target === lb) lbBagla(); });
  document.addEventListener('keydown', function (ev) {
    if (lb.hidden) return;
    if (ev.key === 'Escape') lbBagla();
    if (ev.key === 'ArrowLeft') el('lbEvvel').click();
    if (ev.key === 'ArrowRight') el('lbSonra').click();
  });

  /* ---------- Ortaq albom: yükləmə ---------- */
  var secilen = [], ugursuz = [];
  function addim(ad) {
    ['addimSec', 'addimBax', 'addimYukle', 'addimSon'].forEach(function (i) { el(i).hidden = i !== ad; });
    if (ad === 'addimYukle' || ad === 'addimSon') {
      var k = document.querySelector('[data-view=albom] .albom-kart');
      window.scrollTo(0, Math.max(0, k.getBoundingClientRect().top + window.scrollY - 84));
    }
  }
  function ciz() {
    var kap = el('sekiller'); kap.innerHTML = '';
    secilen.forEach(function (s, i) {
      var d = document.createElement('div'); d.className = 'sekil';
      var im = document.createElement('img'); im.src = s.onizleme; im.alt = 'Seçilmiş şəkil ' + (i + 1); d.appendChild(im);
      var x = document.createElement('button'); x.type = 'button'; x.className = 'sil'; x.setAttribute('aria-label', 'Şəkil ' + (i + 1) + ' çıxarılsın');
      x.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
      x.addEventListener('click', function () { URL.revokeObjectURL(s.onizleme); secilen.splice(i, 1); secilen.length ? ciz() : addim('addimSec'); });
      d.appendChild(x); kap.appendChild(d);
    });
    el('sayYazi').textContent = secilen.length + ' şəkil seçildi';
  }
  function elaveEt(ev) {
    var f = [].slice.call(ev.target.files || []).filter(function (x) { return /^image\//.test(x.type) || /\.(heic|heif|jpe?g|png|webp)$/i.test(x.name); });
    ev.target.value = '';
    if (!f.length) return;
    f.slice(0, 60).forEach(function (x) { secilen.push({ fayl: x, onizleme: URL.createObjectURL(x) }); });
    addim('addimBax'); ciz();
  }
  el('fayl').addEventListener('change', elaveEt);
  el('faylElave').addEventListener('change', elaveEt);

  function birini(s) {
    var ad = HS.id() + '.jpg', ev = acikGorus.id;
    return HS.orijinal(s.fayl).then(function (boyuk) {
      return HS.kicilt(s.fayl, 480, 0.75).then(function (kicik) {
        return db.storage.from('albom').upload(ev + '/kicik/' + ad, kicik, { contentType: 'image/jpeg', upsert: false })
          .then(function (r) { if (r.error) throw r.error; })
          .then(function () { return db.storage.from('albom').upload(ev + '/' + ad, boyuk, { contentType: 'image/jpeg', upsert: false }); })
          .then(function (r) { if (r.error) throw r.error; })
          .then(function () { return db.rpc('albom_qeyd', { yol: ev + '/' + ad, ad: el('yukleyenAd').value.trim(), razilik: true }); })
          .then(function (r) { if (r && r.error) console.warn(r.error); });
      });
    });
  }

  function gonder(list) {
    if (!db || !acikGorus) { el('sonBasliq').textContent = 'Albom bağlıdır'; el('sonYazi').textContent = 'Albom hazırda şəkil qəbul etmir. Təşkilatçılara yaza bilərsiniz.'; addim('addimSon'); return; }
    var n = list.length, bitdi = 0, ugurlu = 0; ugursuz = [];
    addim('addimYukle'); el('bar').style.width = '0%'; el('yukleSay').textContent = '0 / ' + n;
    var novbe = list.slice(), isleyen = 0;
    return new Promise(function (son) {
      function sonraki() {
        if (!novbe.length && isleyen === 0) return son();
        while (isleyen < 2 && novbe.length) {
          var s = novbe.shift(); isleyen++;
          birini(s).then(function () { ugurlu++; }, (function (x) { return function () { ugursuz.push(x); }; })(s))
            .then(function () {
              isleyen--; bitdi++;
              el('bar').style.width = Math.round(bitdi / n * 100) + '%';
              el('yukleSay').textContent = bitdi + ' / ' + n;
              sonraki();
            });
        }
      }
      sonraki();
    }).then(function () {
      if (ugursuz.length === 0) {
        el('sonBasliq').textContent = 'Təşəkkür edirik!';
        el('sonYazi').textContent = ugurlu + ' şəkil albomumuza əlavə olundu. Ən gözəl anları Instagram səhifəmizdə paylaşacağıq.';
        el('tekrar').hidden = true;
        secilen.forEach(function (s) { URL.revokeObjectURL(s.onizleme); }); secilen = [];
      } else {
        el('sonBasliq').textContent = ugurlu ? 'Demək olar ki, hazırdır' : 'Şəkillər göndərilmədi';
        el('sonYazi').textContent = (ugurlu ? ugurlu + ' şəkil əlavə olundu. ' : '') + ugursuz.length + ' şəkil göndərilmədi. İnternet bağlantısını yoxlayıb yenidən cəhd edin.';
        el('tekrar').hidden = false;
      }
      addim('addimSon');
    });
  }
  // Ad yadda qalsın (növbəti dəfə yazmamaq üçün)
  try { el('yukleyenAd').value = localStorage.getItem('hs-ad') || ''; } catch (x) {}
  el('razilik').addEventListener('change', function () { if (el('razilik').checked) el('razilikXeta').hidden = true; });
  el('gonder').addEventListener('click', function () {
    if (!el('razilik').checked) { el('razilikXeta').hidden = false; el('razilik').focus(); return; }
    try { localStorage.setItem('hs-ad', el('yukleyenAd').value.trim()); } catch (x) {}
    gonder(secilen);
  });
  el('tekrar').addEventListener('click', function () { gonder(ugursuz.slice()); });
  el('yeniden').addEventListener('click', function () { secilen = []; ugursuz = []; addim('addimSec'); });

  /* ---------- Rəy forması ---------- */
  var reyGorus = null, reyQiymet = null;
  var URK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z"/></svg>';
  var URK_DOLU = URK.replace('fill="none"', 'fill="currentColor"');
  function reyHedef() {
    if (acikGorus && acikGorus.canli) return acikGorus;
    var indi = Date.now();
    return gorusler.filter(function (g) {
      var t = new Date(g.starts_at).getTime();
      return g.canli && t <= indi + 12 * 3600e3 && t >= indi - 30 * 864e5;
    }).sort(function (a, b) { return new Date(b.starts_at) - new Date(a.starts_at); })[0] || null;
  }
  function reyVeziyyeti() {
    reyGorus = reyHedef();
    var kutu = el('rey');
    var qr = 0; try { qr = +localStorage.getItem('hs-qr') || 0; } catch (x) {}
    if (!reyGorus || Date.now() - qr > 30 * 864e5) { kutu.hidden = true; return; }
    kutu.hidden = false;
    var t = HS.hisseler(reyGorus.starts_at);
    el('reyBasliq').textContent = reyGorus.title + ' · ' + t.gun + ' ' + t.ay;
    var gonderilib = false;
    try { gonderilib = localStorage.getItem('hs-rey-' + reyGorus.id) === '1'; } catch (x) {}
    if (gonderilib) { el('reySual').hidden = true; el('reyForm').hidden = true; el('reySon').hidden = false; }
    else if (el('reyForm').hidden) { el('reySual').hidden = false; el('reySon').hidden = true; }
  }
  function urekCiz() {
    var html = '';
    for (var i = 1; i <= 5; i++) {
      var dolu = reyQiymet !== null && i <= reyQiymet;
      html += '<button type="button" data-q="' + i + '" aria-pressed="' + (reyQiymet === i) + '" aria-label="' + i + ' / 5"' +
        (dolu ? ' style="color:var(--qirmizi)"' : '') + '>' + (dolu ? URK_DOLU : URK) + '</button>';
    }
    el('urekler').innerHTML = html;
  }
  function reyAc() {
    el('reySual').hidden = true; el('reyForm').hidden = false; el('reySon').hidden = true;
    try { if (!el('reyAd').value) el('reyAd').value = localStorage.getItem('hs-ad') || ''; } catch (x) {}
    urekCiz();
  }
  el('reyAc').addEventListener('click', reyAc);
  el('urekler').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-q]'); if (!b) return;
    var q = +b.getAttribute('data-q'); reyQiymet = reyQiymet === q ? null : q; urekCiz();
    el('reyXeta').hidden = true;
  });
  el('reyForm').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var xos = el('reyXos').value.trim(), arzu = el('reyArzu').value.trim(), ad = el('reyAd').value.trim();
    if (reyQiymet === null && !xos && !arzu) { el('reyXeta').hidden = false; el('reyXeta').textContent = 'Ən azı bir suala cavab verin.'; return; }
    if (!db || !reyGorus) { el('reyXeta').hidden = false; el('reyXeta').textContent = 'Hazırda göndərmək mümkün olmadı. Bir az sonra yenidən cəhd edin.'; return; }
    var d = el('reyGonder'); d.disabled = true; d.textContent = 'Göndərilir…';
    db.rpc('rey_gonder', { ev: reyGorus.id, qiymet: reyQiymet, xos: xos, arzu: arzu, ad: ad }).then(function (r) {
      d.disabled = false; d.textContent = 'Göndər';
      if (r.error) { el('reyXeta').hidden = false; el('reyXeta').textContent = 'Göndərilmədi. İnterneti yoxlayıb yenidən cəhd edin.'; return; }
      try { localStorage.setItem('hs-rey-' + reyGorus.id, '1'); if (ad) localStorage.setItem('hs-ad', ad); } catch (x) {}
      el('reyForm').hidden = true; el('reySon').hidden = false;
      el('reyXos').value = el('reyArzu').value = ''; reyQiymet = null;
    });
  });
})();
