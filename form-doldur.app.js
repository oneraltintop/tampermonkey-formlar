// Form Doldur uygulaması — sürüm 3.4.8
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
    const report = { version: '3.4.8', fields: [], saveButtons: [], choices: [] };
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
        if (isVisible(option) && ['araç', 'yeşil', 'enjeksiyon', 'pansuman', 'sevgi sever'].includes(label)) {
          report.choices.push({ frame: path, label, ...describe(option) });
        }
      }
    }
    const panel = document.createElement('div');
    panel.id = 'form-teknik-panel';
    panel.style.cssText = 'position:fixed;inset:10% 10%;z-index:2147483647;background:white;color:black;padding:20px;border:2px solid #333;box-shadow:0 4px 20px #0008;font:14px Arial;display:flex;flex-direction:column;gap:12px';
    const heading = document.createElement('strong');
    heading.textContent = 'Alan tanıma raporu — 3.4.8';
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

  // Alt+1 / Alt+2: yalnızca raporda doğrulanmış alan adlarıyla çalış.
  let shortcutBusy = false;
  const baseSteps = [
    { name: 'acilGelisSekli', label: 'Acil Geliş Şekli', value: 'Araç' },
    { name: 'triaj', label: 'Triaj Kodu', value: 'Yeşil' },
    { name: 'birim', label: 'Birim', value: 'Enjeksiyon' },
    { name: 'personel', label: 'Doktor', value: 'Sevgi Sever' }
  ];
  const shown = element => {
    if (!element.isConnected || !element.getClientRects().length) return false;
    const view = element.ownerDocument.defaultView;
    const style = view.getComputedStyle(element);
    if (style.visibility === 'hidden' || style.display === 'none') return false;
    // Ext JS gizli pencereleri ekranın çok dışına taşıyabilir.
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 &&
      rect.right > 0 && rect.bottom > 0 &&
      rect.left < view.innerWidth && rect.top < view.innerHeight;
  };
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const waitUntil = async (find, message) => {
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      const result = find();
      if (result) return result;
      await pause(100);
    }
    throw new Error(message);
  };
  const findField = (doc, step) => {
    const matches = [...doc.querySelectorAll('input[name="' + step.name + '"]')]
      .filter(shown);
    if (matches.length !== 1 || matches[0].disabled) {
      throw new Error(step.label + ' alanı tek ve kullanılabilir olarak bulunamadı.');
    }
    return matches[0];
  };
  const matchesChoice = (text, step) => {
    let actual = normalize(text);
    const expected = normalize(step.value);
    // Birim listesi adın sonunda parantez içinde yer bilgisi gösterebilir.
    if (step.name === 'birim') actual = actual.replace(/\s*\([^()]+\)\s*$/u, '').trim();
    return actual === expected;
  };
  const expectedValue = (doc, step) =>
    matchesChoice(findField(doc, step).value, step);
  const chooseValue = async (doc, step) => {
    if (expectedValue(doc, step)) return;
    const field = findField(doc, step);
    const container = field.closest('.x-form-item, .x-field');
    const triggers = [...(container?.querySelectorAll('.x-form-trigger') || [])]
      .filter(element => shown(element) &&
        !element.closest('[aria-disabled="true"], [disabled]'));
    if (triggers.length !== 1) throw new Error(step.label + ' seçim düğmesi belirsiz.');
    const popupSelector = '.x-boundlist, .x-combo-list, .x-window, [role="listbox"], [role="dialog"]';
    const existing = new Set([...doc.querySelectorAll(popupSelector)].filter(shown));
    field.focus();
    triggers[0].click();

    const option = await waitUntil(() => {
      const roots = [...doc.querySelectorAll(popupSelector)]
        .filter(root => shown(root) && !existing.has(root));
      const candidates = new Set();
      for (const root of roots) {
        for (const item of root.querySelectorAll(
          '.x-boundlist-item, .x-combo-list-item, [role="option"], .x-grid-cell-inner'
        )) {
          if (!shown(item) || !matchesChoice(item.textContent || '', step)) continue;
          const row = item.closest('.x-grid-row');
          const target = row || item;
          if (target.closest('[aria-disabled="true"], .x-item-disabled')) continue;
          candidates.add(target);
        }
      }
      if (candidates.size > 1) throw new Error(step.label + ' için birden fazla eşleşme var.');
      return candidates.size === 1 ? [...candidates][0] : null;
    }, step.label + ' listesinde "' + step.value + '" bulunamadı. Kayıt yapılmadı.');

    option.click();
    if (option.matches('.x-grid-row') && option.isConnected && shown(option)) {
      option.dispatchEvent(new doc.defaultView.MouseEvent('dblclick', {
        bubbles: true, cancelable: true, view: doc.defaultView
      }));
    }
    await waitUntil(() => expectedValue(doc, step),
      step.label + ' seçimi doğrulanamadı. Kayıt yapılmadı.');
  };
  const runShortcut = async (unit = 'Enjeksiyon') => {
    if (shortcutBusy) return;
    if (!['Enjeksiyon', 'Pansuman'].includes(unit)) return;
    const shortcutSteps = baseSteps.map(step => step.name === 'birim' ? { ...step, value: unit } : step);
    const shortcutName = unit === 'Pansuman' ? 'Alt+2' : 'Alt+1';
    shortcutBusy = true;
    let saveClicked = false;
    try {
      if (document.getElementById('form-teknik-panel')) {
        throw new Error('Önce alan tanıma raporunu kapat.');
      }
      const docs = frameDocuments().filter(({ doc }) =>
        shortcutSteps.every(step =>
          [...doc.querySelectorAll('input[name="' + step.name + '"]')].filter(shown).length === 1
        ));
      if (docs.length !== 1) throw new Error('Hasta kayıt alanlarının bulunduğu tek ekran belirlenemedi.');
      const doc = docs[0].doc;
      // Ana HBYS ekranı da .x-window olabilir; onu bildirim sayma.
      const blockingDialogs = [...doc.querySelectorAll(
        '.x-message-box, [role="alertdialog"], [aria-modal="true"]'
      )].filter(shown);
      if (blockingDialogs.length) {
        throw new Error('Açık onay veya uyarı penceresini kapatıp yeniden dene.');
      }
      const originals = shortcutSteps.map(step => findField(doc, step));
      const sameForm = () => shortcutSteps.every((step, index) =>
        findField(doc, step) === originals[index]);
      for (const step of shortcutSteps) {
        if (!sameForm()) throw new Error('Ekran değişti. Kayıt yapılmadı.');
        await chooseValue(doc, step);
      }
      if (!sameForm() || !shortcutSteps.every(step => expectedValue(doc, step))) {
        throw new Error('Dört seçim birlikte doğrulanamadı. Kayıt yapılmadı.');
      }
      let scope = originals[0].parentElement;
      while (scope && !originals.every(field => scope.contains(field))) scope = scope.parentElement;
      const saveCandidates = root => [...root.querySelectorAll('a[role="button"], button, .x-btn')]
        .filter(button => shown(button) &&
          /^(kaydet|kaydet \[f\d+\]|kaydet \(f\d+\))$/u.test(cleanLabel(button.textContent || '')) &&
          !button.closest('[aria-disabled="true"], [disabled], .x-item-disabled'));
      let saves = [];
      while (scope) {
        saves = saveCandidates(scope);
        if (saves.length) break;
        scope = scope.parentElement;
      }
      if (saves.length !== 1) throw new Error('Tek bir etkin Kaydet düğmesi bulunamadı. Kayıt yapılmadı.');
      // Seçimleri yeniden kontrol et; yalnızca bir kez Kaydet'e bas.
      if (!shortcutSteps.every(step => expectedValue(doc, step))) {
        throw new Error('Seçimler değişti. Kayıt yapılmadı.');
      }
      saveClicked = true;
      saves[0].click();
      alert('Kaydet düğmesine bir kez basıldı. Kaydın sonucunu HBYS ekranından kontrol et.');
    } catch (error) {
      alert((saveClicked ? 'Kaydet işleminin sonucunu ekrandan kontrol et. ' : shortcutName + ' durdu: ') +
        error.message);
    } finally {
      shortcutBusy = false;
    }
  };



  const miniControls = document.createElement('div');
  miniControls.id = 'hasta-kayit-mini';
  miniControls.style.cssText = 'position:fixed;right:6px;top:50%;transform:translateY(-50%);z-index:2147483647;display:flex;flex-direction:column;gap:6px';
  const miniButtons = [];
  for (const [text, unit] of [['E', 'Enjeksiyon'], ['O', 'Pansuman']]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = text;
    button.title = unit + ' · Araç → Yeşil → Sevgi Sever → Kaydet';
    button.setAttribute('aria-label', unit + ' seç ve kaydet');
    button.style.cssText = 'width:22px;height:22px;padding:0;border:1px solid #fff;border-radius:6px;background:#176b48;color:white;font:bold 11px Arial,sans-serif;cursor:pointer;box-shadow:0 1px 4px #0005';
    button.addEventListener('click', async () => {
      if (shortcutBusy) return;
      miniButtons.forEach(item => { item.disabled = true; });
      try {
        await runShortcut(unit);
      } finally {
        miniButtons.forEach(item => { item.disabled = false; });
      }
    });
    miniButtons.push(button);
    miniControls.appendChild(button);
  }
  document.body.appendChild(miniControls);

  const shortcutNumber = event => {
    if (!event.altKey || event.shiftKey || event.ctrlKey || event.metaKey) return 0;
    if (['Digit1', 'Numpad1'].includes(event.code) || event.key === '1' ||
        event.keyCode === 49 || event.keyCode === 97) return 1;
    if (['Digit2', 'Numpad2'].includes(event.code) || event.key === '2' ||
        event.keyCode === 50 || event.keyCode === 98) return 2;
    return 0;
  };
  const watched = new WeakSet();
  const bindDiagnostics = () => {
    for (const { doc } of frameDocuments()) {
      const view = doc.defaultView;
      if (!view || watched.has(view)) continue;
      watched.add(view);
      view.addEventListener('keydown', event => {
        const number = shortcutNumber(event);
        if (number) {
          event.preventDefault();
          event.stopPropagation();
          if (!event.repeat) void runShortcut(number === 2 ? 'Pansuman' : 'Enjeksiyon');
          return;
        }
        if (event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey &&
            (event.code === 'KeyT' || (event.key || '').toLowerCase() === 't') &&
            !event.repeat) {
          event.preventDefault();
          inspectFields();
        }
      }, true);
    }
  };
  bindDiagnostics();
  setInterval(bindDiagnostics, 1500);

})();
