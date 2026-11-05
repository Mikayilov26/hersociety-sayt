// HER Society — şəxsi dəvət kartı (1080×1920), görüş məlumatından avtomatik
(function () {
  var HS = window.HS = window.HS || {};
  var BORDO = '#661712', QIRMIZI = '#A3241B', MUREKKEB = '#58130F', KAGIZ = '#F5EDE0';
  var aylarQisa = ['YAN', 'FEV', 'MAR', 'APR', 'MAY', 'İYN', 'İYL', 'AVQ', 'SEN', 'OKT', 'NOY', 'DEK'];
  var ALFA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  var B62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  HS.yeniKod = function () {
    var a = new Uint8Array(6); crypto.getRandomValues(a);
    return Array.from(a, function (x) { return ALFA[x % ALFA.length]; }).join('');
  };
  HS.yeniSirr = function () {
    var a = new Uint8Array(24); crypto.getRandomValues(a);
    return Array.from(a, function (x) { return B62[x % 62]; }).join('');
  };
  HS.devetLink = function (sirr) { return 'https://hersociety.az/devet/?k=' + sirr; };
  HS.pad = function (n) { return String(n).padStart(2, '0'); };

  // Böyük hərf (Azərbaycan dili: i → İ)
  HS.boyuk = function (s) { return String(s || '').toLocaleUpperCase('az'); };

  function sekil(src) {
    return new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = rej; i.src = src; });
  }
  var loqo = null;

  function aralikli(g, metn, x, y, araliq, hizala) {
    // Hərflər arası məsafə ilə yaz (Safari letterSpacing dəstəkləməyə bilər)
    var en = 0, i, w = [];
    for (i = 0; i < metn.length; i++) { w[i] = g.measureText(metn[i]).width; en += w[i] + (i < metn.length - 1 ? araliq : 0); }
    var bas = hizala === 'center' ? x - en / 2 : hizala === 'right' ? x - en : x;
    var evvel = g.textAlign; g.textAlign = 'left';
    for (i = 0; i < metn.length; i++) { g.fillText(metn[i], bas, y); bas += w[i] + araliq; }
    g.textAlign = evvel;
  }
  function sigdir(g, metn, srift, olcu, maxEn, min) {
    var o = olcu;
    do { g.font = srift.replace('{o}', o); if (g.measureText(metn).width <= maxEn) break; o -= 2; } while (o > (min || 18));
  }
  function yuvarlaq(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h);
    g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
  }

  HS.kartCiz = function (ev, bilet, kok) {
    kok = kok || '';
    return Promise.all([
      document.fonts.load('400 120px HSPinyon'), document.fonts.load('500 40px HSCG'), document.fonts.load('italic 500 40px HSCG'),
      document.fonts.load('700 20px HSCG'), document.fonts.load('400 92px HSBodoni'),
      loqo || (loqo = sekil(kok + 'assets/loqo-bordo.png'))
    ]).then(function (r) {
      var lg = r[5];
      var c = document.createElement('canvas'); c.width = 1080; c.height = 1920;
      var g = c.getContext('2d');
      // fon
      var gr = g.createRadialGradient(540, 560, 80, 540, 900, 1250);
      gr.addColorStop(0, '#7d2019'); gr.addColorStop(0.55, BORDO); gr.addColorStop(1, '#430d0a');
      g.fillStyle = gr; g.fillRect(0, 0, 1080, 1920);
      g.textBaseline = 'alphabetic'; g.textAlign = 'center';
      g.fillStyle = 'rgba(243,230,210,.85)'; g.font = '600 22px HSCG';
      aralikli(g, 'HER SOCIETY', 540, 85, 14, 'center');
      // bilet
      g.fillStyle = KAGIZ; yuvarlaq(g, 90, 130, 900, 1690, 14); g.fill();
      g.save(); g.globalCompositeOperation = 'destination-out';
      g.beginPath(); g.arc(90, 1380, 34, 0, Math.PI * 2); g.arc(990, 1380, 34, 0, Math.PI * 2); g.fill(); g.restore();
      g.save(); g.globalCompositeOperation = 'destination-over'; g.fillStyle = gr; g.fillRect(0, 0, 1080, 1920); g.restore();
      // ikiqat çərçivə
      g.strokeStyle = BORDO; g.lineWidth = 2.5; g.strokeRect(121, 161, 838, 1178);
      g.strokeStyle = 'rgba(102,23,18,.35)'; g.lineWidth = 1; g.strokeRect(133, 173, 814, 1154);
      // başlıq
      g.fillStyle = QIRMIZI; g.font = '700 21px HSCG';
      aralikli(g, 'ŞƏXSİ DƏVƏT', 540, 250, 11, 'center');
      g.fillStyle = BORDO; sigdir(g, ev.title || 'Çay Süfrəsi', '400 {o}px HSPinyon', 150, 760, 70);
      g.fillText(ev.title || 'Çay Süfrəsi', 540, 400);
      if (ev.topic) {
        g.fillStyle = QIRMIZI; var m = HS.boyuk(ev.topic), olcu = 21;
        g.font = '700 ' + olcu + 'px HSCG';
        while (olcu > 14) { g.font = '700 ' + olcu + 'px HSCG'; var en = g.measureText(m).width + m.length * 9; if (en <= 760) break; olcu--; }
        aralikli(g, m, 540, 485, olcu > 17 ? 9 : 6, 'center');
      }
      // ad və cümlə
      g.fillStyle = MUREKKEB; var ad = 'Hörmətli ' + bilet.name + ',';
      sigdir(g, ad, 'italic 500 {o}px HSCG', 46, 760, 26); g.fillText(ad, 540, 565);
      var cumle = ev.card_note || 'yeriniz ayrıldı — sizi gözləyirik';
      sigdir(g, cumle, 'italic 500 {o}px HSCG', 38, 760, 24); g.fillText(cumle, 540, 618);
      var lw = 132, lh = lw * lg.height / lg.width; g.drawImage(lg, 540 - lw / 2, 640, lw, lh);
      // sətirlər
      var t = HS.hisseler(ev.starts_at);
      var setirler = [
        ['TARİX', HS.boyuk(t.hefte[0]) + t.hefte.slice(1) + ', ' + t.gun + ' ' + t.ay + ' ' + t.il, null],
        ['SAAT', t.saat, null],
        ['MƏKAN', ev.venue || '', ev.venue_detail || ''],
      ];
      if (ev.guest_name) setirler.push(['QONAĞIMIZ', ev.guest_name, ev.guest_title || '']);
      var y = 840;
      setirler.forEach(function (s, i) {
        g.textAlign = 'left';
        g.fillStyle = QIRMIZI; g.font = '700 19px HSCG'; aralikli(g, s[0], 200, y, 7, 'left');
        g.fillStyle = MUREKKEB; sigdir(g, s[1], '500 {o}px HSCG', 40, 470, 24); g.fillText(s[1], 410, y + 2);
        var alt = s[2] ? 42 : 0;
        if (s[2]) { sigdir(g, s[2], 'italic 500 {o}px HSCG', 28, 470, 18); g.fillText(s[2], 410, y + 44); }
        if (i < setirler.length - 1) {
          g.strokeStyle = 'rgba(102,23,18,.22)'; g.lineWidth = 1; g.beginPath(); g.moveTo(200, y + 38 + alt); g.lineTo(880, y + 38 + alt); g.stroke();
        }
        y += 95 + alt + (s[2] ? 14 : 0);
      });
      // kəsik xətt
      g.strokeStyle = 'rgba(102,23,18,.45)'; g.lineWidth = 2; g.setLineDash([9, 7]);
      g.beginPath(); g.moveTo(142, 1380); g.lineTo(938, 1380); g.stroke(); g.setLineDash([]);
      // QR
      var qr = qrcode(0, 'M'); qr.addData(HS.devetLink(bilet.secret)); qr.make();
      var n = qr.getModuleCount(), qx = 174, qy = 1430, qw = 330, pad = 24, olc = (qw - pad * 2) / n;
      g.strokeStyle = 'rgba(102,23,18,.3)'; g.lineWidth = 1.5; yuvarlaq(g, qx, qy, qw, qw, 8); g.stroke();
      g.fillStyle = '#FFFDF8'; g.fillRect(qx + 6, qy + 6, qw - 12, qw - 12);
      g.fillStyle = '#3A0B08';
      for (var a = 0; a < n; a++) for (var b = 0; b < n; b++) if (qr.isDark(a, b)) g.fillRect(Math.floor(qx + pad + b * olc), Math.floor(qy + pad + a * olc), Math.ceil(olc), Math.ceil(olc));
      // sağ sütun
      var cx = 730; g.textAlign = 'center';
      g.fillStyle = QIRMIZI; g.font = '700 20px HSCG'; aralikli(g, 'GİRİŞ KARTI', cx, 1467, 9, 'center');
      g.fillStyle = BORDO; g.font = '400 92px HSBodoni'; g.fillText('№ ' + HS.pad(bilet.num), cx, 1585);
      g.fillStyle = QIRMIZI; g.font = '700 18px HSCG'; aralikli(g, 'KOD', cx - 72, 1626, 5, 'right');
      g.fillStyle = MUREKKEB; g.font = '500 26px HSBodoni'; aralikli(g, bilet.code, cx - 54, 1627, 4, 'left');
      g.fillStyle = MUREKKEB; g.font = '600 22px HSCG';
      aralikli(g, t.gun + ' ' + aylarQisa[['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avqust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'].indexOf(t.ay)] + ' · ' + t.saat, cx, 1673, 9, 'center');
      g.font = 'italic 500 29px HSCG';
      g.fillText('Girişdə bu QR kodu', cx, 1722); g.fillText('göstərməyiniz kifayətdir', cx, 1762);
      // alt yazı
      g.fillStyle = 'rgba(243,230,210,.85)'; g.font = 'italic 500 30px HSCG'; g.fillText('Qadından qadına…', 540, 1876);
      return c;
    });
  };
})();
