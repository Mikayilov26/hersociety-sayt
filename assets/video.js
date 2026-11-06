// HER Society — görüş anons videosu. Prototip 5 (21 noyabr v3) dəvətnaməsinin dəqiq köçürməsi:
// eyni ölçülər, rənglər, şriftlər və zamanlama; yalnız yazılar görüş məlumatından gəlir. 1080×1920, 30 kadr/san., 20 san.
(function () {
  var HS = window.HS = window.HS || {};
  var W = 1080, H = 1920, FPS = 30, MUDDET = 20;
  var WINE = '#661712', RED = '#A3241B', CREAM = '#F8F1E4', INK = '#58130F';
  var PF = '"Playfair Display"';

  /* ---------- zamanlama funksiyaları (orijinaldakı kimi) ---------- */
  function cl(x) { return Math.max(0, Math.min(1, x)); }
  function p(t, a, d) { return cl((t - a) / d); }
  function eo(x) { return 1 - Math.pow(1 - x, 3); }
  function eio(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function back(x) { var c = 1.6; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }
  function lerp(a, b, x) { return a + (b - a) * x; }

  var FILTER = (function () { try { var c = document.createElement('canvas').getContext('2d'); c.filter = 'blur(2px)'; return c.filter === 'blur(2px)'; } catch (x) { return false; } })();

  /* ---------- mətn (CSS letter-spacing və padding-left kimi) ---------- */
  function boyukAz(s) { return String(s || '').toLocaleUpperCase('az'); }
  function boyukMekan(s) { s = String(s || ''); return /[əğışçöüƏĞİŞÇÖÜ]/.test(s) ? s.toLocaleUpperCase('az') : s.toUpperCase(); }
  // font: '600 {o}px HSCG'; ls, pad: em ilə; maxEn: sığmasa şrift kiçilir
  function yaz(g, metn, font, olcu, x, y, ls, pad, maxEn) {
    if (!metn) return;
    var o = olcu, en, w;
    for (;;) {
      g.font = font.replace('{o}', o);
      if (!ls) { en = g.measureText(metn).width; }
      else { w = []; en = 0; for (var i = 0; i < metn.length; i++) { w[i] = g.measureText(metn[i]).width; en += w[i] + ls * o; } }
      if (!maxEn || en + (pad || 0) * o <= maxEn || o <= olcu * 0.5) break;
      o -= 1;
    }
    g.textAlign = 'left';
    if (!ls) { g.fillText(metn, x - en / 2, y); return; }
    var bas = x - (en + (pad || 0) * o) / 2 + (pad || 0) * o;
    for (var j = 0; j < metn.length; j++) { g.fillText(metn[j], bas, y); bas += w[j] + ls * o; }
  }
  // fadeUp(el,t,a,d,dy): şəffaflıq, aşağıdan qalxma və bulanıqlıq
  function fadeUp(g, t, a, d, dy, f) {
    var x = eo(p(t, a, d || 0.8));
    if (x <= 0) return;
    g.save(); g.globalAlpha *= x; g.translate(0, (1 - x) * (dy == null ? 26 : dy));
    if (FILTER && x < 1) g.filter = 'blur(' + ((1 - x) * 6).toFixed(2) + 'px)';
    f(); g.restore();
  }

  /* ---------- məlumat ---------- */
  function hazirla(ev) {
    var t = HS.hisseler(ev.starts_at);
    return {
      basliq: ev.title || 'Çay Süfrəsi', movzu: ev.topic || '',
      qonaq: boyukAz(ev.guest_name || ''), titul: ev.guest_title || '',
      hefte: boyukAz(t.hefte), gun: String(t.gun), ay: boyukAz(t.ay),
      mekan: boyukMekan(ev.venue || ''), seher: ev.venue_detail || '',
      kartAlt: t.gun + ' ' + boyukAz(t.ay) + (ev.venue ? ' · ' + boyukMekan(ev.venue) : '')
    };
  }

  /* ---------- dən (orijinaldakı feTurbulence qatı) ---------- */
  var den = null;
  function denYarat() {
    var c = document.createElement('canvas'); c.width = W / 2; c.height = H / 2;
    var g = c.getContext('2d'), im = g.createImageData(c.width, c.height), d = im.data, s = 1234567;
    for (var i = 0; i < d.length; i += 4) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      var r = (s >>> 8) / 8388608;
      d[i] = 128; d[i + 1] = 102; d[i + 2] = 89; d[i + 3] = Math.round((0.25 + r * 0.5) * 0.9 * 255);
    }
    g.putImageData(im, 0, 0); return c;
  }

  /* ---------- səhnə 1: zərf ---------- */
  var FLAP = (function () { // M0 0 L380 290 Q390 298 400 290 L780 0Z
    var pts = [[0, 0], [380, 290]];
    for (var i = 1; i <= 8; i++) { var k = i / 8, a = 1 - k; pts.push([a * a * 380 + 2 * a * k * 390 + k * k * 400, a * a * 290 + 2 * a * k * 298 + k * k * 290]); }
    pts.push([780, 0]); return pts;
  })();
  // perspective(1800px) rotateX(-ang), mənşə (390,0) — zərfin qapağı üçün
  function proyeksiya(x, y, ang, ey, es) {
    var X = x - 390, c = Math.cos(ang), s = Math.sin(ang), w = 1 + y * s / 1800;
    return [540 + es * X / w, 820 + ey + es * (y * c) / w, w];
  }
  function cizPoli(g, pts, ang, ey, es) {
    g.beginPath();
    pts.forEach(function (q, i) { var r = proyeksiya(q[0], q[1], ang, ey, es); if (i) g.lineTo(r[0], r[1]); else g.moveTo(r[0], r[1]); });
    g.closePath();
  }
  function daire(cx, cy, r) { var a = []; for (var i = 0; i < 48; i++) { var u = i / 48 * Math.PI * 2; a.push([cx + Math.cos(u) * r, cy + Math.sin(u) * r]); } return a; }
  var MOHUR = daire(390, 262, 50), HALQA = daire(390, 262, 40);

  function kart(g, d, t, cy, S, alfa, fwd) {
    // #card: 195,850 690×470, mərkəz (540,1085)
    g.save(); g.globalAlpha = alfa;
    g.translate(540, 1085 + cy); g.scale(S, S); g.translate(-540, -1085);
    g.save();
    g.shadowColor = 'rgba(20,0,0,' + (0.15 + fwd * 0.25) + ')'; g.shadowBlur = (12 + fwd * 60) * S; g.shadowOffsetY = (4 + fwd * 36) * S;
    g.fillStyle = '#FBF6EE'; yuvarlaq(g, 195, 850, 690, 470, 3); g.fill(); g.restore();
    var ta = 1 - p(t, 4.25, 0.35);
    if (ta > 0) {
      g.globalAlpha = alfa * ta;
      g.fillStyle = RED; yaz(g, 'HER SOCIETY', '600 {o}px HSCG', 20, 540, 938, 0.42, 0.42, 640);
      g.fillStyle = WINE; yaz(g, d.basliq, '{o}px HSPinyon', 104, 540, 1041, 0, 0, 640);
      g.fillStyle = INK; yaz(g, d.kartAlt, '600 {o}px HSCGL', 22, 540, 1114, 0.32, 0.32, 640);
    }
    g.restore();
  }
  function yuvarlaq(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function sahne1(g, t, d) {
    // fon: radial-gradient(ellipse at 50% 48%, #7d2019 0%, #661712 48%, #430d0a 100%) — farthest-corner
    var cx = 540, cy = 0.48 * H, rx = Math.SQRT2 * 540, ry = Math.SQRT2 * Math.max(cy, H - cy);
    g.save(); g.translate(cx, cy); g.scale(1, ry / rx);
    var gr = g.createRadialGradient(0, 0, 0, 0, 0, rx); gr.addColorStop(0, '#7d2019'); gr.addColorStop(0.48, '#661712'); gr.addColorStop(1, '#430d0a');
    g.fillStyle = gr; g.fillRect(-cx, -cy * rx / ry, W, H * rx / ry); g.restore();
    if (t > 5.3) return;

    var enter = eo(p(t, 0, 0.9)), envO = p(t, 0, 0.45);
    var ang = eio(p(t, 0.9, 0.9)) * Math.PI;
    var rise = eio(p(t, 1.85, 1.4)), fwd = eio(p(t, 3.3, 0.8)), sink = eio(p(t, 3.45, 1.0)), zoom = eio(p(t, 4.25, 1.0));
    var ey = (1 - enter) * 140 + sink * 1250, es = lerp(0.9, 1, enter);
    var cardY = -rise * 520 + fwd * 395 + (1 - enter) * 140;
    var S = lerp(1, 1.06, fwd) * lerp(1, 4.3, zoom) * es;
    if (envO <= 0) return;

    // #back (z1)
    g.save(); g.globalAlpha = envO;
    g.translate(540, 1090 + ey); g.scale(es, es); g.translate(-540, -1090);
    var dx = Math.sin(170 * Math.PI / 180), dy = -Math.cos(170 * Math.PI / 180), L = 780 * Math.abs(dx) + 540 * Math.abs(dy);
    var lg = g.createLinearGradient(540 - dx * L / 2, 1090 - dy * L / 2, 540 + dx * L / 2, 1090 + dy * L / 2);
    lg.addColorStop(0, '#efe3cf'); lg.addColorStop(1, '#ddccb1');
    g.shadowColor = 'rgba(20,0,0,.5)'; g.shadowBlur = 90 * es; g.shadowOffsetY = 50 * es;
    g.fillStyle = lg; yuvarlaq(g, 150, 820, 780, 540, 6); g.fill();
    g.restore();
    // #flapI (z1) — açıq qapaq
    if (ang > Math.PI / 2) {
      g.save(); g.globalAlpha = envO; g.fillStyle = '#e4d4ba';
      cizPoli(g, FLAP, ang, ey, es); g.fill(); g.restore();
    }
    // #card (z2) — cibin arxasında
    if (fwd <= 0) kart(g, d, t, cardY, S, envO, fwd);
    // #pocket (z4)
    g.save(); g.globalAlpha = envO;
    g.translate(540, 1090 + ey); g.scale(es, es); g.translate(150 - 540, 820 - 1090);
    g.fillStyle = '#ead9c0'; g.beginPath(); g.moveTo(0, 0); g.lineTo(400, 300); g.lineTo(0, 540); g.closePath(); g.fill();
    g.fillStyle = '#e3d1b5'; g.beginPath(); g.moveTo(780, 0); g.lineTo(380, 300); g.lineTo(780, 540); g.closePath(); g.fill();
    var pg = g.createLinearGradient(0, 250, 0, 540); pg.addColorStop(0, '#f3e8d6'); pg.addColorStop(1, '#e6d6bd');
    g.fillStyle = pg; g.beginPath(); g.moveTo(0, 540); g.lineTo(390, 250); g.lineTo(780, 540); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(90,40,20,.12)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 540); g.lineTo(390, 250); g.lineTo(780, 540); g.stroke();
    g.restore();
    // #flapO (z5) — bağlı qapaq və möhür
    if (ang <= Math.PI / 2) {
      g.save(); g.globalAlpha = envO;
      g.fillStyle = '#f1e5d2'; cizPoli(g, FLAP, ang, ey, es); g.fill();
      g.strokeStyle = 'rgba(90,40,20,.10)'; g.lineWidth = 2; g.stroke();
      g.fillStyle = WINE; cizPoli(g, MOHUR, ang, ey, es); g.fill();
      g.strokeStyle = '#8a2a22'; g.lineWidth = 3; cizPoli(g, HALQA, ang, ey, es); g.stroke();
      var m = proyeksiya(390, 262, ang, ey, es), sy = Math.cos(ang);
      if (sy > 0.02) {
        g.translate(m[0], m[1]); g.scale(es / m[2], es * sy / m[2]);
        g.fillStyle = '#efe3cf'; g.font = '400 62px HSBodoni96'; g.textAlign = 'center'; g.fillText('H', 0, 22);
      }
      g.restore();
    }
    // #card (z7) — öndə
    if (fwd > 0) kart(g, d, t, cardY, S, envO, fwd);
  }

  /* ---------- səhnə 2: dəvətnamə ---------- */
  var DRAW = [ // [path, en, qrup]
    ['M248 120 C230 95 262 82 246 56 C236 40 252 28 248 14', 3, 0],
    ['M352 120 C370 95 338 82 354 56 C364 40 348 28 352 14', 3, 0]
  ];
  var FINCAN = [
    ['E 0 0 92 18', 3], ['M-92 0 C-90 80 -48 118 0 118 C48 118 90 80 92 0', 3],
    ['M-66 50 q8 10 16 2 q8 10 16 2 q8 10 16 2 q8 10 16 2 q8 10 16 2 q8 10 16 2 q8 10 16 2 q8 10 16 -2', 1.6],
    ['M-6 84 c-10 -12 -2 -22 6 -14 c8 -8 16 2 6 14 c-4 4 -8 4 -12 0z M0 88 v12', 1.8],
    ['QULP', 3], ['M-30 118 Q0 132 30 118', 3], ['E 0 124 36 7', 3]
  ];
  [1, 2].forEach(function (q) {
    FINCAN.forEach(function (f) {
      var d = f[0];
      if (d === 'QULP') d = q === 1 ? 'M-89 20 C-135 12 -138 70 -76 72' : 'M89 20 C135 12 138 70 76 72';
      DRAW.push([d, f[1], q]);
    });
  });
  var olculer = null;
  function ellipsYol(cx, cy, rx, ry) { // SVG ellipse yolu (3 o'clock-dan başlayır, saat əqrəbi istiqamətində)
    return 'M' + (cx + rx) + ' ' + cy + ' A' + rx + ' ' + ry + ' 0 1 1 ' + (cx - rx) + ' ' + cy + ' A' + rx + ' ' + ry + ' 0 1 1 ' + (cx + rx) + ' ' + cy;
  }
  function hazirlaYollar() {
    if (olculer) return;
    var ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', 0); svg.setAttribute('height', 0); svg.style.position = 'absolute'; svg.style.left = '-9999px';
    document.body.appendChild(svg);
    olculer = DRAW.map(function (x) {
      var d = x[0];
      if (d[0] === 'E') { var a = d.split(' ').slice(1).map(Number); d = ellipsYol(a[0], a[1], a[2], a[3]); }
      // ürək iki alt yoldan ibarətdir — ayrı ölçülür ki, xətt ardıcıl çəkilsin
      var hisseler = d.split(/(?=M)/).map(function (h) {
        var el = document.createElementNS(ns, 'path'); el.setAttribute('d', h); svg.appendChild(el);
        var L = el.getTotalLength(); return { p: new Path2D(h), L: L };
      });
      return { h: hisseler, L: hisseler.reduce(function (s, h) { return s + h.L; }, 0), w: x[1], q: x[2] };
    });
    svg.remove();
  }
  function cizgi(g, k) { // bütün çəkilən xətlər, k[i] = 0..1
    g.strokeStyle = WINE; g.lineCap = 'round'; g.lineJoin = 'round';
    olculer.forEach(function (o, i) {
      if (k[i] <= 0) return;
      g.save();
      if (o.q === 1) { g.translate(205, 235); g.rotate(14 * Math.PI / 180); }
      if (o.q === 2) { g.translate(395, 235); g.rotate(-14 * Math.PI / 180); }
      g.lineWidth = o.w;
      var qalan = o.L * k[i];
      o.h.forEach(function (h) {
        if (qalan <= 0) return;
        var u = Math.min(qalan, h.L); qalan -= u;
        if (u >= h.L - 0.01) g.setLineDash([]); else g.setLineDash([u, h.L + 10]);
        g.stroke(h.p);
      });
      g.restore();
    });
  }
  var BOW = [new Path2D('M0 0 C-30 -26 -42 6 0 0Z'), new Path2D('M0 0 C30 -26 42 6 0 0Z')], BOWL = [new Path2D('M0 0 C-8 16 -14 28 -22 40'), new Path2D('M0 0 C6 16 12 28 22 38')];
  function fiyonk(g, x, y, s, a) {
    if (a <= 0 || s <= 0) return;
    g.save(); g.globalAlpha *= a; g.translate(x, y); g.scale(s, s);
    g.strokeStyle = RED; g.lineWidth = 3; g.lineCap = 'round'; g.lineJoin = 'round'; g.setLineDash([]);
    BOW.forEach(function (b) { g.fillStyle = 'rgba(163,36,27,.12)'; g.fill(b); g.stroke(b); });
    BOWL.forEach(function (b) { g.stroke(b); });
    g.fillStyle = RED; g.beginPath(); g.arc(0, 0, 5, 0, Math.PI * 2); g.fill(); g.stroke();
    g.restore();
  }
  function sahne2(g, T, d) {
    var a = p(T, 4.8, 0.45);
    if (a <= 0) return;
    var t = T - 0.4;
    g.save(); g.globalAlpha = a;
    var sc = lerp(1, 1.025, p(T, 5.3, 10));
    g.translate(540, 960); g.scale(sc, sc); g.translate(-540, -960);
    g.fillStyle = CREAM; g.fillRect(0, 0, W, H);
    g.strokeStyle = WINE; g.lineWidth = 2; g.strokeRect(55, 55, 970, 1810);
    g.strokeStyle = 'rgba(102,23,18,.45)'; g.lineWidth = 1; g.strokeRect(68.5, 68.5, 943, 1783);
    var maxEn = 900;

    fadeUp(g, t, 5.0, 0.8, 26, function () { g.fillStyle = INK; yaz(g, 'HER SOCIETY PRESENTS', '600 {o}px HSCG', 30, 540, 228, 0.38, 0, maxEn); });
    var tw = eio(p(t, 5.3, 1.5));
    if (tw > 0) { g.save(); g.beginPath(); g.rect(0, 0, W * tw, H); g.clip(); g.fillStyle = WINE; yaz(g, d.basliq, '{o}px HSPinyon', 178, 540, 408, 0, 0, 940); g.restore(); }
    if (d.movzu) fadeUp(g, t, 6.3, 0.8, 26, function () { g.fillStyle = INK; yaz(g, d.movzu, 'italic 500 {o}px HSCG', 54, 540, 572, 0, 0, maxEn); });

    // illüstrasiya (#ill: 240,600)
    g.save(); g.translate(240, 600);
    var dp = eio(p(t, 6.6, 1.9));
    cizgi(g, olculer.map(function (o, i) { return cl(dp * 1.25 - i * 0.012); }));
    [[92, 262], [508, 262]].forEach(function (b, i) { var x = back(p(t, 8.2 + i * 0.15, 0.6)); fiyonk(g, b[0], b[1], Math.max(0, x), cl(x * 2)); });
    var sp = back(p(t, 8.5, 0.6));
    if (sp > 0) {
      g.save(); g.globalAlpha *= cl(sp * 2); g.translate(300, 150); g.scale(Math.max(0, sp), Math.max(0, sp)); g.rotate((t - 8.5) * 20 * Math.PI / 180);
      g.strokeStyle = RED; g.lineCap = 'round'; g.setLineDash([]);
      g.lineWidth = 2.5; g.beginPath(); g.moveTo(0, -34); g.lineTo(0, 34); g.moveTo(-34, 0); g.lineTo(34, 0); g.stroke();
      g.lineWidth = 1.6; g.beginPath(); g.moveTo(-12, -12); g.lineTo(12, 12); g.moveTo(12, -12); g.lineTo(-12, 12); g.stroke();
      g.restore();
    }
    var s2 = p(t, 8.7, 0.5) * (0.6 + 0.4 * Math.sin(t * 4));
    if (s2 > 0) {
      g.save(); g.globalAlpha *= s2; g.strokeStyle = WINE; g.lineWidth = 2; g.lineCap = 'round'; g.setLineDash([]);
      g.beginPath(); g.moveTo(140, 94); g.lineTo(140, 126); g.moveTo(124, 110); g.lineTo(156, 110);
      g.moveTo(468, 90); g.lineTo(468, 118); g.moveTo(454, 104); g.lineTo(482, 104); g.stroke(); g.restore();
    }
    g.restore();

    if (d.qonaq) {
      fadeUp(g, t, 8.9, 0.8, 26, function () { g.fillStyle = RED; yaz(g, 'QONAĞIMIZ', '600 {o}px HSCG', 24, 540, 1112, 0.38, 0, maxEn); });
      fadeUp(g, t, 9.1, 0.8, 26, function () {
        g.fillStyle = WINE; g.font = '400 76px ' + PF + ', HSCG';
        var m = g.measureText(d.qonaq), A = m.fontBoundingBoxAscent || 76 * 1.082;
        yaz(g, d.qonaq, '400 {o}px ' + PF + ', HSCG', 76, 540, 1128 + A, 0.07, 0, 920);
      });
      if (d.titul) fadeUp(g, t, 9.35, 0.8, 26, function () { g.fillStyle = INK; yaz(g, d.titul, 'italic 500 {o}px HSCG', 46, 540, 1279, 0, 0, maxEn); });
    }
    fadeUp(g, t, 10.1, 0.9, 26, function () {
      g.strokeStyle = WINE; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(190, 1410.75); g.lineTo(430, 1410.75); g.moveTo(190, 1469.25); g.lineTo(430, 1469.25);
      g.moveTo(650, 1410.75); g.lineTo(890, 1410.75); g.moveTo(650, 1469.25); g.lineTo(890, 1469.25); g.stroke();
      g.fillStyle = INK;
      yaz(g, d.hefte, '600 {o}px HSCG', 28, 310, 1448, 0.3, 0, 236);
      yaz(g, d.ay, '600 {o}px HSCG', 28, 770, 1448, 0.3, 0, 236);
      g.fillStyle = WINE; yaz(g, d.gun, '400 {o}px HSBodoni96', 150, 540, 1480, 0, 0, 200);
    });
    fadeUp(g, t, 10.6, 0.8, 26, function () { g.fillStyle = INK; yaz(g, d.mekan, '600 {o}px HSCG', 34, 540, 1601, 0.28, 0.28, maxEn); });
    if (d.seher) fadeUp(g, t, 10.8, 0.8, 26, function () { g.globalAlpha *= 0.85; g.fillStyle = INK; yaz(g, d.seher, 'italic 400 {o}px HSCG', 34, 540, 1653, 0, 0, maxEn); });
    fadeUp(g, t, 11.1, 0.8, 26, function () {
      g.fillStyle = RED; yaz(g, 'YERLƏR MƏHDUDDUR', '700 {o}px HSCG', 22, 540, 1732, 0.42, 0.42, maxEn);
      g.fillStyle = INK; yaz(g, 'Yerinizi ayırmaq üçün bizə yazın', 'italic 500 {o}px HSCG', 40, 540, 1785, 0, 0, maxEn);
    });
    g.restore();
  }

  /* ---------- səhnə 3: son ---------- */
  function sahne3(g, T) {
    var t = T - 0.4, w = eio(p(t, 15.4, 0.9));
    if (w <= 0) return;
    g.save();
    g.beginPath(); g.rect(0, (1 - w) * H, W, H); g.clip();
    g.fillStyle = WINE; g.fillRect(0, 0, W, H);
    var sc = lerp(1, 1.04, p(t, 15.9, 2.6));
    g.translate(540, 992.5); g.scale(sc, sc); g.translate(-540, -992.5);
    g.fillStyle = '#F3E6D2';
    fadeUp(g, t, 15.9, 0.9, 30, function () { yaz(g, 'HER', '400 {o}px HSBodoni96', 190, 540, 864, 0.06, 0); });
    fadeUp(g, t, 16.2, 0.9, 30, function () { yaz(g, 'Society', '{o}px HSPinyon', 150, 540, 920, 0, 0); });
    fadeUp(g, t, 16.6, 0.9, 20, function () { g.globalAlpha *= 0.85; yaz(g, 'GIRLY TEA TALKS', '600 {o}px HSCG', 28, 540, 1026, 0.45, 0.45); });
    fadeUp(g, t, 17.0, 0.9, 20, function () { yaz(g, 'Sizi aramızda görməyə şad olarıq', 'italic 500 {o}px HSCG', 44, 540, 1225, 0, 0); });
    fadeUp(g, t, 17.3, 0.9, 16, function () { g.globalAlpha *= 0.75; yaz(g, '@hersociety.az', '600 {o}px HSCG', 24, 540, 1278, 0.35, 0.35); });
    g.restore();
  }

  HS.videoCiz = function (g, t, ev) {
    var d = ev._v || (ev._v = hazirla(ev));
    hazirlaYollar(); if (!den) den = denYarat();
    g.save(); g.textBaseline = 'alphabetic'; g.setLineDash([]);
    sahne1(g, t, d);
    sahne2(g, t, d);
    sahne3(g, t);
    // dən (grain): opacity .10, multiply
    g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.10; g.drawImage(den, 0, 0, W, H);
    g.restore();
  };
  HS.VIDEO = { W: W, H: H, FPS: FPS, MUDDET: MUDDET };

  HS.videoSriftler = function () {
    return Promise.all([
      document.fonts.load('400 120px HSPinyon'), document.fonts.load('600 40px HSCG'), document.fonts.load('700 40px HSCG'),
      document.fonts.load('italic 500 40px HSCG'), document.fonts.load('italic 400 40px HSCG'), document.fonts.load('600 22px HSCGL'),
      document.fonts.load('400 92px HSBodoni96'),
      document.fonts.load('400 76px ' + PF).catch(function () {})
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
