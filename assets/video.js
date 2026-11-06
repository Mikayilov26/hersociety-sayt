// HER Society — görüş anons videosu (prototip 5 üslubu), 1080×1920, 20 san., görüş məlumatından avtomatik
(function () {
  var HS = window.HS = window.HS || {};
  var W = 1080, H = 1920, FPS = 30, MUDDET = 20;
  var BORDO = '#661712', QIRMIZI = '#A3241B', MUREKKEB = '#5B1510', KAGIZ = '#F2E8D9', KART = '#F4EBDD';
  var ADSIZ = 'HSCG';
  var AD_SRIFT = '"Playfair Display", HSCG'; // ə hərfi olan iri adlar üçün

  /* ---------- köməkçilər ---------- */
  function cl(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function ara(t, a, b) { return cl((t - a) / (b - a)); }
  function yum(x) { return x * x * (3 - 2 * x); }
  function cix(x) { return 1 - Math.pow(1 - x, 3); }
  function gir(x) { return x * x * x; }
  function lerp(a, b, x) { return a + (b - a) * x; }
  function boyuk(s) { return String(s || '').toLocaleUpperCase('az'); }

  function aralikli(g, metn, x, y, araliq) {
    var en = 0, w = [], i;
    for (i = 0; i < metn.length; i++) { w[i] = g.measureText(metn[i]).width; en += w[i] + (i < metn.length - 1 ? araliq : 0); }
    var bas = g.textAlign === 'center' ? x - en / 2 : g.textAlign === 'right' ? x - en : x, ev = g.textAlign;
    g.textAlign = 'left';
    for (i = 0; i < metn.length; i++) { g.fillText(metn[i], bas, y); bas += w[i] + araliq; }
    g.textAlign = ev;
    return en;
  }
  function aralikliEn(g, metn, araliq) {
    var en = 0; for (var i = 0; i < metn.length; i++) en += g.measureText(metn[i]).width + (i < metn.length - 1 ? araliq : 0); return en;
  }
  // Mətni eninə sığdır (şrift ölçüsünü kiçildərək)
  function sigdir(g, metn, sablon, olcu, maxEn, araliq, min) {
    var o = olcu;
    for (;;) {
      g.font = sablon.replace('{o}', o);
      var en = araliq ? aralikliEn(g, metn, araliq * o / olcu) : g.measureText(metn).width;
      if (en <= maxEn || o <= (min || 16)) return o / olcu;
      o -= 1;
    }
  }

  /* ---------- fincanlar (xətlə çəkilir) ---------- */
  function bez(p0, p1, p2, p3, n) {
    var r = [];
    for (var i = 0; i <= n; i++) {
      var t = i / n, a = 1 - t;
      r.push([a * a * a * p0[0] + 3 * a * a * t * p1[0] + 3 * a * t * t * p2[0] + t * t * t * p3[0],
              a * a * a * p0[1] + 3 * a * a * t * p1[1] + 3 * a * t * t * p2[1] + t * t * t * p3[1]]);
    }
    return r;
  }
  function ellips(cx, cy, rx, ry, don, bas, son, n) {
    var r = [], c = Math.cos(don), s = Math.sin(don);
    for (var i = 0; i <= n; i++) {
      var a = bas + (son - bas) * i / n, x = Math.cos(a) * rx, y = Math.sin(a) * ry;
      r.push([cx + x * c - y * s, cy + x * s + y * c]);
    }
    return r;
  }
  function dalga(x0, y0, x1, y1, n, amp, say) {
    var r = [];
    for (var i = 0; i <= n; i++) {
      var t = i / n, x = lerp(x0, x1, t), y = lerp(y0, y1, t);
      var nx = -(y1 - y0), ny = x1 - x0, l = Math.hypot(nx, ny);
      var d = Math.sin(t * Math.PI * 2 * say) * amp;
      r.push([x + nx / l * d, y + ny / l * d]);
    }
    return r;
  }
  function uzunluq(p) { var L = 0; for (var i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return L; }
  // Sol fincan (sağ fincan güzgü əksidir)
  var FINCAN = (function () {
    var x = [];
    // ağız (əyilmiş ellips)
    x.push(ellips(428, 832, 118, 30, 0.2, Math.PI, Math.PI * 3, 60));
    // gövdə: ağzın sol ucundan dibə və sağ uca
    x.push(bez([312, 808], [300, 900], [350, 955], [415, 958], 30).concat(bez([415, 958], [480, 960], [530, 920], [543, 856], 30).slice(1)));
    // ayaq
    x.push(ellips(405, 975, 52, 12, 0.15, 0, Math.PI * 2, 40));
    x.push([[392, 958], [388, 970]]); x.push([[440, 958], [446, 968]]);
    // qulp
    x.push(bez([318, 836], [262, 818], [258, 900], [330, 905], 30));
    // içindəki dalğa
    x.push(dalga(338, 868, 508, 900, 60, 5, 6));
    // ürək və sapı
    x.push(bez([440, 935], [418, 918], [425, 898], [440, 910], 16).concat(bez([440, 910], [455, 898], [462, 918], [440, 935], 16).slice(1)));
    x.push([[440, 935], [438, 958]]);
    // fincanlar bir-birinə toxunsun, üst-üstə düşməsin: bir az sola və mərkəzə doğru əy
    return x.map(function (p) { return p.map(function (q) { var dx = q[0] - 430, dy = q[1] - 880, a = 0.07; return [430 + dx * Math.cos(a) - dy * Math.sin(a) - 12, 880 + dx * Math.sin(a) + dy * Math.cos(a)]; }); });
  })();
  var FIYONK = (function () {
    var cx = 276, cy = 852, x = [];
    x.push(bez([cx, cy], [cx - 40, cy - 30], [cx - 48, cy + 10], [cx, cy], 20));
    x.push(bez([cx, cy], [cx + 40, cy - 30], [cx + 48, cy + 10], [cx, cy], 20));
    x.push([[cx, cy], [cx - 22, cy + 46]]); x.push([[cx, cy], [cx + 20, cy + 44]]);
    return x;
  })();
  function xettCiz(g, xetler, irelileme, guzgu) {
    var hamisi = 0, i, L = xetler.map(function (p) { var u = uzunluq(p); hamisi += u; return u; });
    var qalan = hamisi * irelileme;
    g.beginPath();
    for (i = 0; i < xetler.length && qalan > 0; i++) {
      var p = xetler[i], j;
      g.moveTo(guzgu ? W - p[0][0] : p[0][0], p[0][1]);
      for (j = 1; j < p.length && qalan > 0; j++) {
        var d = Math.hypot(p[j][0] - p[j - 1][0], p[j][1] - p[j - 1][1]);
        if (d <= qalan) { g.lineTo(guzgu ? W - p[j][0] : p[j][0], p[j][1]); qalan -= d; }
        else { var k = qalan / d, xx = lerp(p[j - 1][0], p[j][0], k), yy = lerp(p[j - 1][1], p[j][1], k); g.lineTo(guzgu ? W - xx : xx, yy); qalan = 0; }
      }
    }
    g.stroke();
  }

  /* ---------- məlumat ---------- */
  function hazirla(ev) {
    var t = HS.hisseler(ev.starts_at);
    return {
      basliq: ev.title || 'Çay Süfrəsi', movzu: ev.topic || '', qonaq: boyuk(ev.guest_name || ''), titul: ev.guest_title || '',
      hefte: boyuk(t.hefte), gun: String(t.gun), ay: boyuk(t.ay), saat: t.saat,
      mekan: boyuk(ev.venue || ''), mekanAlt: ev.venue_detail || '',
      kartAlt: (t.gun + ' ' + boyuk(t.ay) + (ev.venue ? ' · ' + boyuk(ev.venue) : ''))
    };
  }

  /* ---------- zərf səhnəsi ---------- */
  function fon(g) {
    var gr = g.createRadialGradient(W * 0.48, H * 0.36, 60, W / 2, H * 0.55, H * 0.75);
    gr.addColorStop(0, '#7C1D16'); gr.addColorStop(0.6, '#5E140F'); gr.addColorStop(1, '#3E0B08');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }
  function kicikKart(g, d, x, y, w, h, alfa) {
    g.save(); g.globalAlpha = alfa;
    g.shadowColor = 'rgba(20,3,2,.35)'; g.shadowBlur = 30; g.shadowOffsetY = 12;
    g.fillStyle = KART; g.fillRect(x, y, w, h);
    g.shadowColor = 'transparent';
    var k = w / 690, cx = x + w / 2;
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.fillStyle = QIRMIZI; g.font = '600 ' + (19 * k) + 'px ' + ADSIZ; aralikli(g, 'HER SOCIETY', cx, y + h * 0.2, 7 * k);
    g.fillStyle = BORDO; g.font = (112 * k) + 'px HSPinyon';
    var s = sigdir(g, d.basliq, '{o}px HSPinyon', 112 * k, w * 0.86); g.fillText(d.basliq, cx, y + h * 0.52);
    g.fillStyle = MUREKKEB; sigdir(g, d.kartAlt, '600 {o}px ' + ADSIZ, 21 * k, w * 0.86, 6 * k, 10); aralikli(g, d.kartAlt, cx, y + h * 0.7, 6 * k * Math.min(1, s * 1.2));
    g.restore();
  }
  function zerf(g, t, d) {
    var ew = 780, eh = 540, ex = (W - ew) / 2;
    var ey0 = 1089 - eh / 2;
    var cix_ = ara(t, 3.4, 4.3);
    var ey = ey0 + gir(cix_) * 1150;            // zərf aşağı gedir
    var gorun = cix(ara(t, 0, 0.7));
    var olc = lerp(0.94, 1, gorun);
    var qapaq = yum(ara(t, 1.4, 2.3));          // 0 bağlı → 1 açıq
    var kartQalx = cix(ara(t, 2.3, 3.4));
    g.save();
    g.globalAlpha = gorun;
    g.translate(W / 2, ey + eh / 2); g.scale(olc, olc); g.translate(-W / 2, -(ey + eh / 2));
    // kölgə + arxa
    g.save(); g.shadowColor = 'rgba(20,3,2,.45)'; g.shadowBlur = 40; g.shadowOffsetY = 18;
    g.fillStyle = '#E2D4BA'; g.fillRect(ex, ey, ew, eh); g.restore();
    // açıq qapaq (kartın arxasında)
    if (qapaq > 0.5) {
      var hq = (qapaq - 0.5) * 2 * eh * 0.62;
      g.fillStyle = '#E4D7BE'; g.beginPath(); g.moveTo(ex, ey); g.lineTo(ex + ew, ey); g.lineTo(ex + ew / 2, ey - hq); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(120,90,60,.18)'; g.lineWidth = 2; g.stroke();
    }
    // kart (içəridən qalxır) — zərfin içində olanda ön cib onu örtür
    var cw = 690, ch = 465, cxp = (W - cw) / 2;
    var cyIc = ey + 40, cyCol = ey0 - 300;
    if (t < 3.4) kicikKart(g, d, cxp, lerp(cyIc, cyCol, kartQalx), cw, ch, 1);
    // ön cib (yan və alt üçbucaqlar)
    g.fillStyle = '#DCCCAE'; g.beginPath(); g.moveTo(ex, ey); g.lineTo(ex + ew * 0.52, ey + eh * 0.56); g.lineTo(ex, ey + eh); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(ex + ew, ey); g.lineTo(ex + ew * 0.48, ey + eh * 0.56); g.lineTo(ex + ew, ey + eh); g.closePath(); g.fill();
    var ag = g.createLinearGradient(0, ey + eh * 0.4, 0, ey + eh); ag.addColorStop(0, '#EDE3D0'); ag.addColorStop(1, '#E3D6BD');
    g.fillStyle = ag; g.beginPath(); g.moveTo(ex, ey + eh); g.lineTo(ex + ew / 2, ey + eh * 0.47); g.lineTo(ex + ew, ey + eh); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(120,90,60,.16)'; g.lineWidth = 2; g.stroke();
    // bağlı qapaq
    if (qapaq <= 0.5) {
      var hb = (1 - qapaq * 2) * eh * 0.56;
      var qg = g.createLinearGradient(0, ey, 0, ey + hb); qg.addColorStop(0, '#EFE6D4'); qg.addColorStop(1, '#E6DAC3');
      g.fillStyle = qg; g.beginPath(); g.moveTo(ex, ey); g.lineTo(ex + ew, ey); g.lineTo(ex + ew / 2, ey + hb); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(120,90,60,.2)'; g.lineWidth = 2; g.stroke();
      // möhür
      var ma = 1 - ara(t, 1.3, 1.65);
      if (ma > 0) {
        g.save(); g.globalAlpha *= ma;
        var my = ey + eh * 0.56 * (1 - qapaq * 2) - 4;
        g.fillStyle = '#6E1A14'; g.beginPath(); g.arc(W / 2, my, 34, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(243,230,210,.35)'; g.lineWidth = 2; g.beginPath(); g.arc(W / 2, my, 26, 0, Math.PI * 2); g.stroke();
        g.fillStyle = '#F3E6D2'; g.font = '400 34px HSBodoni'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('H', W / 2, my + 1);
        g.textBaseline = 'alphabetic'; g.restore();
      }
    }
    g.restore();
    // zərf aşağı gedir, kart ortaya enir, sonra böyüyüb ekranı tutur
    if (t >= 3.4) {
      var m = yum(ara(t, 3.4, 4.3)), b = yum(ara(t, 4.3, 4.95));
      var yk = lerp(cyCol, (H - ch) / 2, m);
      if (b <= 0) kicikKart(g, d, cxp, yk, cw, ch, 1);
      else {
        var xx = lerp(cxp, 0, b), yy = lerp(yk, 0, b), ww = lerp(cw, W, b), hh = lerp(ch, H, b);
        g.save(); g.shadowColor = 'rgba(20,3,2,.35)'; g.shadowBlur = 30 * (1 - b); g.fillStyle = KART; g.fillRect(xx, yy, ww, hh); g.restore();
        kicikKart(g, d, xx, yy, ww, Math.min(hh, ww * ch / cw), 1 - cix(ara(t, 4.3, 4.6)));
      }
    }
  }

  /* ---------- əsas kart ---------- */
  function goster(g, alfa, qalx, f) {
    if (alfa <= 0) return;
    g.save(); g.globalAlpha = alfa; g.translate(0, (1 - qalx) * 18); f(); g.restore();
  }
  function kart(g, t, d) {
    g.fillStyle = KAGIZ; g.fillRect(0, 0, W, H);
    var kg = g.createRadialGradient(W / 2, H * 0.4, 100, W / 2, H / 2, H * 0.7);
    kg.addColorStop(0, 'rgba(255,255,255,.18)'); kg.addColorStop(1, 'rgba(120,80,40,.06)');
    g.fillStyle = kg; g.fillRect(0, 0, W, H);
    var ca = ara(t, 4.9, 5.4);
    g.save(); g.globalAlpha = ca; g.strokeStyle = 'rgba(102,23,18,.55)'; g.lineWidth = 2; g.strokeRect(45, 45, W - 90, H - 90);
    g.strokeStyle = 'rgba(102,23,18,.3)'; g.lineWidth = 1.2; g.strokeRect(57, 57, W - 114, H - 114); g.restore();
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    var cx = W / 2, maxEn = W - 220;

    // HER SOCIETY PRESENTS
    var a = cix(ara(t, 5.3, 5.9));
    goster(g, a, a, function () { g.fillStyle = MUREKKEB; g.font = '600 25px ' + ADSIZ; aralikli(g, 'HER SOCIETY PRESENTS', cx, 212, 9); });
    // Başlıq (soldan sağa açılır)
    var b = ara(t, 5.9, 6.8);
    if (b > 0) {
      g.save(); g.beginPath(); g.rect(0, 200, 80 + (W - 160) * yum(b), 260); g.clip();
      g.fillStyle = BORDO; sigdir(g, d.basliq, '{o}px HSPinyon', 168, W - 160); g.fillText(d.basliq, cx, 395);
      g.restore();
    }
    // Mövzu
    var m = cix(ara(t, 6.7, 7.3));
    if (d.movzu) goster(g, m, m, function () { g.fillStyle = MUREKKEB; sigdir(g, d.movzu, 'italic 500 {o}px ' + ADSIZ, 48, maxEn); g.fillText(d.movzu, cx, 565); });
    // Fincanlar
    var f = ara(t, 7.2, 8.6);
    if (f > 0) {
      g.save(); g.strokeStyle = MUREKKEB; g.lineWidth = 4.2; g.lineCap = 'round'; g.lineJoin = 'round';
      xettCiz(g, FINCAN, yum(f), false); xettCiz(g, FINCAN, yum(f), true);
      // buxar
      var bx = ara(t, 8.0, 8.9);
      if (bx > 0) {
        var faz = t * 1.6;
        [[480, 1], [600, -1]].forEach(function (s) {
          var p = [];
          for (var i = 0; i <= 40; i++) { var k = i / 40; p.push([s[0] + Math.sin(k * Math.PI * 3 + faz * s[1]) * 9, lerp(708, 610, k)]); }
          xettCiz(g, [p], yum(bx), false);
        });
      }
      g.restore();
      // fiyonklar
      var fy = cix(ara(t, 8.5, 9.1));
      if (fy > 0) {
        g.save(); g.strokeStyle = QIRMIZI; g.lineWidth = 3.4; g.lineCap = 'round';
        xettCiz(g, FIYONK, fy, false); xettCiz(g, FIYONK, fy, true);
        g.fillStyle = QIRMIZI; g.globalAlpha = fy;
        g.beginPath(); g.arc(276, 852, 6, 0, Math.PI * 2); g.arc(W - 276, 852, 6, 0, Math.PI * 2); g.fill();
        g.restore();
      }
      // ulduz və artılar
      var u = cix(ara(t, 8.7, 9.3));
      if (u > 0) {
        var dondur = t * 0.35, parilti = 0.85 + 0.15 * Math.sin(t * 3.2);
        g.save(); g.translate(540, 744); g.rotate(dondur); g.scale(u * parilti, u * parilti);
        g.strokeStyle = QIRMIZI; g.lineWidth = 3; g.lineCap = 'round';
        for (var r = 0; r < 4; r++) { g.rotate(Math.PI / 4); g.beginPath(); g.moveTo(-r % 2 * 10 - 38, 0); g.lineTo(r % 2 * 10 + 38, 0); g.stroke(); }
        g.restore();
        [[376, 704], [712, 700]].forEach(function (p, i) {
          var pa = u * (0.55 + 0.45 * Math.sin(t * 2.4 + i * 2));
          g.save(); g.globalAlpha = pa; g.strokeStyle = 'rgba(91,21,16,.75)'; g.lineWidth = 2.4;
          g.beginPath(); g.moveTo(p[0] - 17, p[1]); g.lineTo(p[0] + 17, p[1]); g.moveTo(p[0], p[1] - 17); g.lineTo(p[0], p[1] + 17); g.stroke(); g.restore();
        });
      }
    }
    // Qonaq
    if (d.qonaq) {
      var q = cix(ara(t, 9.4, 10.0));
      goster(g, q, q, function () {
        g.fillStyle = QIRMIZI; g.font = '600 22px ' + ADSIZ; aralikli(g, 'QONAĞIMIZ', cx, 1110, 8);
        g.fillStyle = BORDO; var s = sigdir(g, d.qonaq, '400 {o}px ' + AD_SRIFT, 70, maxEn, 5); aralikli(g, d.qonaq, cx, 1192, 5 * s);
      });
      var qt = cix(ara(t, 9.9, 10.4));
      if (d.titul) goster(g, qt, qt, function () { g.fillStyle = MUREKKEB; sigdir(g, d.titul, 'italic 500 {o}px ' + ADSIZ, 42, maxEn); g.fillText(d.titul, cx, 1268); });
    }
    // Tarix
    var tr = cix(ara(t, 10.5, 11.1));
    goster(g, tr, tr, function () {
      g.strokeStyle = 'rgba(102,23,18,.5)'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(184, 1418); g.lineTo(428, 1418); g.moveTo(184, 1478); g.lineTo(428, 1478);
      g.moveTo(652, 1418); g.lineTo(896, 1418); g.moveTo(652, 1478); g.lineTo(896, 1478); g.stroke();
      g.fillStyle = MUREKKEB; g.font = '600 22px ' + ADSIZ;
      sigdir(g, d.hefte, '600 {o}px ' + ADSIZ, 22, 230, 6, 14); aralikli(g, d.hefte, 306, 1457, 6);
      sigdir(g, d.ay, '600 {o}px ' + ADSIZ, 22, 230, 6, 14); aralikli(g, d.ay, 774, 1457, 6);
      g.fillStyle = BORDO; g.font = '400 150px HSBodoni'; g.fillText(d.gun, cx, 1492);
      g.fillStyle = MUREKKEB; g.font = 'italic 500 34px ' + ADSIZ; g.fillText('saat ' + d.saat, cx, 1545);
    });
    // Məkan
    var mk = cix(ara(t, 11.2, 11.8));
    goster(g, mk, mk, function () {
      g.fillStyle = MUREKKEB; var s = sigdir(g, d.mekan, '600 {o}px ' + ADSIZ, 32, maxEn, 7); aralikli(g, d.mekan, cx, 1622, 7 * s);
      if (d.mekanAlt) { sigdir(g, d.mekanAlt, 'italic 500 {o}px ' + ADSIZ, 30, maxEn); g.fillText(d.mekanAlt, cx, 1668); }
    });
    // Yerlər məhduddur
    var y = cix(ara(t, 11.9, 12.5));
    goster(g, y, y, function () {
      g.fillStyle = QIRMIZI; g.font = '600 21px ' + ADSIZ; aralikli(g, 'YERLƏR MƏHDUDDUR', cx, 1748, 8);
      g.fillStyle = MUREKKEB; g.font = 'italic 500 34px ' + ADSIZ; g.fillText('Yerinizi ayırmaq üçün bizə yazın', cx, 1797);
    });
  }

  /* ---------- son səhnə ---------- */
  function son(g, t) {
    var p = yum(ara(t, 17.4, 18.0));
    if (p <= 0) return;
    var y0 = H * (1 - p);
    g.fillStyle = '#621812'; g.fillRect(0, y0, W, H - y0);
    g.textAlign = 'center';
    var l = cix(ara(t, 18.0, 18.8));
    if (l > 0) {
      g.save(); g.globalAlpha = l; g.translate(0, (1 - l) * 14);
      g.fillStyle = '#F3E6D2'; g.font = '400 168px HSBodoni'; aralikli(g, 'HER', W / 2, 850, 6);
      g.font = '118px HSPinyon'; g.fillText('Society', W / 2 + 40, 918);
      g.font = '600 25px ' + ADSIZ; g.fillStyle = 'rgba(243,230,210,.85)'; aralikli(g, 'GIRLY TEA TALKS', W / 2, 1020, 10);
      g.restore();
    }
    var s = cix(ara(t, 18.7, 19.3));
    if (s > 0) {
      g.save(); g.globalAlpha = s; g.fillStyle = '#F3E6D2'; g.font = 'italic 500 46px ' + ADSIZ; g.fillText('Sizi aramızda görməyə şad olarıq', W / 2, 1222);
      var at = cix(ara(t, 19.0, 19.5)); g.globalAlpha = at; g.font = '600 22px ' + ADSIZ; g.fillStyle = 'rgba(243,230,210,.8)'; aralikli(g, '@hersociety.az', W / 2, 1286, 6);
      g.restore();
    }
  }

  HS.videoCiz = function (g, t, ev) {
    var d = ev._v || (ev._v = hazirla(ev));
    g.save();
    if (t < 4.95) { fon(g); zerf(g, t, d); }
    else kart(g, t, d);
    son(g, t);
    g.restore();
  };
  HS.VIDEO = { W: W, H: H, FPS: FPS, MUDDET: MUDDET };

  HS.videoSriftler = function () {
    return Promise.all([
      document.fonts.load('400 120px HSPinyon'), document.fonts.load('500 40px HSCG'), document.fonts.load('italic 500 40px HSCG'),
      document.fonts.load('600 20px HSCG'), document.fonts.load('400 92px HSBodoni'),
      document.fonts.load('400 70px "Playfair Display"').catch(function () {})
    ]);
  };

  /* ---------- MP4 (H.264) yığıcı ---------- */
  function MP4(w, h, timescale) {
    this.w = w; this.h = h; this.ts = timescale; this.nm = []; this.desc = null;
  }
  function u32(n) { return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]; }
  function u16(n) { return [(n >>> 8) & 255, n & 255]; }
  function str(s) { return s.split('').map(function (c) { return c.charCodeAt(0); }); }
  function box(type) {
    var parts = [].slice.call(arguments, 1), len = 8, i;
    parts = parts.map(function (p) { return p instanceof Uint8Array ? p : new Uint8Array(p); });
    for (i = 0; i < parts.length; i++) len += parts[i].length;
    var out = new Uint8Array(len), o = 8;
    out.set(u32(len), 0); out.set(str(type), 4);
    for (i = 0; i < parts.length; i++) { out.set(parts[i], o); o += parts[i].length; }
    return out;
  }
  function full(type, v, f) { return box.apply(null, [type, [v].concat(u32(f).slice(1))].concat([].slice.call(arguments, 3))); }
  var MATRIX = [].concat(u32(0x10000), u32(0), u32(0), u32(0), u32(0x10000), u32(0), u32(0), u32(0), u32(0x40000000));
  MP4.prototype.elave = function (data, key, pts, dur) { this.nm.push({ data: data, key: key, pts: pts, dur: dur }); };
  MP4.prototype.bitir = function () {
    var s = this.nm, n = s.length, i, ts = this.ts;
    var dur = 0; s.forEach(function (x) { dur += x.dur; });
    var sorted = s.map(function (x) { return x.pts; }).sort(function (a, b) { return a - b; });
    var ctts = [], lazim = false;
    for (i = 0; i < n; i++) { var o = s[i].pts - sorted[i]; if (o) lazim = true; ctts.push(o); }
    var ftyp = box('ftyp', str('isom'), u32(512), str('isom'), str('iso2'), str('avc1'), str('mp41'));
    var mdatLen = 8; s.forEach(function (x) { mdatLen += x.data.length; });
    var mdat = new Uint8Array(mdatLen); mdat.set(u32(mdatLen), 0); mdat.set(str('mdat'), 4);
    var off = 8; s.forEach(function (x) { mdat.set(x.data, off); off += x.data.length; });
    var dataStart = ftyp.length + 8;
    var movDur = Math.round(dur / ts * 1000);
    var stts = [], last = null;
    s.forEach(function (x) { if (last && last[1] === x.dur) last[0]++; else { last = [1, x.dur]; stts.push(last); } });
    var sttsB = full.apply(null, ['stts', 0, 0, u32(stts.length)].concat(stts.map(function (e) { return u32(e[0]).concat(u32(e[1])); })));
    var keys = []; s.forEach(function (x, j) { if (x.key) keys.push(j + 1); });
    var stssB = full.apply(null, ['stss', 0, 0, u32(keys.length)].concat(keys.map(u32)));
    var stszB = full.apply(null, ['stsz', 0, 0, u32(0), u32(n)].concat(s.map(function (x) { return u32(x.data.length); })));
    var stscB = full('stsc', 0, 0, u32(1), u32(1), u32(n), u32(1));
    var stcoB = full('stco', 0, 0, u32(1), u32(dataStart));
    var cttsB = lazim ? full.apply(null, ['ctts', 1, 0, u32(n)].concat(ctts.map(function (c) { return u32(1).concat(u32(c >>> 0)); }))) : new Uint8Array(0);
    var avc1 = box('avc1', new Array(6).fill(0), u16(1), u16(0), u16(0), u32(0), u32(0), u32(0), u16(this.w), u16(this.h),
      u32(0x00480000), u32(0x00480000), u32(0), u16(1), new Array(32).fill(0), u16(0x18), u16(0xffff), box('avcC', this.desc));
    var stsd = full('stsd', 0, 0, u32(1), avc1);
    var stbl = box('stbl', stsd, sttsB, stssB, cttsB, stscB, stszB, stcoB);
    var minf = box('minf', full('vmhd', 0, 1, u16(0), u16(0), u16(0), u16(0)), box('dinf', full('dref', 0, 0, u32(1), full('url ', 0, 1))), stbl);
    var mdhd = full('mdhd', 0, 0, u32(0), u32(0), u32(ts), u32(dur), u16(0x55c4), u16(0));
    var hdlr = full('hdlr', 0, 0, u32(0), str('vide'), u32(0), u32(0), u32(0), str('VideoHandler'), [0]);
    var tkhd = full('tkhd', 0, 3, u32(0), u32(0), u32(1), u32(0), u32(movDur), u32(0), u32(0), u16(0), u16(0), u16(0), u16(0), MATRIX, u32(this.w << 16), u32(this.h << 16));
    var trak = box('trak', tkhd, box('mdia', mdhd, hdlr, minf));
    var mvhd = full('mvhd', 0, 0, u32(0), u32(0), u32(1000), u32(movDur), u32(0x10000), u16(0x100), u16(0), u32(0), u32(0), MATRIX, new Array(24).fill(0), u32(2));
    var moov = box('moov', mvhd, trak);
    return new Blob([ftyp, mdat, moov], { type: 'video/mp4' });
  };

  /* ---------- videonu yarat ---------- */
  function kodekSec() {
    var list = ['avc1.640028', 'avc1.4d0028', 'avc1.42e028', 'avc1.640033', 'avc1.42e033'];
    var i = 0;
    function yoxla() {
      if (i >= list.length) return Promise.resolve(null);
      var c = { codec: list[i], width: W, height: H, bitrate: 9000000, framerate: FPS, avc: { format: 'avc' }, latencyMode: 'quality' };
      return VideoEncoder.isConfigSupported(c).then(function (r) { if (r.supported) return c; i++; return yoxla(); }).catch(function () { i++; return yoxla(); });
    }
    return yoxla();
  }

  function webcodecs(ev, irelileme) {
    return kodekSec().then(function (conf) {
      if (!conf) throw new Error('kodek');
      var c = document.createElement('canvas'); c.width = W; c.height = H;
      var g = c.getContext('2d', { alpha: false });
      var mux = new MP4(W, H, 30000), xeta = null;
      var enc = new VideoEncoder({
        output: function (chunk, meta) {
          if (meta && meta.decoderConfig && meta.decoderConfig.description && !mux.desc) {
            var d = meta.decoderConfig.description; mux.desc = new Uint8Array(d.buffer ? d.buffer.slice(d.byteOffset || 0, (d.byteOffset || 0) + d.byteLength) : d);
          }
          var b = new Uint8Array(chunk.byteLength); chunk.copyTo(b);
          mux.elave(b, chunk.type === 'key', Math.round(chunk.timestamp * 30000 / 1e6), 1000);
        },
        error: function (e) { xeta = e; }
      });
      enc.configure(conf);
      var n = FPS * MUDDET, i = 0;
      return new Promise(function (res, rej) {
        function addim() {
          if (xeta) return rej(xeta);
          var t0 = performance.now();
          while (i < n && enc.encodeQueueSize < 4 && performance.now() - t0 < 30) {
            HS.videoCiz(g, i / FPS, ev);
            var fr = new VideoFrame(c, { timestamp: Math.round(i * 1e6 / FPS), duration: Math.round(1e6 / FPS) });
            enc.encode(fr, { keyFrame: i % (FPS * 2) === 0 }); fr.close(); i++;
            if (irelileme) irelileme(i / n);
          }
          if (i < n) setTimeout(addim, enc.encodeQueueSize >= 4 ? 8 : 0);
          else enc.flush().then(function () { enc.close(); if (!mux.desc) throw new Error('avcC'); res(mux.bitir()); }).catch(rej);
        }
        addim();
      });
    });
  }

  // Ehtiyat yol: real vaxtda yazmaq (köhnə brauzerlər)
  function recorder(ev, irelileme) {
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var g = c.getContext('2d', { alpha: false });
    var tipler = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
    var tip = tipler.filter(function (x) { return window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(x); })[0];
    if (!tip || !c.captureStream) return Promise.reject(new Error('dəstək yoxdur'));
    var st = c.captureStream(FPS), rec = new MediaRecorder(st, { mimeType: tip, videoBitsPerSecond: 9000000 }), parca = [];
    rec.ondataavailable = function (e) { if (e.data.size) parca.push(e.data); };
    return new Promise(function (res) {
      rec.onstop = function () { res(new Blob(parca, { type: tip.split(';')[0] })); };
      HS.videoCiz(g, 0, ev); rec.start();
      var bas = performance.now();
      (function kadr() {
        var t = (performance.now() - bas) / 1000;
        HS.videoCiz(g, Math.min(t, MUDDET), ev); if (irelileme) irelileme(Math.min(1, t / MUDDET));
        if (t < MUDDET) requestAnimationFrame(kadr); else setTimeout(function () { rec.stop(); }, 120);
      })();
    });
  }

  HS.videoYarat = function (ev, irelileme) {
    ev._v = null;
    return HS.videoSriftler().then(function () {
      if (window.VideoEncoder && window.VideoFrame) return webcodecs(ev, irelileme).catch(function (x) { console.warn('WebCodecs alınmadı', x); return recorder(ev, irelileme); });
      return recorder(ev, irelileme);
    });
  };

  // Canlı önizləmə (kodlaşdırmadan)
  HS.videoOynat = function (canvas, ev) {
    ev._v = null;
    var g = canvas.getContext('2d'), bas = null, dayan = false;
    canvas.width = W; canvas.height = H;
    HS.videoSriftler().then(function () {
      (function kadr(now) {
        if (dayan) return;
        if (bas === null) bas = now;
        var t = ((now - bas) / 1000) % (MUDDET + 0.5);
        HS.videoCiz(g, Math.min(t, MUDDET), ev);
        requestAnimationFrame(kadr);
      })(performance.now());
    });
    return function () { dayan = true; };
  };
})();
