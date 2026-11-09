// Form Doldur uygulaması — sürüm 3.2.4
(() => {
  'use strict';
  if (!['http:', 'https:'].includes(location.protocol)) return;
  if (document.getElementById('a101-form-doldur')) return;

  // Yalnızca yerel menüden etkinleştirilmiş sayfalarda yükleyici bu kodu çalıştırır.
  // Bilgi pencerelerini kapat; form ve işlem onaylarına dokunma.
  const normalize = text => text.replace(/\s+/g, ' ').trim().toLocaleLowerCase('tr-TR');
  const allowedTitles = new Set([
    'hasta geçmiş listesi', 'bilgi', 'bilgilendirme', 'bildirim',
    'bildirimler', 'uyarı', 'uyarılar', 'duyuru', 'duyurular',
    'mesaj', 'mesajlar', 'information', 'notification', 'warning'
  ]);
  // Yükleyicinin başlatmayı doğrulaması için görünmez işaret.
  const marker = document.createElement('span');
  marker.id = 'a101-form-doldur';
  marker.hidden = true;
  document.body.appendChild(marker);
  const lastAttempt = new WeakMap();
  const visible = element => element.getClientRects().length > 0 &&
    element.ownerDocument.defaultView.getComputedStyle(element).visibility !== 'hidden';

  const collectDialogs = (doc, visited = new Set()) => {
    if (visited.has(doc)) return [];
    visited.add(doc);
    const dialogs = [...doc.querySelectorAll('.x-window, [role="dialog"], .ui-dialog')];
    for (const frame of doc.querySelectorAll('iframe, frame')) {
      if (!visible(frame)) continue;
      try {
        if (frame.contentDocument) dialogs.push(...collectDialogs(frame.contentDocument, visited));
      } catch (_) {
        // Tarayıcının farklı site çerçevelerine koyduğu erişim sınırını koru.
      }
    }
    return dialogs;
  };

  const scan = () => {
    const dialogs = collectDialogs(document).filter(visible).reverse();
    // Üstteki pencereyi önce kapat, alttakini sonraki turda ele al.
    dialogs.sort((a, b) =>
      (parseInt(b.ownerDocument.defaultView.getComputedStyle(b).zIndex, 10) || 0) -
      (parseInt(a.ownerDocument.defaultView.getComputedStyle(a).zIndex, 10) || 0)
    );
    for (const dialog of dialogs) {
      const heading = dialog.querySelector(
        '.x-window-header-text, .x-title-text, .ui-dialog-title'
      );
      const labelled = (dialog.getAttribute('aria-labelledby') || '').split(/\s+/)
        .filter(Boolean).map(id => dialog.ownerDocument.getElementById(id)?.textContent || '').join(' ');
      const title = normalize(
        heading?.textContent || labelled || dialog.getAttribute('aria-label') || ''
      ).replace(/\s*[:!…]+$/, '');
      if (!allowedTitles.has(title)) continue;

      const fields = [...dialog.querySelectorAll(
        'input:not([type="hidden"]), textarea, select, [contenteditable="true"]'
      )];
      if (fields.some(field => visible(field) && !field.disabled && !field.readOnly)) continue;
      const actions = [...dialog.querySelectorAll(
        'button, [role="button"], .x-btn'
      )].filter(visible);
      const requiresDecision = actions.some(action =>
        /^(evet|hayır|onayla|kaydet|sil|gönder|devam|yes|no|confirm|save|delete|submit)$/u
          .test(normalize(action.textContent || action.getAttribute('aria-label') || ''))
      );
      if (requiresDecision) continue;

      const close = [...dialog.querySelectorAll(
        '.x-window-header .x-tool-close, ' +
        '.ui-dialog-titlebar-close, ' +
        'button[aria-label="Kapat"], button[aria-label="Close"], ' +
        '[role="button"][aria-label="Kapat"], [role="button"][aria-label="Close"]'
      )].find(element => visible(element) &&
        !element.closest('[aria-disabled="true"], [disabled]'));
      if (!close) continue;
      if (Date.now() - (lastAttempt.get(dialog) || 0) < 2000) return;
      lastAttempt.set(dialog, Date.now());
      close.click();
      return;
    }
  };
  setInterval(scan, 500);
  scan();
})();
