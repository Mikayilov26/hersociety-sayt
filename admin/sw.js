// HER Society — admin panelin oflayn yaddaşı (25 noyabr 2026)
// Yalnız panelin öz fayllarını (səhifə, skriptlər, stil, şriftlər, kitabxanalar) telefonda saxlayır.
// Supabase sorğularına (görüşlər, şəkillər, kartlar, giriş) TOXUNMUR — onlar həmişə canlı gedir.
// Heç bir məlumatı dəyişmir və silmir.
var YADDAS = 'hs-admin-v1';

// Yalnız bu yerlərdən gələn fayllar saxlanılır
function saxlanilir(u) {
  if (u.origin === self.location.origin) return u.pathname.indexOf('/assets/') === 0 && !/\.pdf$/i.test(u.pathname);
  return u.hostname === 'cdn.jsdelivr.net' || u.hostname === 'cdnjs.cloudflare.com' ||
    u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com';
}

self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (ev) {
  ev.waitUntil(caches.keys().then(function (k) {
    return Promise.all(k.filter(function (a) { return a.indexOf('hs-admin-') === 0 && a !== YADDAS; }).map(function (a) { return caches.delete(a); }));
  }).then(function () { return self.clients.claim(); }));
});

// Eyni faylın köhnə versiyalarını (?v=...) yaddaşdan təmizlə
function kohneleriSil(c, u) {
  if (u.origin !== self.location.origin) return;
  c.keys().then(function (list) {
    list.forEach(function (r) {
      var x = new URL(r.url);
      if (x.pathname === u.pathname && x.search !== u.search) c.delete(r);
    });
  });
}

self.addEventListener('fetch', function (ev) {
  var req = ev.request;
  if (req.method !== 'GET') return;
  var u = new URL(req.url);

  // Panelin səhifəsi: həmişə əvvəlcə internetdən (yeni versiya dərhal gəlsin).
  // İnternet çox gecikərsə (4 san.) və ya yoxdursa — telefondakı son nüsxə.
  if (req.mode === 'navigate' && u.origin === self.location.origin && u.pathname.indexOf('/admin') === 0) {
    ev.respondWith(caches.open(YADDAS).then(function (c) {
      var acar = self.location.origin + '/admin/';
      var sebeke = fetch(u.href, { cache: 'no-store', credentials: 'same-origin' }).then(function (r) {
        if (r && r.redirected) r = new Response(r.body, { status: r.status, statusText: r.statusText, headers: r.headers });
        if (r && r.ok) c.put(acar, r.clone());
        return r;
      });
      var gecikme = new Promise(function (ok) {
        setTimeout(function () { c.match(acar).then(function (k) { if (k) ok(k); }); }, 4000);
      });
      return Promise.race([sebeke, gecikme]).catch(function () {
        return c.match(acar).then(function (k) { return k || sebeke; });
      });
    }));
    return;
  }

  if (!saxlanilir(u)) return; // Supabase və qalan hər şey — toxunulmur

  // Fayllar: telefonda varsa dərhal ordan verilir.
  // Versiyalı fayllar (?v=...) dəyişmir — onlar birbaşa yaddaşdan.
  // Qalanları (şriftlər, loqo, kitabxanalar) da dərhal yaddaşdan verilir, amma arxa planda
  // yenilənir — nəsə dəyişsə və ya xarab saxlanılıbsa, növbəti açılışda düzəlmiş olur.
  var versiyali = (u.origin === self.location.origin && /[?&]v=/.test(u.search)) ||
    ((u.hostname === 'cdn.jsdelivr.net' || u.hostname === 'cdnjs.cloudflare.com') && /\d+\.\d+\.\d+/.test(u.pathname));
  ev.respondWith(caches.open(YADDAS).then(function (c) {
    return c.match(req).then(function (k) {
      function getir() {
        return fetch(req).then(function (r) {
          if (r && (r.ok || r.type === 'opaque')) { c.put(req, r.clone()); kohneleriSil(c, u); }
          return r;
        });
      }
      if (k) {
        if (!versiyali) ev.waitUntil(getir().catch(function () {}));
        return k;
      }
      return getir();
    });
  }));
});
