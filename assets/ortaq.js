// HER Society — sayt və admin üçün ortaq köməkçilər
(function () {
  var C = window.HS_CONFIG || {};
  var hazir = C.url && C.url.indexOf('http') === 0 && window.supabase;
  var HS = window.HS = {};

  HS.db = hazir ? window.supabase.createClient(C.url, C.key, {
    auth: { persistSession: true, storageKey: 'hs-admin' }
  }) : null;

  HS.saytUrl = function (path) {
    return C.url + '/storage/v1/object/public/sayt/' + path.split('/').map(encodeURIComponent).join('/');
  };

  var aylar = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avqust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'];
  var gunler = ['bazar', 'bazar ertəsi', 'çərşənbə axşamı', 'çərşənbə', 'cümə axşamı', 'cümə', 'şənbə'];

  // Tarixi həmişə Bakı vaxtı ilə göstər
  HS.hisseler = function (iso) {
    var d = new Date(iso);
    var f = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Baku', year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false });
    var p = {};
    f.formatToParts(d).forEach(function (x) { p[x.type] = x.value; });
    var wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
    return {
      gun: +p.day, ay: aylar[+p.month - 1], il: +p.year, hefte: gunler[wd],
      saat: (p.hour === '24' ? '00' : p.hour) + ':' + p.minute
    };
  };

  // Saat: görüşdə saat hələ bəlli deyilsə (time_tbd), boş qaytarır
  HS.saat = function (ev) { return ev && ev.time_tbd ? '' : HS.hisseler(ev.starts_at).saat; };
  HS.SAAT_YOX = 'Tezliklə açıqlanacaq';

  // Orijinal şəkil: JPEG-dirsə toxunmadan (tam keyfiyyət), başqa formatdırsa tam ölçüdə JPEG-ə çevrilir
  HS.orijinal = function (f) {
    if (/^image\/jpe?g$/i.test(f.type) && f.size <= 30 * 1048576) return Promise.resolve(f);
    return HS.kicilt(f, 4600, 0.93);
  };

  HS.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  HS.mb = function (b) { return (b / 1048576).toFixed(1).replace('.', ',') + ' MB'; };

  // Şəkli brauzerdə kiçilt: max uzun tərəf, JPEG
  HS.kicilt = function (fayl, max, keyfiyyet) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(fayl);
      var img = new Image();
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, max / Math.max(w, h));
        var c = document.createElement('canvas');
        c.width = Math.round(w * k); c.height = Math.round(h * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (b) {
          URL.revokeObjectURL(url);
          b ? res(b) : rej(new Error('kicilt'));
        }, 'image/jpeg', keyfiyyet || 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('oxunmadi')); };
      img.src = url;
    });
  };

  HS.id = function () {
    return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() :
      'x' + Date.now().toString(36) + Math.random().toString(36).slice(2);
  };
})();
