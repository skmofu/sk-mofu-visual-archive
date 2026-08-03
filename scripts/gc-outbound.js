/* GoatCounter outbound-click tracking (S.K_mofu HP)
 * 外部リンクのクリックを `out:<ホスト名>` イベントとして計測する。
 * 個人情報は送らない (GoatCounterはcookieレスの軽量計測)。 */
(function () {
  function host(url) {
    try { return new URL(url, location.href).hostname.replace(/^www\./, ''); }
    catch (e) { return ''; }
  }
  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
    if (!a) return;
    var h = host(a.href);
    if (!h || h === location.hostname) return;
    if (window.goatcounter && typeof window.goatcounter.count === 'function') {
      window.goatcounter.count({ path: 'out:' + h, title: (a.textContent || '').trim().slice(0, 60), event: true });
    }
  }, { capture: true, passive: true });
})();
