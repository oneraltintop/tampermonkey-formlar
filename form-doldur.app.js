// Form Doldur uygulaması — sürüm 3.5.0
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
    ['doktor', /^doktor$/u],
    ['doktor-notlari', /^doktor notları$/u],
    ['tani-arama', /^arama$/u]
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
    const report = { version: '3.5.0', fields: [], saveButtons: [], choices: [], actions: [], tabs: [], editors: [] };
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
        container?.querySelectorAll('input, textarea, select, button, [role="combobox"], .x-form-trigger')
          .forEach(element => addField(target[0], element));
      }
      for (const field of doc.querySelectorAll('input, textarea, select, [role="combobox"]')) {
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
      for (const action of doc.querySelectorAll('button, a[role="button"], .x-btn')) {
        if (!isVisible(action)) continue;
        const label = cleanLabel(action.textContent || action.getAttribute('aria-label') || '');
        if (/^(kabul|hasta kabul|ekle|tanı ekle|tamam|kaydet)(\s*[[(]f\d+[)\]])?$/u.test(label)) {
          report.actions.push({ frame: path, label, ...describe(action) });
        }
      }
      for (const tab of doc.querySelectorAll('[role="tab"], .x-tab')) {
        if (!isVisible(tab)) continue;
        const label = cleanLabel(tab.textContent || '');
        if (['doktor notları', 'muayene bilgileri', 'tanılar', 'sık kullanılan tanılar'].includes(label)) {
          report.tabs.push({ frame: path, label, ...describe(tab) });
        }
      }
      // Yalnızca editör öğelerinin yapısı; yazılı notlar veya HTML içeriği alınmaz.
      for (const editor of doc.querySelectorAll('textarea, [contenteditable="true"]')) {
        if (isVisible(editor) && editor.id !== 'form-teknik-panel') {
          report.editors.push({ frame: path, ...describe(editor) });
        }
      }
      for (const cell of doc.querySelectorAll('.x-grid-cell-inner, .x-grid3-cell-inner, [role="gridcell"]')) {
        if (isVisible(cell) && normalize(cell.textContent || '') === 'z00.0') {
          report.choices.push({ frame: path, label: 'z00.0', ...describe(cell) });
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
    heading.textContent = 'Alan tanıma raporu — 3.5.0';
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
  let activeFields = null;
  const findField = (doc, step) => {
    if (activeFields?.doc === doc) {
      const field = activeFields.fields.get(step.name);
      if (!field?.isConnected || field.ownerDocument !== doc ||
          field.getAttribute('name') !== step.name) {
        throw new Error(step.label + ' alanı değişti. Kayıt yapılmadı.');
      }
      return field;
    }
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
    const componentId = field.id.endsWith('-inputEl') ? field.id.slice(0, -8) : '';
    const container = (componentId && doc.getElementById(componentId)) ||
      field.closest('.x-form-item, .x-field');
    const triggers = [...(container?.querySelectorAll('.x-form-trigger') || [])]
      .filter(element => shown(element) &&
        !element.closest('[aria-disabled="true"], [disabled]'));
    if (triggers.length !== 1) throw new Error(step.label + ' seçim düğmesi belirsiz.');
    const popupSelector = '.x-boundlist, .x-combo-list, .x-window, [role="listbox"], [role="dialog"]';
    const expectedListTitle = step.name === 'birim' ? 'birim listesi' :
      step.name === 'personel' ? 'personel listesi' : '';
    const isExpectedList = root => {
      if (!expectedListTitle) return false;
      const header = root.querySelector('.x-window-header-text, .x-title-text, .ui-dialog-title');
      return normalize(header?.textContent || root.getAttribute('aria-label') || '') === expectedListTitle;
    };
    const existing = new Set([...doc.querySelectorAll(popupSelector)].filter(shown));
    if (![...existing].some(isExpectedList)) {
      field.focus();
      if (step.name === 'personel') {
        for (const type of ['mousedown', 'mouseup', 'click']) {
          triggers[0].dispatchEvent(new doc.defaultView.MouseEvent(type, {
            bubbles: true, cancelable: true, view: doc.defaultView, button: 0,
            buttons: type === 'mousedown' ? 1 : 0
          }));
        }
      } else {
        triggers[0].click();
      }
    }

    let searchStarted = false;
    const option = await waitUntil(() => {
      const roots = [...doc.querySelectorAll(popupSelector)]
        .filter(root => shown(root) && (!existing.has(root) || isExpectedList(root)));
      const candidates = new Map();
      for (const root of roots) {
        for (const item of root.querySelectorAll(
          '.x-boundlist-item, .x-combo-list-item, [role="option"], ' +
          '.x-grid-cell-inner, .x-grid3-cell-inner, [role="gridcell"], td'
        )) {
          if (!shown(item) || !matchesChoice(item.textContent || '', step)) continue;
          const row = item.closest('.x-grid-row, .x-grid3-row, .x-grid-item, [role="row"]');
          const target = row || item;
          if (target.closest('[aria-disabled="true"], .x-item-disabled')) continue;
          if (!candidates.has(target)) candidates.set(target, item);
        }
      }

      if (step.name === 'personel' && !candidates.size && !searchStarted) {
        const lists = roots.filter(isExpectedList);
        if (lists.length === 1) {
          const searches = new Set();
          for (const label of lists[0].querySelectorAll('label, .x-form-item-label')) {
            if (normalize(label.textContent || '').replace(/[:*]+$/g, '').trim() !== 'arama') continue;
            const linked = label.getAttribute('for');
            const input = linked ? doc.getElementById(linked) :
              label.closest('.x-form-item')?.querySelector('input[type="text"]');
            if (input && shown(input) && !input.disabled && !input.readOnly) searches.add(input);
          }
          if (searches.size === 1) {
            searchStarted = true;
            const input = [...searches][0];
            input.focus();
            const setValue = Object.getOwnPropertyDescriptor(
              doc.defaultView.HTMLInputElement.prototype, 'value'
            ).set;
            setValue.call(input, step.value);
            input.dispatchEvent(new doc.defaultView.Event('input', { bubbles: true }));
            input.dispatchEvent(new doc.defaultView.Event('change', { bubbles: true }));
            input.dispatchEvent(new doc.defaultView.KeyboardEvent('keyup', {
              key: 'r', code: 'KeyR', keyCode: 82, which: 82, bubbles: true
            }));
          }
        }
      }
      if (candidates.size > 1) throw new Error(step.label + ' için birden fazla eşleşme var.');
      return candidates.size === 1 ? [...candidates.values()][0] : null;
    }, step.label + ' listesi veya "' + step.value + '" satırı bulunamadı. Kayıt yapılmadı.');

    option.click();
    if (option.closest('.x-grid-row, .x-grid3-row, .x-grid-item, [role="row"]') &&
        option.isConnected && shown(option)) {
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
      activeFields = {
        doc, fields: new Map(shortcutSteps.map((step, index) => [step.name, originals[index]]))
      };
      const sameForm = () => originals.every((field, index) =>
        field.isConnected && field.ownerDocument === doc &&
        field.getAttribute('name') === shortcutSteps[index].name);
      for (const step of shortcutSteps) {
        if (!sameForm()) throw new Error('Ekran değişti. Kayıt yapılmadı.');
        await chooseValue(doc, step);
      }
      if (!sameForm() || !shortcutSteps.every(step => expectedValue(doc, step))) {
        throw new Error('Dört seçim birlikte doğrulanamadı. Kayıt yapılmadı.');
      }
      await waitUntil(() => originals.every(field => shown(field) && !field.disabled),
        'Seçim penceresi kapanmadı veya alanlar kullanılamıyor. Kayıt yapılmadı.');
      if ([...doc.querySelectorAll('.x-message-box, [role="alertdialog"], [aria-modal="true"]')].some(shown)) {
        throw new Error('Açık onay penceresi var. Kayıt yapılmadı.');
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
      // Kaydet sonucunu HBYS gösterir; ek bilgi penceresi açma.
    } catch (error) {
      alert('[3.5.0] ' + (saveClicked ? 'Kaydet işleminin sonucunu ekrandan kontrol et. ' : shortcutName + ' durdu: ') +
        error.message);
    } finally {
      activeFields = null;
      shortcutBusy = false;
    }
  };




  const focusIdentity = () => {
    if (shortcutBusy) return;
    const matches = new Set();
    for (const { doc } of frameDocuments()) {
      // Yalnızca hasta kayıt alanlarını içeren belgeyi tara.
      if (!doc.querySelector('input[name="birim"]') ||
          !doc.querySelector('input[name="personel"]')) continue;
      for (const label of doc.querySelectorAll('label, .x-form-item-label')) {
        const text = cleanLabel(label.textContent || '').replace(/[.]/g, '');
        if (!['kimlik no', 'tc kimlik no', 'kimlik numarası'].includes(text)) continue;
        if (!shown(label)) continue;
        const linked = label.getAttribute('for');
        const input = linked ? doc.getElementById(linked) :
          label.closest('.x-form-item, .x-field')?.querySelector('input:not([type="hidden"])');
        if (input && shown(input) && !input.disabled && !input.readOnly) matches.add(input);
      }
    }
    if (matches.size !== 1) {
      alert('Kimlik No alanı tek ve kullanılabilir olarak bulunamadı. İşlem yapılmadı.');
      return;
    }
    const input = [...matches][0];
    input.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    input.focus();
  };
  const createCtrlTapHandler = onDouble => {
    let down = false;
    let clean = false;
    let lastTap = null;
    const isCtrl = event => event.key === 'Control' ||
      event.code === 'ControlLeft' || event.code === 'ControlRight';
    return {
      keydown(event) {
        if (isCtrl(event)) {
          if (down || event.repeat) return;
          down = true;
          clean = !event.altKey && !event.shiftKey && !event.metaKey;
          if (!clean) lastTap = null;
        } else {
          clean = false;
          lastTap = null;
        }
      },
      keyup(event) {
        if (!isCtrl(event)) return;
        const standalone = down && clean && !event.altKey && !event.shiftKey && !event.metaKey;
        down = false;
        clean = false;
        if (!standalone) { lastTap = null; return; }
        const now = Date.now();
        if (lastTap !== null && now - lastTap <= 500) {
          lastTap = null;
          onDouble();
        } else {
          lastTap = now;
        }
      },
      reset() { down = false; clean = false; lastTap = null; }
    };
  };

  const shortcutNumber = event => {
    if (!event.altKey || event.shiftKey || event.ctrlKey || event.metaKey) return 0;
    if (['Digit1', 'Numpad1'].includes(event.code) || event.key === '1' ||
        event.keyCode === 49 || event.keyCode === 97) return 1;
    if (['Digit2', 'Numpad2'].includes(event.code) || event.key === '2' ||
        event.keyCode === 50 || event.keyCode === 98) return 2;
    return 0;
  };
  const pressedShortcuts = new Set();
  const watched = new WeakSet();
  const bindDiagnostics = () => {
    for (const { doc } of frameDocuments()) {
      const view = doc.defaultView;
      if (!view || watched.has(view)) continue;
      watched.add(view);
      const ctrlTap = createCtrlTapHandler(focusIdentity);
      view.addEventListener('keyup', event => {
        pressedShortcuts.clear();
        ctrlTap.keyup(event);
      }, true);
      view.addEventListener('blur', () => {
        pressedShortcuts.clear();
        ctrlTap.reset();
      }, true);
      view.addEventListener('keydown', event => {
        ctrlTap.keydown(event);
        const number = shortcutNumber(event);
        if (number) {
          event.preventDefault();
          event.stopPropagation();
          if (event.repeat || pressedShortcuts.has(number)) return;
          pressedShortcuts.add(number);
          void runShortcut(number === 2 ? 'Pansuman' : 'Enjeksiyon');
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
