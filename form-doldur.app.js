// Form Doldur uygulaması — sürüm 3.3.0
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

  // Alt+Shift+T: yalnızca istenen alanların teknik yapısını yerel olarak göster.
  const diagnosticTargets = [
    ['acil-gelis', /^(acil )?geliş şekli$/u],
    ['triaj', /^triaj( kodu)?$/u],
    ['birim', /^birim$/u],
    ['doktor', /^doktor$/u]
  ];
  const cleanLabel = text => normalize(text).replace(/[:*]+$/g, '').trim();
  const technical = text => (text || '').slice(0, 160)
    .replace(/\d{6,}/g, '[uzun-numara]');
  const describe = element => ({
    tag: element.tagName.toLowerCase(),
    id: technical(element.id),
    name: technical(element.getAttribute('name')),
    role: technical(element.getAttribute('role')),
    type: technical(element.getAttribute('type')),
    classes: technical(typeof element.className === 'string' ? element.className : ''),
    controls: technical(element.getAttribute('aria-controls')),
    disabled: element.disabled === true
  });
  const frameDocuments = () => {
    const found = [];
    const seen = new Set();
    const visit = (doc, path) => {
      if (seen.has(doc)) return;
      seen.add(doc);
      found.push({ doc, path });
      [...doc.querySelectorAll('iframe, frame')].forEach((frame, index) => {
        try {
          if (frame.contentDocument) visit(frame.contentDocument, path + '/' + index);
        } catch (_) { /* Farklı kaynaklı çerçevelere erişme. */ }
      });
    };
    visit(document, 'ana');
    return found;
  };
  const inspectFields = () => {
    document.getElementById('form-teknik-panel')?.remove();
    const report = { version: '3.3.0', fields: [], saveButtons: [], choices: [] };
    for (const { doc, path } of frameDocuments()) {
      const isVisible = element => element.getClientRects().length > 0 &&
        doc.defaultView.getComputedStyle(element).visibility !== 'hidden';
      const recorded = new Set();
      const addField = (label, element) => {
        if (!element || recorded.has(element) || !isVisible(element)) return;
        recorded.add(element);
        report.fields.push({ frame: path, label, ...describe(element) });
      };
      for (const label of doc.querySelectorAll('label, .x-form-item-label, .x-form-cb-label')) {
        const target = diagnosticTargets.find(([, pattern]) =>
          pattern.test(cleanLabel(label.textContent || '')));
        if (!target || !isVisible(label)) continue;
        const linked = label.getAttribute('for');
        if (linked) addField(target[0], doc.getElementById(linked));
        const container = label.closest('.x-form-item, .x-field, .form-group') || label.parentElement;
        container?.querySelectorAll('input, select, button, [role="combobox"], .x-form-trigger')
          .forEach(element => addField(target[0], element));
      }
      for (const field of doc.querySelectorAll('input, select, [role="combobox"]')) {
        const target = diagnosticTargets.find(([, pattern]) =>
          pattern.test(cleanLabel(field.getAttribute('aria-label') || '')));
        if (target) addField(target[0], field);
      }
      for (const button of doc.querySelectorAll('button, [role="button"], .x-btn, input[type="submit"], input[type="button"]')) {
        // input.value dahil hiçbir alan değeri okunmaz.
        if (isVisible(button) && /^(kaydet|kaydet \[f\d+\]|kaydet \(f\d+\))$/u
          .test(cleanLabel(button.textContent || button.getAttribute('aria-label') || ''))) {
          report.saveButtons.push({ frame: path, label: 'kaydet', ...describe(button) });
        }
      }
      for (const option of doc.querySelectorAll('[role="option"], .x-boundlist-item, .x-combo-list-item')) {
        const label = cleanLabel(option.textContent || '');
        if (isVisible(option) && ['araç', 'yeşil', 'enjeksiyon', 'sevgi sever'].includes(label)) {
          report.choices.push({ frame: path, label, ...describe(option) });
        }
      }
    }
    const panel = document.createElement('div');
    panel.id = 'form-teknik-panel';
    panel.style.cssText = 'position:fixed;inset:10% 10%;z-index:2147483647;background:white;color:black;padding:20px;border:2px solid #333;box-shadow:0 4px 20px #0008;font:14px Arial;display:flex;flex-direction:column;gap:12px';
    const heading = document.createElement('strong');
    heading.textContent = 'Alan tanıma raporu — 3.3.0';
    const note = document.createElement('div');
    note.textContent = 'Yalnızca hedef alanların teknik bilgileri. Alan değerleri ve hasta bilgileri rapora eklenmez. Rapor otomatik gönderilmez.';
    const output = document.createElement('textarea');
    output.readOnly = true;
    output.setAttribute('aria-label', 'Teknik rapor');
    output.style.cssText = 'flex:1;min-height:100px;font:12px monospace';
    output.value = JSON.stringify(report, null, 2);
    const select = document.createElement('button');
    select.type = 'button';
    select.textContent = 'Raporu seç (Ctrl+C ile kopyala)';
    select.onclick = () => { output.focus(); output.select(); };
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'Kapat';
    close.onclick = () => panel.remove();
    panel.append(heading, note, output, select, close);
    document.body.appendChild(panel);
  };
  const watched = new WeakSet();
  const bindDiagnostics = () => {
    for (const { doc } of frameDocuments()) {
      if (watched.has(doc)) continue;
      watched.add(doc);
      doc.addEventListener('keydown', event => {
        if (event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey &&
            event.code === 'KeyT' && !event.repeat) {
          event.preventDefault();
          inspectFields();
        }
      }, true);
    }
  };
  bindDiagnostics();
  setInterval(bindDiagnostics, 1500);

})();
