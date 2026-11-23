// HER Society — admin: açılan bölmələri və pəncərələri bağlamaq asan olsun (23 noyabr 2026)
// Yalnız görünüşə aiddir — heç bir məlumatı dəyişmir və silmir.
(function () {
  var el = function (id) { return document.getElementById(id); };

  // 1) Admin paneldə açılan hər bölmənin (Rəyləri oxu, görüş kartı, QR, yeni kart, giriş linki,
  //    nüsxələrin siyahısı və s.) sonunda "Bağla" düyməsi — yuxarı qayıtmağa ehtiyac qalmır.
  document.addEventListener('toggle', function (ev) {
    var d = ev.target;
    if (!d || d.tagName !== 'DETAILS' || !d.open || !d.closest('#app')) return;
    var son = d.lastElementChild;
    if (son && son.classList.contains('acilan-bagla')) return;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'duyme kicik acilan-bagla'; b.textContent = 'Bağla';
    d.appendChild(b);
  }, true);

  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('.acilan-bagla'); if (!b) return;
    var d = b.closest('details'); if (!d) return;
    d.open = false;
    var s = d.querySelector('summary');
    if (s && s.getBoundingClientRect().top < 70) s.scrollIntoView({ block: 'center' });
  });

  // 2) Uzun pəncərələr (Önizləmə, Anons videosu): yuxarıda da "×" düyməsi, kənara toxunanda bağlanır
  function xElave(modalId, baglaId, olar) {
    var m = el(modalId), bagla = el(baglaId); if (!m || !bagla) return;
    var q = m.querySelector('.qutu');
    var x = document.createElement('button');
    x.type = 'button'; x.className = 'qutu-x'; x.setAttribute('aria-label', 'Bağla');
    x.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    x.addEventListener('click', function () { if (!olar || olar()) bagla.click(); });
    q.insertBefore(x, q.firstChild);
    m.addEventListener('click', function (ev) { if (ev.target === m && (!olar || olar())) bagla.click(); });
  }
  // Video hazırlanarkən təsadüfən bağlanmasın
  var videoHazirlanmir = function () { return !el('vHazirla') || !el('vHazirla').disabled || el('vHazirla').hidden; };
  xElave('gOnizle', 'goBagla');
  xElave('vModal', 'vBagla', videoHazirlanmir);
  // Şəklin saytdakı görünüşü: kənara toxunmaq = "Ləğv et"
  (function () { var m = el('kadrModal'), l = el('kadrLegv'); if (m && l) m.addEventListener('click', function (ev) { if (ev.target === m) l.click(); }); })();

  // 3) Hesab bölməsi: "İndi qur" və "Açarı dəyiş" ilə açılan hissələrdən geri çıxmaq
  function legvElave(panelId, sonra) {
    var p = el(panelId); if (!p) return;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'duyme kicik'; b.style.alignSelf = 'flex-start'; b.textContent = 'Ləğv et';
    b.addEventListener('click', function () { p.hidden = true; sonra(); });
    p.appendChild(b);
    return b;
  }
  legvElave('mfaQurulus', function () { if (el('mfaQur')) el('mfaQur').hidden = false; });
  // Google açarları: yalnız artıq qoşulubsa (Açarı dəyiş) ləğv düyməsi görünür
  var gL = legvElave('gAcarlar', function () {});
  if (gL) {
    var gYenile = function () { gL.hidden = !el('gQosulub') || el('gQosulub').hidden; };
    new MutationObserver(gYenile).observe(el('gAcarlar'), { attributes: true, attributeFilter: ['hidden'] });
    gYenile();
  }
})();
