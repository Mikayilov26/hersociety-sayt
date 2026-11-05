// HER Society — sayt: görüşlər, saytdakı şəkillər, ortaq albom
(function () {
  var HS = window.HS, db = HS.db;
  var el = function (id) { return document.getElementById(id); };

  // Bağlantı olmasa göstəriləcək ehtiyat məlumat
  var EHTIYAT = [
    { id: 'e2', title: 'Çay Süfrəsi', topic: 'Bir qadının bir neçə rolu', guest_name: 'Dilarə Əliyeva', guest_title: 'Azərbaycanın Əməkdar artisti', starts_at: '2026-11-21T13:00:00+04:00', venue: 'Latitude & Longitude Bar Lounge, The Merchant Baku', album_open: false },
    { id: 'e1', title: 'Çay Süfrəsi', topic: null, guest_name: "Sabina xanım (Papillon's)", guest_title: 'süfrə təqdimatı', starts_at: '2026-10-23T13:00:00+04:00', venue: 'Luciano restoranı, Bakı', album_open: false }
  ];

  var gorusler = [], sekiller = [], acikGorus = null;

  /* ---------- Naviqasiya ---------- */
  var gorunusler = ['ana', 'gorusler', 'haqqimizda', 'albom'];
  var menyu = el('menyu'), menyuAc = el('menyuAc');
  function goster() {
    var h = (location.hash || '#ana').slice(1);
    if (gorunusler.indexOf(h) < 0) h = 'ana';
    document.querySelectorAll('[data-view]').forEach(function (v) { v.hidden = v.getAttribute('data-view') !== h; });
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      if (a.getAttribute('data-nav') === h) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    document.title = { ana: 'HER Society', gorusler: 'Görüşlər · HER Society', haqqimizda: 'Haqqımızda · HER Society', albom: 'Ortaq albom · HER Society' }[h];
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
      '<div><span class="etiket">Saat</span><span>' + t.saat + '</span></div>' +
      '<div><span class="etiket">Məkan</span><span>' + e(g.venue || '') + '</span></div>' +
      '</div>' +
      '<div class="geri-sayim" id="geriSayim" aria-label="Görüşə qalan vaxt">' +
      '<div><strong data-g="gun">–</strong><small>gün</small></div><div><strong data-g="saat">–</strong><small>saat</small></div><div><strong data-g="deq">–</strong><small>dəq</small></div></div>' +
      '<p class="qeyd-italik" style="margin-top:18px"><span class="setir">Yerlər məhduddur.</span><span class="setir">Yerinizi ayırmaq üçün bizə yazın.</span></p>' +
      '<a class="duyme dolu" href="https://ig.me/m/hersociety.az" target="_blank" rel="noopener">Bizə yazın</a>' +
      '</div></div>';
    var hedef = new Date(g.starts_at).getTime();
    clearInterval(geriSayimTaymer);
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

  function qalereyaHtml(list) {
    return list.map(function (s) {
      return '<button type="button" data-lb="' + s.id + '" aria-label="Şəkli böyüt"><img loading="lazy" src="' + HS.saytUrl(s.site_path) + '" alt=""></button>';
    }).join('');
  }

  function gorusSiyahi() {
    var nv = novbetiVePecmis(), e = HS.esc, html = '';
    nv.gelecek.forEach(function (g, i) {
      var t = HS.hisseler(g.starts_at);
      html += '<article class="gorus"><p class="tarix">' + t.gun + ' ' + t.ay + '<small>' + t.hefte + ' · ' + t.saat + '</small></p><div>' +
        '<h3>' + e(g.title) + '</h3>' + (g.topic ? '<p style="font-style:italic;font-size:22px">' + e(g.topic) + '</p>' : '') +
        '<p style="margin-top:8px">' + (g.guest_name ? 'Qonaq: ' + e(g.guest_name) + (g.guest_title ? ', ' + e(g.guest_title) : '') + '. ' : '') + e(g.venue || '') + '</p>' +
        '<a class="duyme krem" style="margin-top:20px" href="https://ig.me/m/hersociety.az" target="_blank" rel="noopener">Yerinizi ayırın</a></div>' +
        '<span class="status yaxin">' + (i === 0 ? 'Növbəti' : 'Tezliklə') + '</span></article>';
    });
    nv.kecmis.forEach(function (g) {
      var t = HS.hisseler(g.starts_at);
      var s = sekiller.filter(function (x) { return x.event_id === g.id; });
      html += '<article class="gorus"><p class="tarix">' + t.gun + ' ' + t.ay + '<small>' + t.il + '</small></p><div>' +
        '<h3>' + e(g.title) + '</h3>' + (g.topic ? '<p style="font-style:italic;font-size:22px">' + e(g.topic) + '</p>' : '') +
        '<p style="margin-top:4px">' + (g.guest_name ? 'Qonaq: ' + e(g.guest_name) + (g.guest_title ? ', ' + e(g.guest_title) : '') + '. ' : '') + e(g.venue || '') + '</p>' +
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
    gorusSiyahi(); qalereyalar(); albomVeziyyeti();
  }

  function yukle() {
    if (!db) { gorusler = EHTIYAT; hamisi(); return; }
    Promise.all([
      db.from('events').select('id,title,topic,guest_name,guest_title,starts_at,venue,album_open').eq('published', true),
      db.from('photos').select('id,event_id,site_path,created_at').eq('on_site', true).not('site_path', 'is', null).order('created_at', { ascending: false })
    ]).then(function (r) {
      if (r[0].error) throw r[0].error;
      gorusler = r[0].data || [];
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
    return HS.kicilt(s.fayl, 3000, 0.85).then(function (boyuk) {
      return HS.kicilt(s.fayl, 480, 0.75).then(function (kicik) {
        return db.storage.from('albom').upload(ev + '/kicik/' + ad, kicik, { contentType: 'image/jpeg', upsert: false })
          .then(function (r) { if (r.error) throw r.error; })
          .then(function () { return db.storage.from('albom').upload(ev + '/' + ad, boyuk, { contentType: 'image/jpeg', upsert: false }); })
          .then(function (r) { if (r.error) throw r.error; });
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
  el('gonder').addEventListener('click', function () { gonder(secilen); });
  el('tekrar').addEventListener('click', function () { gonder(ugursuz.slice()); });
  el('yeniden').addEventListener('click', function () { secilen = []; ugursuz = []; addim('addimSec'); });
})();
