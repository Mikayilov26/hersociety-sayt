// HER Society — admin: Büdcə (25 noyabr 2026)
// Məkanlar + menyular (bir yerdə, məkanlara görə) və hesablamalar (görüş hələ yoxdursa da).
// Heç nə silinmir: köhnələr arxivə düşür, hesablamanın hər dəyişikliyi bazada tarixçəyə yazılır.
(function () {
  var HS = window.HS, db = HS.db, e = HS.esc;
  var el = function (id) { return document.getElementById(id); };
  if (!db || !el('bdKok')) return;

  var mekanlar = [], menyular = [], hesablar = [], gorusler = [];
  var gorunus = 'hesablar', arxivGoster = false, muqayise = new Set();
  var cari = null, deyisib = false;

  /* ---------- Köməkçilər ---------- */
  function bildir(m) { var b = el('bildiris'); b.textContent = m; b.hidden = false; clearTimeout(bildir.t); bildir.t = setTimeout(function () { b.hidden = true; }, 3500); }
  function xeta(err) { console.error(err); bildir('Xəta baş verdi. İnterneti yoxlayıb yenidən cəhd edin.'); }
  function eded(v) { var n = parseFloat(String(v == null ? '' : v).replace(/\s/g, '').replace(',', '.')); return isFinite(n) ? n : 0; }
  function tam(v) { return Math.max(0, Math.round(eded(v))); }
  function yuvarla(n) { return Math.round(n * 100) / 100; }
  function reqem(n) {
    n = yuvarla(n);
    var m = Math.abs(n), s = (m % 1 ? m.toFixed(2) : String(m)).split('.');
    s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return (n < 0 ? '−' : '') + s.join(',');
  }
  function pul(n) { return reqem(n) + ' AZN'; }
  function giris(v) { return v === 0 || v ? String(v).replace('.', ',') : ''; }
  function tesdiq(basliq, metn, beli) {
    return new Promise(function (res) {
      el('tBasliq').textContent = basliq; el('tMetn').textContent = metn; el('tBeli').textContent = beli || 'Bəli';
      var m = el('tesdiq'); m.hidden = false;
      function bitir(v) { m.hidden = true; el('tBeli').onclick = el('tXeyr').onclick = null; res(v); }
      el('tBeli').onclick = function () { bitir(true); };
      el('tXeyr').onclick = function () { bitir(false); };
    });
  }
  function mekan(id) { return mekanlar.filter(function (m) { return m.id === id; })[0]; }
  function gorus(id) { return gorusler.filter(function (g) { return g.id === id; })[0]; }
  function gorusAdi(g) {
    var t = HS.hisseler(g.starts_at), iki = function (n) { return (n < 10 ? '0' : '') + n; };
    var ay = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avqust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'].indexOf(t.ay) + 1;
    return iki(t.gun) + '.' + iki(ay) + '.' + t.il + ' - ' + (g.guest_name || g.title);
  }
  function mekanMenyulari(id, arxivle) { return menyular.filter(function (m) { return m.mekan_id === id && (arxivle || !m.arxiv); }); }

  /* ---------- Hesablama ---------- */
  function bosData() {
    return { nov: 'plan', haqq: 0, servis_faiz: 0, min_mebleg: 0, menyular: [], qrup: { tam: 0, menyu: 0, menyu_id: '', endirim: 0, endirim_mebleg: 0, pulsuz: 0 }, xercler: [], sponsor: 0, qeyd: '' };
  }
  function hesabla(d) {
    var q = d.qrup || {}, r = {};
    r.menyuSay = 0; r.yemek = 0;
    (d.menyular || []).forEach(function (m) { r.menyuSay += tam(m.say); r.yemek += tam(m.say) * eded(m.qiymet); });
    r.servis = r.yemek * eded(d.servis_faiz) / 100;
    r.minFerq = Math.max(0, eded(d.min_mebleg) - (r.yemek + r.servis));
    r.adam = tam(q.tam) + tam(q.menyu) + tam(q.endirim) + tam(q.pulsuz);
    r.diger = 0;
    (d.xercler || []).forEach(function (x) { r.diger += x.adambasi ? eded(x.mebleg) * r.adam : eded(x.mebleg); });
    r.xerc = r.yemek + r.servis + r.minFerq + r.diger;
    var mq = (d.menyular || []).filter(function (m) { return m.id === q.menyu_id; })[0];
    r.menyuQiymeti = mq ? eded(mq.qiymet) * (1 + eded(d.servis_faiz) / 100) : 0;
    r.gelirTam = tam(q.tam) * eded(d.haqq);
    r.gelirMenyu = tam(q.menyu) * r.menyuQiymeti;
    r.gelirEndirim = tam(q.endirim) * eded(q.endirim_mebleg);
    r.sponsor = eded(d.sponsor);
    r.gelir = r.gelirTam + r.gelirMenyu + r.gelirEndirim + r.sponsor;
    r.qalan = r.gelir - r.xerc;
    r.adamBasi = r.adam ? r.xerc / r.adam : 0;
    // Zərərsizlik üçün iştirak haqqı (digər qruplar olduğu kimi qalır)
    r.zHaqq = tam(q.tam) ? Math.max(0, (r.xerc - r.gelirMenyu - r.gelirEndirim - r.sponsor) / tam(q.tam)) : null;
    // Zərərsizlik üçün ən azı neçə nəfər tam haqq ödəməlidir (hər əlavə nəfər orta menyu qiyməti ilə yeyir)
    var orta = r.menyuSay ? r.yemek / r.menyuSay : 0, ad1 = 0;
    (d.xercler || []).forEach(function (x) { if (x.adambasi) ad1 += eded(x.mebleg); });
    r.zSay = null;
    var diger = tam(q.menyu) + tam(q.endirim) + tam(q.pulsuz);
    for (var n = 0; n <= 1000; n++) {
      var yem = r.yemek + (n - tam(q.tam)) * orta; if (yem < 0) yem = 0;
      var sv = yem * eded(d.servis_faiz) / 100, mf = Math.max(0, eded(d.min_mebleg) - yem - sv);
      var dg = 0; (d.xercler || []).forEach(function (x) { dg += x.adambasi ? eded(x.mebleg) * (n + diger) : eded(x.mebleg); });
      if (n * eded(d.haqq) + r.gelirMenyu + r.gelirEndirim + r.sponsor - (yem + sv + mf + dg) >= -0.005) { r.zSay = n; break; }
    }
    r.ad1 = ad1;
    return r;
  }

  /* ---------- Yükləmə ---------- */
  window.bdYukle = function () {
    el('bdSiyahi').innerHTML = '<p class="bos-qeyd">Yüklənir…</p>';
    return Promise.all([
      db.from('budce_mekanlar').select('*').order('ad'),
      db.from('budce_menyular').select('*').order('qiymet'),
      db.from('budce_hesablar').select('*').order('updated_at', { ascending: false }),
      db.from('events').select('id,title,guest_name,starts_at,venue').is('deleted_at', null).order('starts_at', { ascending: false })
    ]).then(function (r) {
      for (var i = 0; i < r.length; i++) if (r[i].error) throw r[i].error;
      mekanlar = r[0].data || []; menyular = r[1].data || []; hesablar = r[2].data || []; gorusler = r[3].data || [];
      ciz();
    }).catch(function (x) { el('bdSiyahi').innerHTML = '<p class="bos-qeyd">Yükləmək alınmadı. Səhifəni yeniləyin.</p>'; xeta(x); });
  };

  function ciz() {
    document.querySelectorAll('[data-bd]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-bd') === gorunus ? 'true' : 'false'); });
    el('bdHesabKok').hidden = gorunus !== 'hesablar' || !!cari;
    el('bdRedakte').hidden = !cari;
    el('bdMenyuKok').hidden = gorunus !== 'menyular' || !!cari;
    el('bdFiltr').hidden = !!cari;
    if (cari) return;
    if (gorunus === 'hesablar') hesabSiyahi(); else menyuSiyahi();
  }
  document.querySelectorAll('[data-bd]').forEach(function (b) {
    b.addEventListener('click', function () { gorunus = b.getAttribute('data-bd'); ciz(); });
  });
  el('bdArxiv').addEventListener('change', function () { arxivGoster = this.checked; ciz(); });
  el('bdArxiv2').addEventListener('change', function () { arxivGoster = this.checked; el('bdArxiv').checked = this.checked; ciz(); });

  /* ---------- Hesablamalar siyahısı ---------- */
  function hesabSiyahi() {
    el('bdArxiv').checked = arxivGoster;
    var list = hesablar.filter(function (h) { return arxivGoster || !h.arxiv; });
    var k = el('bdSiyahi');
    if (!list.length) { k.innerHTML = '<p class="bos-qeyd">' + (mekanlar.length ? 'Hələ hesablama yoxdur. “+ Yeni hesablama” basın.' : 'Əvvəlcə “Menyular” bölməsində məkan və onun menyularını əlavə edin, sonra hesablama yaradın.') + '</p>'; muqCiz(); return; }
    k.innerHTML = list.map(function (h) {
      var r = hesabla(h.data || {}), m = mekan(h.mekan_id), g = gorus(h.event_id), d = h.data || {};
      var alt = [m ? m.ad : 'məkan seçilməyib', g ? gorusAdi(g) : 'görüş hələ yoxdur', r.adam + ' nəfər'].join(' · ');
      return '<div class="bd-setir' + (h.arxiv ? ' arxiv' : '') + '">' +
        '<label class="bd-sec" title="Müqayisə üçün seç"><input type="checkbox" data-muq="' + h.id + '"' + (muqayise.has(h.id) ? ' checked' : '') + '><span class="gizli-metn">Müqayisə</span></label>' +
        '<button type="button" class="bd-ac" data-ac="' + h.id + '"><span class="sol"><b>' + e(h.ad) + '</b><span>' + e(alt) + '</span>' +
        '<span class="nisanlar">' + (d.nov === 'fakt' ? '<i>Fakt</i>' : '<i>Plan</i>') + (h.arxiv ? '<i>Arxiv</i>' : '') + '</span></span>' +
        '<span class="say ' + (r.qalan < 0 ? 'menfi' : '') + '">' + (r.qalan >= 0 ? '+' : '') + reqem(r.qalan) + '<small>AZN qalır</small></span></button></div>';
    }).join('');
    k.querySelectorAll('[data-ac]').forEach(function (b) { b.addEventListener('click', function () { ac(b.getAttribute('data-ac')); }); });
    k.querySelectorAll('[data-muq]').forEach(function (c) {
      c.addEventListener('change', function () {
        var id = c.getAttribute('data-muq');
        if (c.checked) { if (muqayise.size >= 3) { c.checked = false; bildir('Ən çox 3 hesablamanı müqayisə etmək olar.'); return; } muqayise.add(id); }
        else muqayise.delete(id);
        muqCiz();
      });
    });
    muqCiz();
  }

  function muqCiz() {
    var k = el('bdMuqayise'), sec = hesablar.filter(function (h) { return muqayise.has(h.id); });
    if (sec.length < 2) { k.hidden = true; el('bdMuqQeyd').hidden = sec.length !== 1; return; }
    el('bdMuqQeyd').hidden = true; k.hidden = false;
    var rr = sec.map(function (h) { return hesabla(h.data || {}); });
    var setir = function (ad, f, cls) { return '<tr' + (cls ? ' class="' + cls + '"' : '') + '><th>' + ad + '</th>' + rr.map(function (r, i) { return '<td>' + f(r, sec[i].data || {}) + '</td>'; }).join('') + '</tr>'; };
    k.innerHTML = '<h2>Müqayisə</h2><div class="bd-cedvel-qutu"><table class="bd-cedvel"><thead><tr><th></th>' + sec.map(function (h) { return '<th>' + e(h.ad) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      setir('İştirakçı', function (r) { return r.adam; }) +
      setir('İştirak haqqı', function (r, d) { return pul(eded(d.haqq)); }) +
      setir('Ümumi xərc', function (r) { return pul(r.xerc); }) +
      setir('Ümumi gəlir', function (r) { return pul(r.gelir); }) +
      setir('Qalan', function (r) { return '<b class="' + (r.qalan < 0 ? 'menfi' : '') + '">' + pul(r.qalan) + '</b>'; }, 'vurgu') +
      setir('Bir nəfərə düşən xərc', function (r) { return pul(r.adamBasi); }) +
      setir('Zərərsizlik haqqı', function (r) { return r.zHaqq == null ? '—' : pul(r.zHaqq); }) +
      '</tbody></table></div><button class="duyme kicik" type="button" id="bdMuqTemizle" style="align-self:flex-start">Seçimi təmizlə</button>';
    el('bdMuqTemizle').onclick = function () { muqayise.clear(); hesabSiyahi(); };
  }

  el('bdYeni').addEventListener('click', function () {
    if (!mekanlar.filter(function (m) { return !m.arxiv; }).length) { bildir('Əvvəlcə “Menyular” bölməsində məkan əlavə edin.'); gorunus = 'menyular'; ciz(); return; }
    cari = { id: null, ad: '', event_id: null, mekan_id: null, arxiv: false, data: bosData() };
    deyisib = false; redakteCiz(); ciz(); window.scrollTo(0, 0);
  });

  function ac(id) {
    var h = hesablar.filter(function (x) { return x.id === id; })[0]; if (!h) return;
    cari = JSON.parse(JSON.stringify(h));
    var d = cari.data = Object.assign(bosData(), cari.data || {});
    d.qrup = Object.assign(bosData().qrup, d.qrup || {});
    deyisib = false; redakteCiz(); ciz(); window.scrollTo(0, 0);
  }

  /* ---------- Hesablama redaktoru ---------- */
  function redakteCiz() {
    var d = cari.data, k = el('bdForm');
    var mOps = mekanlar.filter(function (m) { return !m.arxiv || m.id === cari.mekan_id; })
      .map(function (m) { return '<option value="' + m.id + '"' + (m.id === cari.mekan_id ? ' selected' : '') + '>' + e(m.ad) + '</option>'; }).join('');
    var gOps = gorusler.map(function (g) { return '<option value="' + g.id + '"' + (g.id === cari.event_id ? ' selected' : '') + '>' + e(gorusAdi(g)) + '</option>'; }).join('');
    k.innerHTML =
      '<div class="panel">' +
        '<div class="sahe"><label for="bdAd">Hesablamanın adı</label><input id="bdAd" maxlength="120" placeholder="məs. Dekabr görüşü — 35 nəfər" value="' + e(cari.ad) + '"></div>' +
        '<div class="sahe"><label for="bdMekan">Məkan</label><select id="bdMekan"><option value="">— seçin —</option>' + mOps + '</select></div>' +
        '<div class="sahe"><label for="bdGorus">Görüş (istəyə bağlı)</label><select id="bdGorus"><option value="">Görüş hələ təsdiqlənməyib</option>' + gOps + '</select></div>' +
        '<div class="filtrler" role="group" aria-label="Növ"><button type="button" data-nov="plan" aria-pressed="' + (d.nov !== 'fakt') + '">Plan</button><button type="button" data-nov="fakt" aria-pressed="' + (d.nov === 'fakt') + '">Fakt (görüşdən sonra)</button></div>' +
        '<p id="bdGelen" class="bd-ipucu" hidden></p>' +
      '</div>' +
      '<div class="panel"><h2>Menyular</h2><p class="bd-ipucu">Hər menyudan neçə nəfər yeyəcək? Lazım olmayanı 0 saxlayın.</p><div id="bdMenyuSay"></div></div>' +
      '<div class="panel"><h2>Kim nə ödəyir</h2>' +
        '<div class="sahe"><label for="bdHaqq">İştirak haqqı (AZN, bir nəfər)</label><input id="bdHaqq" inputmode="decimal" value="' + giris(d.haqq) + '" placeholder="0"></div>' +
        '<div class="bd-qrup"><label for="bdQTam">Tam iştirak haqqı ödəyənlər</label><input id="bdQTam" inputmode="numeric" value="' + giris(d.qrup.tam) + '" placeholder="0"><span>nəfər</span></div>' +
        '<div class="bd-qrup"><label for="bdQMenyu">Yalnız menyu qiymətini ödəyənlər</label><input id="bdQMenyu" inputmode="numeric" value="' + giris(d.qrup.menyu) + '" placeholder="0"><span>nəfər</span></div>' +
        '<div class="sahe" id="bdQMenyuSecQutu"><label for="bdQMenyuSec">Onlar hansı menyunun qiymətini ödəyir</label><select id="bdQMenyuSec"></select></div>' +
        '<div class="bd-qrup"><label for="bdQEnd">Endirimli</label><input id="bdQEnd" inputmode="numeric" value="' + giris(d.qrup.endirim) + '" placeholder="0"><span>nəfər</span></div>' +
        '<div class="sahe" id="bdQEndMebQutu"><label for="bdQEndMeb">Endirimli məbləğ (AZN, bir nəfər)</label><input id="bdQEndMeb" inputmode="decimal" value="' + giris(d.qrup.endirim_mebleg) + '" placeholder="0"></div>' +
        '<div class="bd-qrup"><label for="bdQPul">Ödənişsiz <small>(aparıcılar, qonaq, fotoqraf…)</small></label><input id="bdQPul" inputmode="numeric" value="' + giris(d.qrup.pulsuz) + '" placeholder="0"><span>nəfər</span></div>' +
        '<p id="bdUygun" class="xeberdarliq" hidden></p>' +
      '</div>' +
      '<div class="panel"><h2>Digər xərclər</h2><p class="bd-ipucu">Gül, dekor, fotoqraf, qonağa hədiyyə, çap… “Adambaşı” işarələnsə, məbləğ iştirakçı sayına vurulur.</p><div id="bdXercler"></div>' +
        '<button class="duyme kicik" type="button" id="bdXercElave" style="align-self:flex-start">+ Xərc əlavə et</button></div>' +
      '<div class="panel"><h2>Məkanın şərtləri və dəstək</h2>' +
        '<div class="sahe-cut"><div class="sahe"><label for="bdServis">Servis haqqı (%)</label><input id="bdServis" inputmode="decimal" value="' + giris(d.servis_faiz) + '" placeholder="0"></div>' +
        '<div class="sahe"><label for="bdMin">Minimum məbləğ (AZN)</label><input id="bdMin" inputmode="decimal" value="' + giris(d.min_mebleg) + '" placeholder="0"></div></div>' +
        '<p class="bd-ipucu">Məkan seçiləndə bu rəqəmlər məkanın kartından özü gəlir, burada dəyişmək olar. Servis menyu qiymətinə daxildirsə, 0 yazın.</p>' +
        '<div class="sahe"><label for="bdSponsor">Sponsor dəstəyi (AZN)</label><input id="bdSponsor" inputmode="decimal" value="' + giris(d.sponsor) + '" placeholder="0"></div>' +
        '<div class="sahe"><label for="bdQeyd">Qeyd (istəyə bağlı)</label><textarea id="bdQeyd" maxlength="2000">' + e(d.qeyd || '') + '</textarea></div>' +
      '</div>' +
      '<div class="panel"><h2>Nəticə</h2><div id="bdNetice"></div></div>' +
      '<div class="duymeler" style="justify-content:flex-start">' +
        '<button class="duyme dolu" type="button" id="bdSaxla">Saxla</button>' +
        (cari.id ? '<button class="duyme" type="button" id="bdKopya">Kopyasını yarat</button><button class="duyme" type="button" id="bdExcel">Excel kimi yüklə</button>' +
          '<button class="duyme' + (cari.arxiv ? '' : ' tehlike') + '" type="button" id="bdArxivle">' + (cari.arxiv ? 'Arxivdən qaytar' : 'Arxivə at') + '</button>' : '') +
      '</div>' +
      (cari.id ? '<p class="bd-ipucu">Son dəyişiklik: ' + (function (t) { return t.gun + ' ' + t.ay + ', ' + t.saat; })(HS.hisseler(cari.updated_at)) + (cari.updated_by ? ' · ' + e(cari.updated_by) : '') + '. Hər “Saxla” əvvəlki vəziyyəti tarixçədə saxlayır.</p>' : '');

    menyuSayCiz(); xercCiz(); qMenyuSecCiz(); yenile();

    var bag = function (id, f) { el(id).addEventListener('input', function () { f(this.value); deyis(); }); };
    bag('bdAd', function (v) { cari.ad = v; });
    bag('bdHaqq', function (v) { d.haqq = eded(v); });
    bag('bdQTam', function (v) { d.qrup.tam = tam(v); });
    bag('bdQMenyu', function (v) { d.qrup.menyu = tam(v); });
    bag('bdQEnd', function (v) { d.qrup.endirim = tam(v); });
    bag('bdQEndMeb', function (v) { d.qrup.endirim_mebleg = eded(v); });
    bag('bdQPul', function (v) { d.qrup.pulsuz = tam(v); });
    bag('bdServis', function (v) { d.servis_faiz = Math.min(100, eded(v)); });
    bag('bdMin', function (v) { d.min_mebleg = eded(v); });
    bag('bdSponsor', function (v) { d.sponsor = eded(v); });
    bag('bdQeyd', function (v) { d.qeyd = v; });
    el('bdQMenyuSec').addEventListener('change', function () { d.qrup.menyu_id = this.value; d.qrup.menyu_el = true; deyis(); });
    el('bdGorus').addEventListener('change', function () { cari.event_id = this.value || null; deyis(); });
    el('bdMekan').addEventListener('change', function () { mekanSec(this.value || null); });
    k.querySelectorAll('[data-nov]').forEach(function (b) {
      b.addEventListener('click', function () {
        d.nov = b.getAttribute('data-nov');
        k.querySelectorAll('[data-nov]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        deyis();
      });
    });
    el('bdXercElave').addEventListener('click', function () { d.xercler.push({ ad: '', mebleg: 0, adambasi: false }); xercCiz(); deyis(); var s = el('bdXercler').querySelectorAll('input[data-x="ad"]'); if (s.length) s[s.length - 1].focus(); });
    el('bdSaxla').addEventListener('click', saxla);
    if (cari.id) {
      el('bdKopya').addEventListener('click', kopya);
      el('bdExcel').addEventListener('click', excel);
      el('bdArxivle').addEventListener('click', arxivle);
    }
  }

  function mekanSec(id) {
    var d = cari.data, evvel = cari.mekan_id;
    var davam = function () {
      cari.mekan_id = id;
      var m = mekan(id);
      d.menyular = mekanMenyulari(id).map(function (x) { return { id: x.id, ad: x.ad, qiymet: eded(x.qiymet), say: 0 }; });
      d.qrup.menyu_id = ''; d.qrup.menyu_el = false;
      if (m) { d.servis_faiz = eded(m.servis_faiz); d.min_mebleg = eded(m.min_mebleg); el('bdServis').value = giris(d.servis_faiz); el('bdMin').value = giris(d.min_mebleg); }
      menyuSayCiz(); qMenyuSecCiz(); deyis();
    };
    var sayVar = d.menyular.some(function (m) { return tam(m.say); });
    if (evvel && sayVar) {
      tesdiq('Məkanı dəyişək?', 'Menyu sayları sıfırlanacaq, çünki yeni məkanın menyuları başqadır.', 'Dəyiş').then(function (b) { if (b) davam(); else el('bdMekan').value = evvel || ''; });
    } else davam();
  }

  // Menyu sayları: hesablamada saxlanan qiymət əsasdır; məkanda qiymət dəyişibsə, xəbər veririk
  function menyuSayCiz() {
    var d = cari.data, k = el('bdMenyuSay');
    if (!cari.mekan_id) { k.innerHTML = '<p class="bos-qeyd">Əvvəlcə məkanı seçin.</p>'; return; }
    // məkana sonradan əlavə olunmuş menyular da görünsün
    mekanMenyulari(cari.mekan_id).forEach(function (x) { if (!d.menyular.some(function (m) { return m.id === x.id; })) d.menyular.push({ id: x.id, ad: x.ad, qiymet: eded(x.qiymet), say: 0 }); });
    if (!d.menyular.length) { k.innerHTML = '<p class="bos-qeyd">Bu məkan üçün menyu yoxdur. “Menyular” bölməsində əlavə edin.</p>'; return; }
    k.innerHTML = d.menyular.map(function (m, i) {
      var kat = menyular.filter(function (x) { return x.id === m.id; })[0];
      var ferq = kat && eded(kat.qiymet) !== eded(m.qiymet);
      return '<div class="bd-menyu">' +
        '<div class="sol"><b>' + e(m.ad) + '</b><span>' + pul(eded(m.qiymet)) + ' · bir nəfər' + (kat && kat.arxiv ? ' · arxivdə' : '') + '</span>' +
        (ferq ? '<button type="button" class="bd-link" data-yeni="' + i + '">Menyuda qiymət dəyişib: ' + pul(eded(kat.qiymet)) + ' — götür</button>' : '') + '</div>' +
        '<div class="bd-say"><button type="button" data-az="' + i + '" aria-label="Azalt">−</button><input inputmode="numeric" data-say="' + i + '" value="' + (tam(m.say) || '') + '" placeholder="0" aria-label="' + e(m.ad) + ' — nəfər"><button type="button" data-cox="' + i + '" aria-label="Artır">+</button></div>' +
        '</div>';
    }).join('') + '<div class="st-setir bd-cem"><span>Cəmi yeyən</span><b id="bdMenyuCem"></b></div>';
    k.querySelectorAll('[data-say]').forEach(function (inp) {
      inp.addEventListener('input', function () { d.menyular[+inp.getAttribute('data-say')].say = tam(inp.value); qMenyuSecCiz(); deyis(); });
    });
    var addim = function (i, n) { var m = d.menyular[i]; m.say = Math.max(0, tam(m.say) + n); k.querySelector('[data-say="' + i + '"]').value = m.say || ''; qMenyuSecCiz(); deyis(); };
    k.querySelectorAll('[data-az]').forEach(function (b) { b.addEventListener('click', function () { addim(+b.getAttribute('data-az'), -1); }); });
    k.querySelectorAll('[data-cox]').forEach(function (b) { b.addEventListener('click', function () { addim(+b.getAttribute('data-cox'), 1); }); });
    k.querySelectorAll('[data-yeni]').forEach(function (b) {
      b.addEventListener('click', function () {
        var m = d.menyular[+b.getAttribute('data-yeni')], kat = menyular.filter(function (x) { return x.id === m.id; })[0];
        if (kat) { m.qiymet = eded(kat.qiymet); m.ad = kat.ad; }
        menyuSayCiz(); qMenyuSecCiz(); deyis();
      });
    });
  }

  function qMenyuSecCiz() {
    var d = cari.data, s = el('bdQMenyuSec'); if (!s) return;
    var list = d.menyular.filter(function (m) { return tam(m.say) || m.id === d.qrup.menyu_id; });
    if (!list.length) list = d.menyular;
    if (!d.qrup.menyu_el || !d.menyular.some(function (m) { return m.id === d.qrup.menyu_id; })) {
      var en = list.slice().sort(function (a, b) { return tam(b.say) - tam(a.say); })[0];
      d.qrup.menyu_id = en ? en.id : '';
    }
    s.innerHTML = list.map(function (m) {
      var q = eded(m.qiymet) * (1 + eded(d.servis_faiz) / 100);
      return '<option value="' + m.id + '"' + (m.id === d.qrup.menyu_id ? ' selected' : '') + '>' + e(m.ad) + ' — ' + pul(q) + '</option>';
    }).join('') || '<option value="">Menyu yoxdur</option>';
  }

  function xercCiz() {
    var d = cari.data, k = el('bdXercler');
    if (!d.xercler.length) { k.innerHTML = '<p class="bos-qeyd">Hələ xərc yoxdur.</p>'; return; }
    k.innerHTML = d.xercler.map(function (x, i) {
      return '<div class="bd-xerc">' +
        '<input data-x="ad" data-i="' + i + '" maxlength="80" placeholder="məs. Gül və dekor" value="' + e(x.ad) + '" aria-label="Xərcin adı">' +
        '<input data-x="mebleg" data-i="' + i + '" inputmode="decimal" placeholder="0" value="' + giris(x.mebleg) + '" aria-label="Məbləğ, AZN">' +
        '<label class="yoxla"><input type="checkbox" data-x="adambasi" data-i="' + i + '"' + (x.adambasi ? ' checked' : '') + '> adambaşı</label>' +
        '<button type="button" class="bd-cixar" data-cixar="' + i + '" aria-label="Bu sətri çıxar">✕</button>' +
        '</div>';
    }).join('');
    k.querySelectorAll('[data-x]').forEach(function (inp) {
      var ev = inp.type === 'checkbox' ? 'change' : 'input';
      inp.addEventListener(ev, function () {
        var x = d.xercler[+inp.getAttribute('data-i')], n = inp.getAttribute('data-x');
        x[n] = n === 'adambasi' ? inp.checked : n === 'mebleg' ? eded(inp.value) : inp.value;
        deyis();
      });
    });
    k.querySelectorAll('[data-cixar]').forEach(function (b) {
      b.addEventListener('click', function () { d.xercler.splice(+b.getAttribute('data-cixar'), 1); xercCiz(); deyis(); });
    });
  }

  function deyis() { deyisib = true; yenile(); }

  function yenile() {
    var d = cari.data, r = hesabla(d), q = d.qrup;
    if (el('bdMenyuCem')) el('bdMenyuCem').textContent = r.menyuSay + ' nəfər';
    el('bdQMenyuSecQutu').hidden = !tam(q.menyu);
    el('bdQEndMebQutu').hidden = !tam(q.endirim);
    // Uyğunluq: yeyənlərin sayı = iştirakçıların sayı
    var u = el('bdUygun');
    if (r.menyuSay !== r.adam && (r.menyuSay || r.adam)) {
      u.hidden = false;
      u.innerHTML = 'Menyularda <b>' + r.menyuSay + '</b> nəfər, ödəniş qruplarında <b>' + r.adam + '</b> nəfər var. ' +
        (r.menyuSay > r.adam ? '<button type="button" class="bd-link" id="bdUygunlas">Fərqi (' + (r.menyuSay - r.adam) + ') tam ödəyənlərə əlavə et</button>' : 'Menyu saylarını yoxlayın.');
      var b = el('bdUygunlas');
      if (b) b.onclick = function () { q.tam = tam(q.tam) + (r.menyuSay - r.adam); el('bdQTam').value = q.tam; deyis(); };
    } else u.hidden = true;
    // Görüşə gələnlər (Dəvətlər bölməsindən)
    gelenGoster();

    var h = '';
    var s = function (ad, v, cls) { h += '<div class="bd-n' + (cls ? ' ' + cls : '') + '"><span>' + ad + '</span><b>' + v + '</b></div>'; };
    s('Yemək və içki (' + r.menyuSay + ' nəfər)', pul(r.yemek));
    if (r.servis) s('Servis haqqı (' + reqem(eded(d.servis_faiz)) + '%)', pul(r.servis));
    if (r.minFerq) s('Minimum məbləğə çatdırmaq üçün', pul(r.minFerq), 'xeber');
    if (r.diger) s('Digər xərclər', pul(r.diger));
    s('Ümumi xərc', pul(r.xerc), 'cem');
    if (r.gelirTam) s('Tam iştirak haqqı (' + tam(q.tam) + ' × ' + reqem(eded(d.haqq)) + ')', pul(r.gelirTam));
    if (r.gelirMenyu) s('Menyu qiyməti ödəyənlər (' + tam(q.menyu) + ' × ' + reqem(r.menyuQiymeti) + ')', pul(r.gelirMenyu));
    if (r.gelirEndirim) s('Endirimli (' + tam(q.endirim) + ' × ' + reqem(eded(q.endirim_mebleg)) + ')', pul(r.gelirEndirim));
    if (r.sponsor) s('Sponsor dəstəyi', pul(r.sponsor));
    s('Ümumi gəlir', pul(r.gelir), 'cem');
    s(r.qalan >= 0 ? 'Qalan' : 'Çatışmayan', pul(r.qalan), 'esas' + (r.qalan < 0 ? ' menfi' : ''));
    h += '<div class="bd-ayir"></div>';
    s('Bir nəfərə düşən xərc' + (r.adam ? ' (' + r.adam + ' nəfər)' : ''), r.adam ? pul(r.adamBasi) : '—');
    if (r.zHaqq != null) s('Zərərsizlik üçün iştirak haqqı', pul(r.zHaqq) + (r.zHaqq % 5 ? ' <small>≈ ' + reqem(Math.ceil(r.zHaqq / 5) * 5) + '</small>' : ''));
    else s('Zərərsizlik üçün iştirak haqqı', '<small>tam ödəyən yoxdur</small>');
    if (eded(d.haqq) > 0) s('Zərərsizlik üçün ən azı', r.zSay == null ? '<small>bu haqla mümkün deyil</small>' : r.zSay + ' nəfər tam haqq');
    el('bdNetice').innerHTML = h;

    el('bdCubuqQalan').textContent = (r.qalan >= 0 ? 'Qalan ' : 'Çatışmayan ') + pul(r.qalan);
    el('bdCubuqQalan').className = r.qalan < 0 ? 'menfi' : '';
    el('bdCubuqAlt').textContent = r.zHaqq != null ? 'Zərərsizlik haqqı: ' + pul(r.zHaqq) : r.adam + ' nəfər';
    el('bdCubuqVez').textContent = deyisib ? 'Saxlanmayıb' : (cari.id ? 'Saxlanıb ✓' : '');
    el('bdCubuqVez').className = deyisib ? 'gozleyir' : '';
  }

  var gelenKes = {};
  function gelenGoster() {
    var p = el('bdGelen'), id = cari.event_id;
    if (!id || cari.data.nov !== 'fakt') { p.hidden = true; return; }
    var yaz = function (x) { p.hidden = false; p.textContent = 'Dəvətlər bölməsinə görə: ' + x.kart + ' kart, gəlib ' + x.gelen + ' nəfər. Faktı yazanda bu rəqəmə baxın.'; };
    if (gelenKes[id]) return yaz(gelenKes[id]);
    db.from('tickets').select('revoked,checked_in_at').eq('event_id', id).then(function (r) {
      if (r.error) return;
      var x = { kart: 0, gelen: 0 };
      (r.data || []).forEach(function (t) { if (t.revoked) return; x.kart++; if (t.checked_in_at) x.gelen++; });
      gelenKes[id] = x; if (cari && cari.event_id === id) yaz(x);
    });
  }

  function saxla() {
    var d = cari.data;
    if (!String(cari.ad || '').trim()) { bildir('Hesablamaya ad verin.'); el('bdAd').focus(); return; }
    if (!cari.mekan_id) { bildir('Məkanı seçin.'); el('bdMekan').focus(); return; }
    var qeyd = { ad: cari.ad.trim(), event_id: cari.event_id || null, mekan_id: cari.mekan_id, data: d };
    var b = el('bdSaxla'); b.disabled = true;
    var sorgu = cari.id ? db.from('budce_hesablar').update(qeyd).eq('id', cari.id).select().single() : db.from('budce_hesablar').insert(qeyd).select().single();
    sorgu.then(function (r) {
      b.disabled = false;
      if (r.error) return xeta(r.error);
      var yeni = r.data, i = hesablar.findIndex(function (h) { return h.id === yeni.id; });
      if (i >= 0) hesablar[i] = yeni; else hesablar.unshift(yeni);
      var ilk = !cari.id;
      cari = JSON.parse(JSON.stringify(yeni)); cari.data = Object.assign(bosData(), cari.data); cari.data.qrup = Object.assign(bosData().qrup, cari.data.qrup || {});
      deyisib = false; bildir('Saxlanıldı.');
      if (ilk) redakteCiz(); else yenile();
    }, function (x) { b.disabled = false; xeta(x); });
  }

  function kopya() {
    var basla = function () {
      var qeyd = { ad: (cari.ad + ' (kopya)').slice(0, 120), event_id: cari.event_id || null, mekan_id: cari.mekan_id, data: cari.data };
      db.from('budce_hesablar').insert(qeyd).select().single().then(function (r) {
        if (r.error) return xeta(r.error);
        hesablar.unshift(r.data); bildir('Kopya yaradıldı. İndi kopyanı düzəldirsiniz.'); ac(r.data.id);
      }, xeta);
    };
    if (deyisib) tesdiq('Saxlanmamış dəyişiklik var', 'Kopya ekrandakı rəqəmlərlə yaradılacaq, bu hesablama isə dəyişməz qalacaq.', 'Kopyala').then(function (b) { if (b) basla(); });
    else basla();
  }

  function arxivle() {
    var yeni = !cari.arxiv;
    var et = function () {
      db.from('budce_hesablar').update({ arxiv: yeni }).eq('id', cari.id).select().single().then(function (r) {
        if (r.error) return xeta(r.error);
        var i = hesablar.findIndex(function (h) { return h.id === r.data.id; }); if (i >= 0) hesablar[i] = r.data;
        bildir(yeni ? 'Arxivə atıldı. “Arxivi göstər” ilə tapmaq olar.' : 'Arxivdən qaytarıldı.');
        cari = null; deyisib = false; ciz();
      }, xeta);
    };
    if (yeni) tesdiq('Arxivə ataq?', 'Hesablama silinmir, sadəcə siyahıdan gizlənir. “Arxivi göstər” ilə istənilən vaxt qaytarmaq olar.', 'Arxivə at').then(function (b) { if (b) et(); });
    else et();
  }

  function excel() {
    if (!window.XLSX) { bildir('Excel aləti yüklənmədi. Səhifəni yeniləyin.'); return; }
    var d = cari.data, r = hesabla(d), m = mekan(cari.mekan_id), g = gorus(cari.event_id), q = d.qrup, rows = [];
    var s = function (a, b, c) { rows.push([a, b == null ? '' : b, c == null ? '' : c]); };
    s('Hesablama', cari.ad); s('Növ', d.nov === 'fakt' ? 'Fakt' : 'Plan'); s('Məkan', m ? m.ad : ''); s('Görüş', g ? gorusAdi(g) : 'hələ yoxdur'); s('');
    s('MENYULAR', 'Nəfər', 'AZN'); d.menyular.forEach(function (x) { if (tam(x.say)) s(x.ad + ' (' + reqem(eded(x.qiymet)) + ')', tam(x.say), yuvarla(tam(x.say) * eded(x.qiymet))); }); s('');
    s('KİM NƏ ÖDƏYİR', 'Nəfər', 'AZN');
    s('Tam iştirak haqqı (' + reqem(eded(d.haqq)) + ')', tam(q.tam), yuvarla(r.gelirTam));
    s('Yalnız menyu qiyməti (' + reqem(r.menyuQiymeti) + ')', tam(q.menyu), yuvarla(r.gelirMenyu));
    s('Endirimli (' + reqem(eded(q.endirim_mebleg)) + ')', tam(q.endirim), yuvarla(r.gelirEndirim));
    s('Ödənişsiz', tam(q.pulsuz), 0); s('');
    s('DİGƏR XƏRCLƏR', '', 'AZN'); d.xercler.forEach(function (x) { s(x.ad + (x.adambasi ? ' (adambaşı ' + reqem(eded(x.mebleg)) + ')' : ''), '', yuvarla(x.adambasi ? eded(x.mebleg) * r.adam : eded(x.mebleg))); }); s('');
    s('NƏTİCƏ', '', 'AZN');
    s('Yemək və içki', '', yuvarla(r.yemek)); s('Servis haqqı (' + reqem(eded(d.servis_faiz)) + '%)', '', yuvarla(r.servis));
    s('Minimum məbləğə çatdırma', '', yuvarla(r.minFerq)); s('Digər xərclər', '', yuvarla(r.diger));
    s('Ümumi xərc', '', yuvarla(r.xerc)); s('Sponsor dəstəyi', '', yuvarla(r.sponsor)); s('Ümumi gəlir', '', yuvarla(r.gelir));
    s(r.qalan >= 0 ? 'Qalan' : 'Çatışmayan', '', yuvarla(r.qalan)); s('Bir nəfərə düşən xərc', '', yuvarla(r.adamBasi));
    s('Zərərsizlik üçün iştirak haqqı', '', r.zHaqq == null ? '' : yuvarla(r.zHaqq));
    if (d.qeyd) { s(''); s('Qeyd', d.qeyd); }
    var wb = XLSX.utils.book_new(), ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 44 }, { wch: 12 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Büdcə');
    XLSX.writeFile(wb, 'HER-Society-budce-' + cari.ad.replace(/[^\wəöüğıçşƏÖÜĞIÇŞİ\- ]+/g, '').trim().replace(/\s+/g, '-') + '.xlsx');
  }

  el('bdGeri').addEventListener('click', function () {
    var get = function () { cari = null; deyisib = false; ciz(); window.scrollTo(0, 0); };
    if (deyisib) tesdiq('Saxlanmamış dəyişiklik var', 'Çıxsanız, son dəyişikliklər itəcək.', 'Saxlamadan çıx').then(function (b) { if (b) get(); });
    else get();
  });
  window.addEventListener('beforeunload', function (ev) { if (cari && deyisib) { ev.preventDefault(); ev.returnValue = ''; } });

  /* ---------- Menyular (məkanlara görə) ---------- */
  var acikMekan = {};
  function menyuSiyahi() {
    el('bdArxiv2').checked = arxivGoster;
    var list = mekanlar.filter(function (m) { return arxivGoster || !m.arxiv; }), k = el('bdMekanlar');
    if (!list.length) { k.innerHTML = '<p class="bos-qeyd">Hələ məkan yoxdur. “+ Yeni məkan” basın, sonra onun menyularını əlavə edin.</p>'; return; }
    k.innerHTML = list.map(function (m) {
      var mm = mekanMenyulari(m.id, arxivGoster);
      var sert = [];
      if (eded(m.servis_faiz)) sert.push('servis ' + reqem(eded(m.servis_faiz)) + '%');
      if (eded(m.min_mebleg)) sert.push('minimum ' + pul(eded(m.min_mebleg)));
      return '<details class="ev-acilan' + (m.arxiv ? ' kecmis' : '') + '" data-mekan="' + m.id + '"' + (acikMekan[m.id] ? ' open' : '') + '>' +
        '<summary><span class="sol"><b>' + e(m.ad) + '</b><span style="font-size:16px;opacity:.85">' + mm.filter(function (x) { return !x.arxiv; }).length + ' menyu' + (sert.length ? ' · ' + e(sert.join(' · ')) : '') + (m.arxiv ? ' · arxivdə' : '') + '</span></span></summary>' +
        '<div class="ev-ic">' +
          (m.qeyd ? '<p class="bd-ipucu">' + e(m.qeyd) + '</p>' : '') +
          (mm.length ? mm.map(function (x) {
            return '<div class="bd-menyu-kat' + (x.arxiv ? ' arxiv' : '') + '"><div class="sol"><b>' + e(x.ad) + '</b>' + (x.terkib ? '<span>' + e(x.terkib) + '</span>' : '') + (x.arxiv ? '<span>arxivdə</span>' : '') + '</div>' +
              '<div class="sag"><b>' + pul(eded(x.qiymet)) + '</b><button type="button" class="bd-link" data-menyu-duz="' + x.id + '">Düzəlt</button></div></div>';
          }).join('') : '<p class="bos-qeyd">Bu məkanda hələ menyu yoxdur.</p>') +
          '<div class="duymeler" style="justify-content:flex-start;margin-top:6px">' +
            (m.arxiv ? '' : '<button class="duyme dolu kicik" type="button" data-menyu-yeni="' + m.id + '">+ Menyu əlavə et</button>') +
            '<button class="duyme kicik" type="button" data-mekan-duz="' + m.id + '">Məkanı düzəlt</button>' +
          '</div>' +
        '</div></details>';
    }).join('');
    k.querySelectorAll('details[data-mekan]').forEach(function (dt) { dt.addEventListener('toggle', function () { acikMekan[dt.getAttribute('data-mekan')] = dt.open; }); });
    k.querySelectorAll('[data-menyu-yeni]').forEach(function (b) { b.addEventListener('click', function () { menyuForm(null, b.getAttribute('data-menyu-yeni')); }); });
    k.querySelectorAll('[data-menyu-duz]').forEach(function (b) { b.addEventListener('click', function () { menyuForm(b.getAttribute('data-menyu-duz')); }); });
    k.querySelectorAll('[data-mekan-duz]').forEach(function (b) { b.addEventListener('click', function () { mekanForm(b.getAttribute('data-mekan-duz')); }); });
  }
  el('bdMekanYeni').addEventListener('click', function () { mekanForm(null); });

  function modal(basliq, html, duymeler) {
    el('bdmBasliq').textContent = basliq; el('bdmIc').innerHTML = html;
    var d = el('bdmDuymeler'); d.innerHTML = '';
    duymeler.forEach(function (x) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'duyme' + (x.cls ? ' ' + x.cls : ''); b.textContent = x.ad;
      b.addEventListener('click', x.f); d.appendChild(b);
    });
    el('bdModal').hidden = false;
    setTimeout(function () { var i = el('bdmIc').querySelector('input'); if (i && !i.value) i.focus(); }, 80);
  }
  function modalBagla() { el('bdModal').hidden = true; }
  function modalXeta(m) { var x = el('bdmXeta'); x.hidden = !m; x.textContent = m || ''; }

  function mekanForm(id) {
    var m = id ? mekan(id) : { ad: '', servis_faiz: 0, min_mebleg: 0, qeyd: '' };
    var dyl = [{ ad: 'Saxla', cls: 'dolu', f: function () {
      var qeyd = { ad: el('bmAd').value.trim(), servis_faiz: Math.min(100, eded(el('bmServis').value)), min_mebleg: eded(el('bmMin').value), qeyd: el('bmQeyd').value.trim() || null };
      if (!qeyd.ad) return modalXeta('Məkanın adını yazın.');
      var s = id ? db.from('budce_mekanlar').update(qeyd).eq('id', id).select().single() : db.from('budce_mekanlar').insert(qeyd).select().single();
      s.then(function (r) {
        if (r.error) return modalXeta('Saxlamaq alınmadı. Yenidən cəhd edin.');
        var i = mekanlar.findIndex(function (x) { return x.id === r.data.id; }); if (i >= 0) mekanlar[i] = r.data; else mekanlar.push(r.data);
        mekanlar.sort(function (a, b) { return a.ad.localeCompare(b.ad, 'az'); });
        acikMekan[r.data.id] = true; modalBagla(); bildir('Saxlanıldı.'); ciz();
      }, function () { modalXeta('Saxlamaq alınmadı. İnterneti yoxlayın.'); });
    } }];
    if (id) dyl.push({ ad: m.arxiv ? 'Arxivdən qaytar' : 'Arxivə at', f: function () {
      var yeni = !m.arxiv;
      db.from('budce_mekanlar').update({ arxiv: yeni }).eq('id', id).select().single().then(function (r) {
        if (r.error) return modalXeta('Alınmadı. Yenidən cəhd edin.');
        var i = mekanlar.findIndex(function (x) { return x.id === id; }); mekanlar[i] = r.data;
        modalBagla(); bildir(yeni ? 'Məkan arxivə atıldı. Köhnə hesablamalar olduğu kimi qalır.' : 'Məkan qaytarıldı.'); ciz();
      });
    } });
    dyl.push({ ad: 'Ləğv et', f: modalBagla });
    modal(id ? 'Məkanı düzəlt' : 'Yeni məkan',
      '<div class="sahe"><label for="bmAd">Məkanın adı</label><input id="bmAd" maxlength="120" placeholder="məs. Lalo Bar Lounge" value="' + e(m.ad) + '"></div>' +
      '<div class="sahe-cut"><div class="sahe"><label for="bmServis">Servis haqqı (%)</label><input id="bmServis" inputmode="decimal" placeholder="0" value="' + giris(eded(m.servis_faiz) || '') + '"></div>' +
      '<div class="sahe"><label for="bmMin">Minimum məbləğ (AZN)</label><input id="bmMin" inputmode="decimal" placeholder="0" value="' + giris(eded(m.min_mebleg) || '') + '"></div></div>' +
      '<p class="bd-ipucu">Servis menyu qiymətinə daxildirsə və ya minimum yoxdursa, boş saxlayın.</p>' +
      '<div class="sahe"><label for="bmQeyd">Qeyd (istəyə bağlı)</label><textarea id="bmQeyd" maxlength="1000" placeholder="məs. əlaqə: menecer Aysel, depozit 2 gün əvvəl">' + e(m.qeyd || '') + '</textarea></div>' +
      '<p class="xeta" id="bdmXeta" hidden></p>', dyl);
  }

  function menyuForm(id, mekanId) {
    var x = id ? menyular.filter(function (y) { return y.id === id; })[0] : { ad: '', qiymet: '', terkib: '', mekan_id: mekanId };
    var m = mekan(x.mekan_id);
    var dyl = [{ ad: 'Saxla', cls: 'dolu', f: function () {
      var qeyd = { ad: el('bnAd').value.trim(), qiymet: eded(el('bnQiymet').value), terkib: el('bnTerkib').value.trim() || null };
      if (!qeyd.ad) return modalXeta('Menyunun adını yazın.');
      if (!(qeyd.qiymet > 0)) return modalXeta('Bir nəfər üçün qiyməti yazın.');
      if (!id) qeyd.mekan_id = x.mekan_id;
      var s = id ? db.from('budce_menyular').update(qeyd).eq('id', id).select().single() : db.from('budce_menyular').insert(qeyd).select().single();
      s.then(function (r) {
        if (r.error) return modalXeta('Saxlamaq alınmadı. Yenidən cəhd edin.');
        var i = menyular.findIndex(function (y) { return y.id === r.data.id; }); if (i >= 0) menyular[i] = r.data; else menyular.push(r.data);
        menyular.sort(function (a, b) { return eded(a.qiymet) - eded(b.qiymet); });
        acikMekan[r.data.mekan_id] = true; modalBagla(); bildir(id ? 'Saxlanıldı. Köhnə hesablamalardakı qiymət dəyişmir.' : 'Menyu əlavə olundu.'); ciz();
      }, function () { modalXeta('Saxlamaq alınmadı. İnterneti yoxlayın.'); });
    } }];
    if (id) dyl.push({ ad: x.arxiv ? 'Arxivdən qaytar' : 'Arxivə at', f: function () {
      var yeni = !x.arxiv;
      db.from('budce_menyular').update({ arxiv: yeni }).eq('id', id).select().single().then(function (r) {
        if (r.error) return modalXeta('Alınmadı. Yenidən cəhd edin.');
        var i = menyular.findIndex(function (y) { return y.id === id; }); menyular[i] = r.data;
        modalBagla(); bildir(yeni ? 'Menyu arxivə atıldı.' : 'Menyu qaytarıldı.'); ciz();
      });
    } });
    dyl.push({ ad: 'Ləğv et', f: modalBagla });
    modal((id ? 'Menyunu düzəlt' : 'Yeni menyu') + (m ? ' · ' + m.ad : ''),
      '<div class="sahe"><label for="bnAd">Menyunun adı</label><input id="bnAd" maxlength="120" placeholder="məs. Kanape 2 / VIP" value="' + e(x.ad) + '"></div>' +
      '<div class="sahe"><label for="bnQiymet">Qiymət (AZN, bir nəfər)</label><input id="bnQiymet" inputmode="decimal" placeholder="0" value="' + giris(x.qiymet) + '"></div>' +
      '<div class="sahe"><label for="bnTerkib">Nə daxildir (istəyə bağlı)</label><textarea id="bnTerkib" maxlength="1000" placeholder="məs. 6 növ kanape, çay, desert">' + e(x.terkib || '') + '</textarea></div>' +
      (id ? '<p class="bd-ipucu">Qiyməti dəyişsəniz, köhnə hesablamalar öz qiyməti ilə qalır. Hesablamanı açanda yeni qiyməti götürmək təklif olunur.</p>' : '') +
      '<p class="xeta" id="bdmXeta" hidden></p>', dyl);
  }
})();
