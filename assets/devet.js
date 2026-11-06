// HER Society — qonağın şəxsi dəvət səhifəsi
(function () {
  var HS = window.HS, el = function (id) { return document.getElementById(id); };
  var k = new URLSearchParams(location.search).get('k') || '';
  function olmadi(m) { el('dSalam').textContent = m; el('dQeyd').innerHTML = '<a href="https://instagram.com/hersociety.az">@hersociety.az</a>'; }
  if (!HS.db || k.length < 20) { olmadi('Dəvət tapılmadı.'); return; }
  HS.db.rpc('devet_bax', { acar: k }).then(function (r) {
    var d = r.data;
    if (r.error) { olmadi('Bağlantı alınmadı. Bir az sonra yenidən açın.'); return; }
    if (!d) { olmadi('Dəvət tapılmadı.'); return; }
    var ev = d.event, t = HS.hisseler(ev.starts_at);
    document.title = ev.title + ' · Şəxsi dəvət';
    el('dBasliq').textContent = ev.title;
    el('dMovzu').textContent = ev.topic || '';
    if (d.revoked) { el('dSalam').textContent = 'Bu dəvət artıq etibarlı deyil.'; return; }
    el('dSalam').textContent = 'Hörmətli ' + d.name + ', ' + (ev.card_note || 'yeriniz ayrıldı — sizi gözləyirik');
    var s = [['TARİX', t.hefte.charAt(0).toLocaleUpperCase('az') + t.hefte.slice(1) + ', ' + t.gun + ' ' + t.ay + ' ' + t.il, ''], ['SAAT', ev.time_tbd ? HS.SAAT_YOX : t.saat, ''], ['MƏKAN', ev.venue || '', ev.venue_detail || '']];
    if (ev.guest_name) s.push(['QONAQ', ev.guest_name, ev.guest_title || '']);
    el('dSetirler').innerHTML = s.map(function (x) { return '<div><b>' + x[0] + '</b><span>' + HS.esc(x[1]) + (x[2] ? '<small>' + HS.esc(x[2]) + '</small>' : '') + '</span></div>'; }).join('');
    if (ev.map_url || ev.venue) { el('dXerite').href = ev.map_url || ('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(ev.venue + ' ' + (ev.venue_detail || '') + ' Bakı')); el('dXerite').hidden = false; }
    el('dQeyd').textContent = 'Girişdə dəvət kartınızdakı QR kodu göstərməyiniz kifayətdir.';
  });
})();
