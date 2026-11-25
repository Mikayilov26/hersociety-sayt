// HER Society — admin: yuxarıdakı ☰ menyu (Statistika, Hesab, Çıxış). 25 noyabr 2026
// Yalnız görünüşə aiddir — məlumata toxunmur.
(function () {
  var ac = document.getElementById('admMenyuAc'), m = document.getElementById('admMenyu');
  if (!ac || !m) return;
  function goster(v) { m.hidden = !v; ac.setAttribute('aria-expanded', v ? 'true' : 'false'); }
  ac.addEventListener('click', function (ev) { ev.stopPropagation(); goster(m.hidden); });
  m.addEventListener('click', function (ev) { if (ev.target.closest('button')) goster(false); });
  document.addEventListener('click', function (ev) { if (!m.hidden && !m.contains(ev.target)) goster(false); });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') goster(false); });
  // Menyudakı bölmə açıqdırsa, ☰ düyməsi seçilmiş görünsün
  function yoxla() {
    var sec = m.querySelector('[data-tab][aria-selected="true"]');
    ac.classList.toggle('secili', !!sec);
  }
  new MutationObserver(yoxla).observe(m, { attributes: true, subtree: true, attributeFilter: ['aria-selected'] });
})();
