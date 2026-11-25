// HER Society — admin panelin sürətli açılması (25 noyabr 2026)
// Yalnız yükləmə sürətinə aiddir — heç bir məlumatı dəyişmir və silmir.
(function () {
  // 1) Excel və ZIP alətləri: açılışı gecikdirməsin deyə panel açılandan sonra arxa planda yüklənir.
  //    Düymə ondan əvvəl basılsa, alət həmin an yüklənir və iş davam edir.
  var URL = {
    xlsx: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    zip: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
  };
  var VAR = { xlsx: function () { return !!window.XLSX; }, zip: function () { return !!window.JSZip; } };
  var gozle = {};
  window.HSalet = function (ad) {
    if (VAR[ad]()) return Promise.resolve();
    if (gozle[ad]) return gozle[ad];
    gozle[ad] = new Promise(function (ok, no) {
      var s = document.createElement('script');
      s.src = URL[ad]; s.async = true;
      s.onload = function () { VAR[ad]() ? ok() : no(new Error(ad)); };
      s.onerror = function () { gozle[ad] = null; s.remove(); no(new Error(ad)); };
      document.head.appendChild(s);
    });
    return gozle[ad];
  };
  function arxaPlan() {
    window.HSalet('xlsx').catch(function () {});
    window.HSalet('zip').catch(function () {});
  }
  window.addEventListener('load', function () { setTimeout(arxaPlan, 2500); });

  // 2) Oflayn yaddaş: panelin faylları telefonda saxlanılır (məlumatlar yox — onlar həmişə canlı gəlir)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/admin/sw.js', { scope: '/admin/' }).catch(function () {});
    });
  }
})();
