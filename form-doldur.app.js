// Form Doldur uygulaması — sürüm 3.2.2
(() => {
  'use strict';
  if (!['http:', 'https:'].includes(location.protocol)) return;
  if (document.getElementById('a101-form-doldur')) return;

  // Yalnızca yerel menüden etkinleştirilmiş sayfalarda yükleyici bu kodu çalıştırır.
  // Başka pencere başlıkları ayrıca tanımlanmadan otomatik kapatılmaz.
  const normalize = text => text.replace(/\s+/g, ' ').trim().toLocaleLowerCase('tr-TR');
  const allowedTitles = new Set(['hasta geçmiş listesi']);
  // Yükleyicinin başlatmayı doğrulaması için görünmez işaret.
  const marker = document.createElement('span');
  marker.id = 'a101-form-doldur';
  marker.hidden = true;
  document.body.appendChild(marker);
  const attempted = new WeakSet();
  const visible = element => element.getClientRects().length > 0 &&
    getComputedStyle(element).visibility !== 'hidden';

  const scan = () => {
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
    });
  };
  // Dinamik açılan ve yeniden gösterilen pencereleri de kontrol et.
  setInterval(scan, 750);
  scan();
})();
