// Form Doldur uygulaması — sürüm 3.2.1
(() => {
  'use strict';
  if (!['http:', 'https:'].includes(location.protocol)) return;
  if (document.getElementById('a101-form-doldur')) return;

  // Yalnızca yerel menüden etkinleştirilmiş sayfalarda yükleyici bu kodu çalıştırır.
  // Başka pencere başlıkları ayrıca tanımlanmadan otomatik kapatılmaz.
  const normalize = text => text.replace(/\s+/g, ' ').trim().toLocaleLowerCase('tr-TR');
  const allowedTitles = new Set(['hasta geçmiş listesi']);
  const control = document.createElement('button');
  control.id = 'a101-form-doldur';
  control.type = 'button';
  control.style.cssText = 'position:fixed;bottom:24px;left:24px;z-index:2147483647;background:#000;color:white;border:0;border-radius:10px;padding:14px 20px;cursor:pointer';
  let active = true;
  let closed = 0;
  const attempted = new WeakSet();
  const visible = element => element.getClientRects().length > 0 &&
    getComputedStyle(element).visibility !== 'hidden';
  const update = () => {
    control.textContent = active
      ? 'Pencere kapatma açık · ' + closed
      : 'Pencere kapatma duraklatıldı';
  };
  control.addEventListener('click', () => { active = !active; update(); });
  update();
  document.body.appendChild(control);

  const scan = () => {
    if (!active) return;
    document.querySelectorAll('.x-window, [role="dialog"], .ui-dialog').forEach(dialog => {
      if (!visible(dialog)) { attempted.delete(dialog); return; }
      if (attempted.has(dialog)) return;
      const heading = dialog.querySelector('.x-window-header-text, .x-title-text, .ui-dialog-title');
      const labelled = (dialog.getAttribute('aria-labelledby') || '').split(/\s+/)
        .filter(Boolean).map(id => document.getElementById(id)?.textContent || '').join(' ');
      const title = heading?.textContent || labelled || dialog.getAttribute('aria-label') || '';
      if (!allowedTitles.has(normalize(title))) return;
      const close = dialog.querySelector(
        '.x-window-header .x-tool-close, .x-window-header .x-tool img.x-tool-close, ' +
        '.ui-dialog-titlebar-close, button[aria-label="Kapat"], button[aria-label="Close"]'
      );
      if (!close || !visible(close) || close.closest('[aria-disabled="true"], [disabled]')) return;
      attempted.add(dialog);
      close.click();
      setTimeout(() => {
        if (!dialog.isConnected || !visible(dialog)) { closed++; update(); }
      }, 200);
    });
  };
  // Dinamik açılan ve yeniden gösterilen pencereleri de kontrol et.
  setInterval(scan, 750);
  scan();
})();
