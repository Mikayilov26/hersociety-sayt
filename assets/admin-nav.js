// HER Society — admin: "☰ Menyu" tabı. 3 əsas bölmə görünür, qalanları (Büdcə, Statistika, Hesab) altında açılır.
// Yalnız görünüşə aiddir — məlumata toxunmur. 25 noyabr 2026
(function () {
  var ac = document.getElementById('tabMenyu'), alt = document.getElementById('tabAlt'), ad = document.getElementById('tabMenyuAd');
  if (!ac || !alt) return;
  function goster(v) { alt.hidden = !v; ac.setAttribute('aria-expanded', v ? 'true' : 'false'); }
  ac.addEventListener('click', function (ev) { ev.stopPropagation(); goster(alt.hidden); });
  alt.addEventListener('click', function (ev) { if (ev.target.closest('button')) goster(false); });
  document.addEventListener('click', function (ev) { if (!alt.hidden && !alt.contains(ev.target) && !ac.contains(ev.target)) goster(false); });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') goster(false); });
  // Altdakı bölmələrdən biri açıqdırsa, tabda onun adı yazılsın və seçilmiş görünsün
  function yoxla() {
    var sec = alt.querySelector('[data-tab][aria-selected="true"]');
    ac.classList.toggle('secili', !!sec);
    ac.setAttribute('aria-selected', sec ? 'true' : 'false');
    ad.textContent = sec ? sec.textContent : 'Menyu';
  }
  new MutationObserver(yoxla).observe(alt, { attributes: true, subtree: true, attributeFilter: ['aria-selected'] });
  yoxla();
})();
