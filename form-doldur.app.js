// Form Doldur uygulaması — sürüm 3.6.25
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
    ['tani-arama', /^arama$/u],
    ['makro-kodu', /^makro\s*kodu$/u],
    ['tedavi', /^tedavi$/u],
    ['cikis-sekli', /^çıkış şekli$/u],
    ['cikis-tarihi', /^çıkış tarihi?$/u]
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
  const technicalAncestors = element => {
    const path = [];
    let current = element;
    for (let depth = 0; current && depth < 14; depth++, current = current.parentElement) {
      path.push(describe(current));
    }
    return path;
  };
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
  // Açılır menü klavye kısayoluyla kapanırsa teknik yapıyı kısa süre bellekte tut.
  // Yalnızca sabit çıkış seçeneği/Bugün etiketleri; alan değerleri toplanmaz.
  const dischargePopupCache = new Map();
  const captureDischargePopups = () => {
    const now = Date.now();
    for (const [key, snapshot] of dischargePopupCache) {
      if (now - snapshot.capturedAt > 60000) dischargePopupCache.delete(key);
    }
    for (const { doc, path } of frameDocuments()) {
      const visible = element => element.getClientRects().length > 0 &&
        doc.defaultView.getComputedStyle(element).visibility !== 'hidden';
      const candidates = doc.querySelectorAll(
        '.x-boundlist-item, .x-combo-list-item, [role="option"], .x-menu-item-text, ' +
        '.x-datepicker .x-btn, .x-datepicker [role="button"], .x-datepicker button, .x-datepicker-today'
      );
      for (const element of candidates) {
        if (!visible(element)) continue;
        const text = cleanLabel(element.textContent || '');
        let target = null;
        if (/^haliyle çıkış(?:\s*\/\s*taburcu)?$/u.test(text)) target = 'haliyle-çıkış';
        if (/^(bugün|today)(?:\s|\(|$)/u.test(text)) target = 'bugün';
        if (!target) continue;
        const snapshot = {
          capturedAt: now, frame: path, target,
          element: describe(element), ancestors: technicalAncestors(element)
        };
        const key = path + ':' + target;
        dischargePopupCache.set(key, snapshot);
      }
    }
  };
  setInterval(captureDischargePopups, 400);

  const inspectFields = () => {
    document.getElementById('form-teknik-panel')?.remove();
    const report = { version: '3.6.25', fields: [], saveButtons: [], choices: [], actions: [], tabs: [], editors: [], diagnosisStructure: [], dischargeStructure: [] };
    for (const { doc, path } of frameDocuments()) {
      const isVisible = element => element.getClientRects().length > 0 &&
        doc.defaultView.getComputedStyle(element).visibility !== 'hidden';
      const recorded = new Set();
      const addField = (label, element) => {
        if (!element || recorded.has(element) || !isVisible(element)) return;
        recorded.add(element);
        report.fields.push({ frame: path, label, ...describe(element) });
        if (label.startsWith('cikis-')) report.dischargeStructure.push({ frame: path, target: label, ancestors: technicalAncestors(element) });
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
          if (label.startsWith('tamam')) {
            report.diagnosisStructure.push({
              frame: path, target: 'tamam', ancestors: technicalAncestors(action)
            });
          }
        }
      }
      for (const tab of doc.querySelectorAll('[role="tab"], .x-tab')) {
        if (!isVisible(tab)) continue;
        const label = cleanLabel(tab.textContent || '');
        if (['doktor notları', 'muayene bilgileri', 'tanılar', 'sık kullanılan tanılar', 'çıkış bilgileri'].includes(label)) {
          report.tabs.push({ frame: path, label, ...describe(tab) });
        }
      }
      for (const today of doc.querySelectorAll(
        '.x-datepicker .x-btn, .x-datepicker [role="button"], .x-datepicker button, .x-datepicker-today'
      )) {
        const text = cleanLabel(today.textContent || '');
        if (isVisible(today) && /^(bugün|today)(?:\s|\(|$)/u.test(text)) {
          report.actions.push({ frame: path, label: 'bugün', ...describe(today) });
          report.dischargeStructure.push({
            frame: path, target: 'bugün', ancestors: technicalAncestors(today)
          });
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
          report.diagnosisStructure.push({
            frame: path, target: 'z00.0', ancestors: technicalAncestors(cell)
          });
        }
      }
      for (const option of doc.querySelectorAll('[role="option"], .x-boundlist-item, .x-combo-list-item')) {
        const label = cleanLabel(option.textContent || '');
        if (isVisible(option) && ['araç', 'yeşil', 'enjeksiyon', 'pansuman', 'sevgi sever', 'haliyle çıkış/taburcu', 'haliyle çıkış / taburcu', 'haliyle çıkış'].includes(label)) {
          report.choices.push({ frame: path, label, ...describe(option) });
        }
      }
    }
    captureDischargePopups();
    report.dischargePopupSnapshots = [...dischargePopupCache.values()];
    const panel = document.createElement('div');
    panel.id = 'form-teknik-panel';
    panel.style.cssText = 'position:fixed;inset:10% 10%;z-index:2147483647;background:white;color:black;padding:20px;border:2px solid #333;box-shadow:0 4px 20px #0008;font:14px Arial;display:flex;flex-direction:column;gap:12px';
    const heading = document.createElement('strong');
    heading.textContent = 'Alan tanıma raporu — 3.6.25';
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
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.textContent = 'Raporu kopyala';
    copy.onclick = async () => {
      const label = 'Kopyalandı · ' + report.version;
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard API yok');
        await navigator.clipboard.writeText(output.value);
        copy.textContent = label;
      } catch (_) {
        output.focus();
        output.select();
        let copied = false;
        try { copied = document.execCommand('copy'); } catch (_) {}
        copy.textContent = copied ? label : 'Kopyalanamadı — Raporu indir düğmesini kullan';
      }
    };
    const download = document.createElement('button');
    download.type = 'button';
    download.textContent = 'Raporu indir (.json)';
    download.onclick = () => {
      const blob = new Blob([output.value], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'hbys-teknik-rapor-' + report.version + '.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    };
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'Kapat';
    close.onclick = () => panel.remove();
    panel.append(heading, note, output, copy, download, select, close);
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
  const chooseValue = async (doc, step, force = false) => {
    if (!force && expectedValue(doc, step)) return;
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

    if (force && ['acilGelisSekli', 'triaj'].includes(step.name)) {
      for (const type of ['mousedown', 'mouseup', 'click']) {
        option.dispatchEvent(new doc.defaultView.MouseEvent(type, {
          bubbles: true, cancelable: true, view: doc.defaultView,
          button: 0, buttons: type === 'mousedown' ? 1 : 0
        }));
      }
      field.blur();
      await pause(150);
    } else {
      option.click();
    }
    if (option.closest('.x-grid-row, .x-grid3-row, .x-grid-item, [role="row"]') &&
        option.isConnected && shown(option)) {
      option.dispatchEvent(new doc.defaultView.MouseEvent('dblclick', {
        bubbles: true, cancelable: true, view: doc.defaultView
      }));
    }
    await waitUntil(() => expectedValue(doc, step),
      step.label + ' seçimi doğrulanamadı. Kayıt yapılmadı.');
  };
  const dutyDoctorForRegistration = () => {
    // Eski yükleyicide mevcut davranış korunur; yeni menü için yükleyici 3.4.1 gerekir.
    const value = typeof formDoldurSettings === 'object' && formDoldurSettings &&
      typeof formDoldurSettings.getDutyDoctor === 'function'
      ? formDoldurSettings.getDutyDoctor() : 'Sevgi Sever';
    if (typeof value !== 'string' || /[\r\n]/u.test(value)) {
      throw new Error('Nöbetçi doktor adını menüden yeniden gir.');
    }
    const name = value.replace(/\s+/g, ' ').trim();
    if (!name || name.length > 120) throw new Error('Geçerli bir nöbetçi doktor adı gir.');
    return name;
  };
  const registrationStepsForUnit = unit => {
    const doctor = dutyDoctorForRegistration();
    const steps = baseSteps.map(step => step.name === 'birim' ? { ...step, value: unit } :
      step.name === 'personel' ? { ...step, value: doctor } : step);
    if (unit !== 'Acil Servis') return steps;
    // Acil birimi/doktoru seçildikten sonra geliş şeklini yeniden seç.
    return ['birim', 'personel', 'acilGelisSekli', 'triaj']
      .map(name => steps.find(step => step.name === name));
  };
  const runShortcut = async (unit = 'Enjeksiyon') => {
    if (shortcutBusy) return;
    if (!['Enjeksiyon', 'Pansuman', 'Acil Servis'].includes(unit)) return;
    let shortcutSteps;
    try {
      shortcutSteps = registrationStepsForUnit(unit);
    } catch (error) {
      alert('Nöbetçi doktor ayarı: ' + error.message);
      return;
    }
    const shortcutName = unit === 'Acil Servis' ? 'Alt+3' : unit === 'Pansuman' ? 'Alt+2' : 'Alt+1';
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
        await chooseValue(doc, step, unit === 'Acil Servis' && ['acilGelisSekli', 'triaj'].includes(step.name));
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
      alert('[3.6.25] ' + (saveClicked ? 'Kaydet işleminin sonucunu ekrandan kontrol et. ' : shortcutName + ' durdu: ') +
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


  // Poliklinik akışı: sabit kimlikler yerine raporlanan alan ve düğme adları.
  const outpatientLabel = element => cleanLabel(element.textContent || '')
    .replace(/\s*[\[(]f\d+[\])]\s*$/u, '').trim();
  const outpatientActions = (root, label) =>
    [...root.querySelectorAll('a[role="button"], button, .x-btn')]
      .filter(element => shown(element) && outpatientLabel(element) === label &&
        !element.closest('[disabled], [aria-disabled="true"], .x-item-disabled'));
  const uniqueAction = (root, label) => {
    const matches = outpatientActions(root, label);
    if (matches.length !== 1) throw new Error('"' + label + '" düğmesi tek ve etkin olarak bulunamadı.');
    return matches[0];
  };
  const outpatientTabs = (root, label) =>
    [...root.querySelectorAll('.x-tab, [role="tab"]')]
      .filter(tab => shown(tab) && cleanLabel(tab.textContent || '') === label);
  const diagnosisCells = (root, code = 'Z00.0') => {
    const rows = new Map();
    for (const cell of root.querySelectorAll(
      '.x-grid-cell-inner, .x-grid3-cell-inner, [role="gridcell"]'
    )) {
      if (normalize(cell.textContent || '') !== normalize(code)) continue;
      const row = cell.closest('.x-grid-row, .x-grid3-row, .x-grid-item, [role="row"]');
      const target = cell.querySelector('.x-grid-cell-inner, .x-grid3-cell-inner') || cell;
      if (row && !rows.has(row)) rows.set(row, target);
    }
    return [...rows.values()];
  };
  const diagnosisWindows = doc => {
    const structuralMatches = new Set();
    for (const done of outpatientActions(doc, 'tamam')) {
      const window = done.closest('.x-window');
      if (!window || !window.isConnected) continue;
      const hasDiagnosis = [...diagnosisCells(window), ...diagnosisCells(window, 'Z54')].some(shown);
      const hasSearch = [...window.querySelectorAll('input[type="search"][name="name"]')].some(shown);
      if (hasDiagnosis && hasSearch) structuralMatches.add(window);
    }
    if (structuralMatches.size) return [...structuralMatches];
    const found = new Set();
    const titleMatches = text => normalize(text || '').replace(/[:\s]+$/u, '') ===
      'tanı ekleme listesi';
    const add = panel => {
      if (panel && shown(panel)) found.add(panel);
    };
    for (const panel of doc.querySelectorAll('.x-window, .x-panel, [role="dialog"]')) {
      if (titleMatches(panel.getAttribute('aria-label'))) add(panel);
      const ids = (panel.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean);
      if (ids.length && titleMatches(ids.map(id => doc.getElementById(id)?.textContent || '').join(' '))) {
        add(panel);
      }
    }
    for (const title of doc.querySelectorAll(
      '.x-window-header-text, .x-panel-header-text, .x-title-text, .x-header-text, ' +
      '[class*="header-text"], [id$="-header_hd-textEl"]'
    )) {
      if (!shown(title) || !titleMatches(title.textContent)) continue;
      add(title.closest('.x-window, .x-panel, [role="dialog"]'));
    }
    // Aynı pencerenin iç içe kökleri bulunursa en içteki başlıklı paneli kullan.
    return [...found].filter(panel =>
      ![...found].some(other => other !== panel && panel.contains(other)));
  };
  const diagnosisWindowIsOpen = dialog => dialog.isConnected &&
    outpatientActions(dialog, 'tamam').length > 0 &&
    [...diagnosisCells(dialog), ...diagnosisCells(dialog, 'Z54')].some(shown);
  const openOutpatientTab = (root, label) => {
    const tabs = outpatientTabs(root, label);
    if (tabs.length !== 1) throw new Error('"' + label + '" sekmesi tek olarak bulunamadı.');
    tabs[0].click();
  };
  const canonicalOutpatientUnit = text => {
    const raw = normalize(text || '');
    if (/[,;\n]/u.test(raw)) return null;
    const unit = raw.replace(/\s*\([^()]+\)\s*$/u, '').trim();
    return ['enjeksiyon', 'pansuman', 'acil servis'].includes(unit) ? unit : null;
  };
  const diagnosisForUnit = text => {
    const unit = canonicalOutpatientUnit(text);
    if (!unit) throw new Error('Tek bir hasta birimi doğrulanamadı. Tanı seçilmedi.');
    return unit === 'acil servis' ? 'Z00.0' : 'Z54';
  };
  const noteForUnit = text => {
    const unit = normalize(text).replace(/\s*\([^()]+\)\s*$/u, '').trim();
    if (unit === 'enjeksiyon') return 'Enjeksiyon yapıldı';
    if (unit === 'pansuman') return 'Pansuman yapıldı';
    return 'Dr yönlendirildi';
  };
  const outpatientUnitValue = field =>
    typeof field.value === 'string' ? field.value : (field.textContent || '').trim();
  const outpatientUnitField = (root, doc) => {
    const selector = 'input:not([type="hidden"]), .x-form-display-field, .x-form-field';
    const collect = scope => {
      const fields = new Set();
      const add = element => {
        if (element && scope.contains(element) && shown(element) &&
            canonicalOutpatientUnit(outpatientUnitValue(element))) fields.add(element);
      };
      for (const label of scope.querySelectorAll('label, .x-form-item-label, td, th, span')) {
        if (cleanLabel(label.textContent || '') !== 'birim' || !shown(label)) continue;
        const linked = label.getAttribute('for');
        const target = linked ? doc.getElementById(linked) : null;
        if (target?.matches(selector)) add(target);
        else target?.querySelectorAll(selector).forEach(add);
        const item = label.closest('.x-form-item, .x-field');
        item?.querySelectorAll(selector).forEach(add);
        // Muayene Bilgileri birimi düz tablo hücresi veya metin öğesi olarak gösterebilir.
        const cell = label.matches('td, th') ? label : label.closest('td, th');
        const sibling = cell?.nextElementSibling || label.nextElementSibling;
        if (sibling && scope.contains(sibling)) {
          const controls = [...sibling.querySelectorAll(selector)].filter(element =>
            shown(element) && canonicalOutpatientUnit(outpatientUnitValue(element)));
          if (controls.length) controls.forEach(add);
          else add(sibling);
        }
      }
      return [...fields].filter(element => ![...fields].some(other =>
        element !== other && element.contains(other)));
    };
    const anchors = [...root.querySelectorAll('input[name="pol.triaj"]')];
    if (anchors.length !== 1) throw new Error('Poliklinik formu tek olarak belirlenemedi. Tanı seçilmedi.');
    let scope = anchors[0].parentElement;
    while (scope && root.contains(scope)) {
      const fields = collect(scope);
      if (fields.length === 1) return fields[0];
      if (fields.length > 1) throw new Error('Birden fazla hasta birimi bulundu. Tanı seçilmedi.');
      if (scope === root) break;
      scope = scope.parentElement;
    }
    throw new Error('Hastanın tek Birim değeri okunamadı; toplu birim filtresi kullanılmadı. Tanı seçilmedi.');
  };
  let outpatientRunning = false;
  const runOutpatient = async () => {
    if (outpatientRunning || shortcutBusy) return;
    outpatientRunning = true;
    // Hasta kayıt kısayolları bu akışla aynı anda çalışmasın.
    shortcutBusy = true;
    let outpatientStage = 'Poliklinik ekranını bulma';
    const release = () => {
      outpatientRunning = false;
      shortcutBusy = false;
    };
    try {
      if (document.getElementById('form-teknik-panel')) throw new Error('Önce teknik raporu kapat.');
      const contexts = [];
      for (const { doc } of frameDocuments()) {
        for (const anchor of doc.querySelectorAll('input[name="pol.triaj"]')) {
          let root = anchor.parentElement;
          while (root) {
            if (shown(root) && outpatientTabs(root, 'doktor notları').length === 1 &&
                outpatientTabs(root, 'muayene bilgileri').length === 1 &&
                (outpatientActions(root, 'kabul').length || outpatientActions(root, 'kaydet').length)) {
              contexts.push({ doc, root, anchor });
              break;
            }
            root = root.parentElement;
          }
        }
      }
      if (contexts.length !== 1) throw new Error('Tek bir açık Poliklinik ekranı bulunamadı.');
      const { doc, root, anchor } = contexts[0];
      const selectedRows = [...doc.querySelectorAll(
        '.x-grid-row-selected, .x-grid3-row-selected, .x-grid-item-selected'
      )].filter(shown);
      if (selectedRows.length !== 1) {
        throw new Error('Soldaki hasta listesinden tek bir hasta seç; açık seçim listelerini kapat.');
      }
      const patientRow = selectedRows[0];
      // Yalnızca bellekte karşılaştırılır; rapora, depoya veya ağa gönderilmez.
      const patientSnapshot = patientRow.textContent;
      const assertPatient = () => {
        const stillSelected = patientRow.matches(
          '.x-grid-row-selected, .x-grid3-row-selected, .x-grid-item-selected'
        );
        if (!root.isConnected || !anchor.isConnected || !patientRow.isConnected ||
            !stillSelected || patientRow.textContent !== patientSnapshot) {
          throw new Error('Seçili hasta veya ekran değişti. İşlem durduruldu.');
        }
      };
      const waitFor = find => waitUntil(() => {
        assertPatient();
        return find();
      }, outpatientStage + ' tamamlanmadı. Kayıt yapılmadı.');
      assertPatient();
      if (diagnosisWindows(doc).length) throw new Error('Önce açık tanı listesini kapat.');
      const accepts = outpatientActions(root, 'kabul');
      if (accepts.length > 1) throw new Error('Birden fazla Kabul düğmesi bulundu.');
      if (accepts.length === 1) {
        outpatientStage = 'Kabul sonrası Kaydet düğmesini bekleme';
        accepts[0].click();
        await waitFor(() => outpatientActions(root, 'kaydet').length === 1);
      } else if (outpatientActions(root, 'kaydet').length !== 1) {
        throw new Error('Kabul durumu belirlenemedi.');
      }
      assertPatient();
      outpatientStage = 'Muayene Bilgileri sekmesini açma';
      openOutpatientTab(root, 'muayene bilgileri');
      await waitFor(() => outpatientTabs(root, 'muayene bilgileri')[0]?.className.includes('active'));
      const unitField = outpatientUnitField(root, doc);
      const unitSnapshot = outpatientUnitValue(unitField);
      const diagnosisCode = diagnosisForUnit(unitSnapshot);
      if (!diagnosisCells(root, diagnosisCode).length) {
        outpatientStage = 'Tanı Ekleme Listesi penceresini bulma';
        uniqueAction(root, 'ekle').click();
        const dialog = await waitFor(() => {
          const dialogs = diagnosisWindows(doc);
          if (dialogs.length > 1) throw new Error('Birden fazla tanı listesi açıldı.');
          return dialogs[0];
        });
        outpatientStage = 'Listede ' + diagnosisCode + ' satırını bulma';
        const options = await waitFor(() => {
          const cells = diagnosisCells(dialog, diagnosisCode).filter(shown);
          if (cells.length > 1) throw new Error(diagnosisCode + ' listede birden fazla satırda bulundu.');
          return cells.length === 1 ? cells : null;
        });
        const cell = options[0];
        outpatientStage = diagnosisCode + ' tanısını sağdaki Seçilen Tanılar listesine aktarma';
        assertPatient();
        // Hücre içeriğine normal bir çift tıklamanın tüm fare olaylarını gönder.
        for (const [type, detail] of [
          ['mousedown', 1], ['mouseup', 1], ['click', 1],
          ['mousedown', 2], ['mouseup', 2], ['click', 2], ['dblclick', 2]
        ]) {
          if (!cell.isConnected || !shown(cell) || !diagnosisWindowIsOpen(dialog)) break;
          cell.dispatchEvent(new doc.defaultView.MouseEvent(type, {
            bubbles: true, cancelable: true, view: doc.defaultView,
            button: 0, buttons: type === 'mousedown' ? 1 : 0, detail
          }));
        }
        await waitFor(() => diagnosisCells(dialog, diagnosisCode).length > options.length ||
          (!diagnosisWindowIsOpen(dialog) && diagnosisCells(root, diagnosisCode).length > 0));
        outpatientStage = 'Tamam sonrası tanının ana ekranda görünmesini bekleme';
        if (diagnosisWindowIsOpen(dialog)) uniqueAction(dialog, 'tamam').click();
        await waitFor(() => !diagnosisWindowIsOpen(dialog) && diagnosisCells(root, diagnosisCode).length > 0);
      }
      assertPatient();
      outpatientStage = 'Doktor Notları alanını bulma';
      openOutpatientTab(root, 'doktor notları');
      const note = await waitFor(() => {
        const matches = [...root.querySelectorAll('textarea[name="sikayet"]')]
          .filter(element => shown(element) && !element.disabled && !element.readOnly);
        if (matches.length > 1) throw new Error('Birden fazla not alanı bulundu.');
        return matches[0];
      });
      const phrase = noteForUnit(unitSnapshot);
      const previous = note.value;
      const alreadyPresent = previous.split(/\r?\n/).some(line => normalize(line) === normalize(phrase));
      const next = alreadyPresent ? previous : previous + (previous && !previous.endsWith('\n') ? '\n' : '') + phrase;
      if (next !== previous) {
        const setter = Object.getOwnPropertyDescriptor(
          doc.defaultView.HTMLTextAreaElement.prototype, 'value'
        ).set;
        setter.call(note, next);
        note.dispatchEvent(new doc.defaultView.Event('input', { bubbles: true }));
        note.dispatchEvent(new doc.defaultView.Event('change', { bubbles: true }));
        note.blur();
      }
      outpatientStage = 'Notun alana aktarılmasını doğrulama';
      await waitFor(() => note.value === next);
      assertPatient();
      if (!unitField.isConnected || outpatientUnitValue(unitField) !== unitSnapshot) {
        throw new Error('Poliklinik birimi değişti. Kayıt yapılmadı.');
      }
      if (!note.isConnected || note.value !== next || !diagnosisCells(root, diagnosisCode).length) {
        throw new Error('Tanı veya not değişti. Kayıt yapılmadı.');
      }
      uniqueAction(root, 'kaydet').click();
    } catch (error) {
      alert('[3.6.25] Poliklinik: ' + error.message);
    } finally {
      release();
    }
  };

  const macroItems = [
    { code: '530140', label: 'Enjeksiyon' },
    { code: '530580', label: 'Pansuman' },
    { code: '530100', label: 'EKG' },
    { code: '530080', label: 'Damar yolu' },
    { code: '530160', label: 'IV' },
    { code: '530350', label: 'Nebül' },
    { code: '530360', label: 'Oksijen' },
    { code: '510120', label: 'Yatış' }
  ];
  let macroMenu = null;
  const closeMacroMenu = () => {
    macroMenu?.remove();
    macroMenu = null;
  };
  const macroCodeFields = (root, doc) => {
    const matches = new Set();
    const add = field => {
      if (field?.matches('input') && root.contains(field) && shown(field) &&
          !field.disabled && !field.readOnly) matches.add(field);
    };
    for (const label of root.querySelectorAll('label, .x-form-item-label, td, th, span')) {
      if (!shown(label) || !/^makro\s*kodu$/u.test(cleanLabel(label.textContent || ''))) continue;
      const linked = label.getAttribute('for');
      if (linked) add(doc.getElementById(linked));
      label.closest('.x-form-item, .x-field')?.querySelectorAll('input:not([type="hidden"])').forEach(add);
      const cell = label.matches('td, th') ? label : label.closest('td, th');
      const sibling = cell?.nextElementSibling || label.nextElementSibling;
      if (sibling) {
        add(sibling);
        sibling.querySelectorAll('input:not([type="hidden"])').forEach(add);
      }
    }
    return [...matches];
  };
  const macroPatientRows = doc => [...doc.querySelectorAll(
    '.x-grid-row-selected, .x-grid3-row-selected, .x-grid-item-selected'
  )].filter(row => {
    if (!shown(row)) return false;
    const grid = row.closest('.x-grid, .x-grid-panel');
    if (!grid) return false;
    const headers = [...grid.querySelectorAll('.x-column-header-text, [role="columnheader"]')]
      .map(header => cleanLabel(header.textContent || '').replace(/[\s.:*]/gu, ''));
    const hasName = headers.some(header =>
      ['adısoyadı', 'adsoyad', 'adsoyadı', 'adıvesoyadı'].includes(header));
    return hasName && headers.includes('sevktarihi');
  });
  const macroContext = () => {
    const contexts = [];
    for (const { doc } of frameDocuments()) {
      for (const anchor of doc.querySelectorAll('input[name="pol.triaj"]')) {
        let root = anchor.parentElement;
        while (root) {
          if (shown(root) && outpatientTabs(root, 'doktor notları').length === 1 &&
              macroCodeFields(root, doc).length === 1) {
            contexts.push({ doc, root, anchor, field: macroCodeFields(root, doc)[0] });
            break;
          }
          root = root.parentElement;
        }
      }
    }
    if (contexts.length !== 1) throw new Error('Tek bir Poliklinik Makro Kodu alanı bulunamadı. Teknik rapor gerekli.');
    const context = contexts[0];
    const selected = macroPatientRows(context.doc);
    if (selected.length !== 1) throw new Error('Soldaki hasta listesinden tek hasta seç.');
    context.patientRow = selected[0];
    context.patientSnapshot = selected[0].textContent;
    return context;
  };
  const macroPatientStable = context => {
    const selected = macroPatientRows(context.doc);
    // Liste yüklenirken seçili satır kısa süre kaybolabilir; sadece bekle.
    if (!selected.length) return false;
    if (selected.length !== 1 || selected[0].textContent !== context.patientSnapshot) {
      throw new Error('Seçili hasta veya başvuru değişti. İşlem durduruldu.');
    }
    return true;
  };
  const assertMacroContext = context => {
    const { field, anchor, root } = context;
    if (!macroPatientStable(context)) throw new Error('Seçili hasta doğrulanamadı. İşlem durduruldu.');
    if (!field.isConnected || !anchor.isConnected || !root.isConnected ||
        !shown(field) || field.disabled || field.readOnly) {
      throw new Error('Makro Kodu alanı şu anda kullanılamıyor. İşlem durduruldu.');
    }
  };
  const macroRows = (root, code) => {
    const rows = new Map();
    for (const cell of root.querySelectorAll('.x-grid-cell-inner, .x-grid3-cell-inner, [role="gridcell"]')) {
      if (!shown(cell) || !new RegExp('^' + code + '(?:\\D|$)', 'u').test((cell.textContent || '').trim())) continue;
      const row = cell.closest('.x-grid-row, .x-grid3-row, .x-grid-item, [role="row"]');
      if (row) rows.set(row, row.textContent);
    }
    return rows;
  };
  const macroAddButton = context => {
    let scope = context.field.parentElement;
    while (scope && context.root.contains(scope)) {
      const buttons = [...scope.querySelectorAll('a[role="button"], button, .x-btn, [role="button"]')]
        .filter(button => shown(button) &&
          cleanLabel(button.textContent || '').replace(/\s+/gu, '') === 'makroekle' &&
          !button.closest('[disabled], [aria-disabled="true"], .x-item-disabled'));
      if (buttons.length === 1) return buttons[0];
      if (buttons.length > 1) throw new Error('Birden fazla Makro Ekle düğmesi bulundu. İşlem yapılmadı.');
      if (scope === context.root) break;
      scope = scope.parentElement;
    }
    throw new Error('Makro Kodu alanına ait etkin Makro Ekle düğmesi bulunamadı.');
  };
  const typeMacroCode = async (context, code) => {
    const { doc, field } = context;
    assertMacroContext(context);
    field.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    for (const type of ['mousedown', 'mouseup', 'click']) {
      field.dispatchEvent(new doc.defaultView.MouseEvent(type, {
        bubbles: true, cancelable: true, view: doc.defaultView, button: 0,
        buttons: type === 'mousedown' ? 1 : 0
      }));
    }
    field.focus();
    await waitUntil(() => {
      assertMacroContext(context);
      return doc.activeElement === field;
    }, 'Makro Kodu alanına odaklanılamadı. Kod yazılmadı.');
    const setter = Object.getOwnPropertyDescriptor(doc.defaultView.HTMLInputElement.prototype, 'value').set;
    let typed = '';
    for (const digit of code) {
      assertMacroContext(context);
      if (field.value !== typed) throw new Error('Yazım sırasında Makro Kodu alanı değişti. İşlem durduruldu.');
      for (const type of ['keydown', 'keypress']) {
        const accepted = field.dispatchEvent(new doc.defaultView.KeyboardEvent(type, {
          key: digit, code: 'Digit' + digit, keyCode: 48 + Number(digit),
          which: 48 + Number(digit), charCode: type === 'keypress' ? 48 + Number(digit) : 0,
          bubbles: true, cancelable: true
        }));
        if (!accepted) throw new Error('HBYS makro kodu tuş girişini kabul etmedi.');
      }
      typed += digit;
      setter.call(field, typed);
      field.dispatchEvent(new doc.defaultView.Event('input', { bubbles: true }));
      field.dispatchEvent(new doc.defaultView.KeyboardEvent('keyup', {
        key: digit, code: 'Digit' + digit, keyCode: 48 + Number(digit),
        which: 48 + Number(digit), bubbles: true
      }));
      await pause(40);
    }
    // Ext JS'nin gecikmeli alan değişikliği kontrolünün tamamlanmasına izin ver.
    await pause(750);
    await waitUntil(() => macroPatientStable(context), 'Seçili hasta yükleme sonrasında doğrulanamadı.');
    // Kod işlendiğinde alan yenilenmiş veya kilitlenmiş olabilir. Eski alana dokunma.
    if (field.isConnected && shown(field) && !field.disabled && !field.readOnly &&
        field.value === code) {
      field.dispatchEvent(new doc.defaultView.Event('change', { bubbles: true }));
      field.blur();
      await pause(150);
    }
  };
  const enterMacro = async (context, item, fromBatch = false) => {
    if (shortcutBusy && !fromBatch) return false;
    shortcutBusy = true;
    let sent = false;
    try {
      if (!macroItems.some(macro => macro.code === item.code && macro.label === item.label)) {
        throw new Error('Tanımsız makro.');
      }
      assertMacroContext(context);
      const { doc, field, root } = context;
      if (field.value.trim()) throw new Error('Makro Kodu alanı dolu. Önce mevcut kodu kontrol edip temizle.');
      const addButton = macroAddButton(context);
      const previous = macroRows(root, item.code);
      closeMacroMenu();
      sent = true;
      await typeMacroCode(context, item.code);
      // Bazı ekranlar kod değişince kendiliğinden ekleyebilir; tekrar eklemeyi önle.
      const changed = [...macroRows(root, item.code)].some(([row, text]) =>
        !previous.has(row) || previous.get(row) !== text);
      if (!changed && field.isConnected && shown(field) && !field.disabled &&
          !field.readOnly && field.value.trim() === item.code && addButton.isConnected &&
          !addButton.closest('[disabled], [aria-disabled="true"], .x-item-disabled')) {
        assertMacroContext(context);
        addButton.click();
      }
      // Gönderimden sonra hasta kontrolü sürer; giriş alanının yeniden çizilmesini hata sayma.
      await waitUntil(() => {
        if (!macroPatientStable(context)) return false;
        const current = macroRows(root.isConnected ? root : doc, item.code);
        return [...current].some(([row, text]) => !previous.has(row) || previous.get(row) !== text);
      }, 'Kod bir kez gönderildi; listede eklenmesi doğrulanamadı. Tekrar seçmeden önce Hizmet Listesi’ni kontrol et.');
      if (item.code === '510120') {
        alert('Yatış makrosu listede görüldü. Gözleme alma adımı henüz bağlı değil; Tedavi alanını elle kontrol et.');
      }
      return true;
    } catch (error) {
      alert('[3.6.25] Makro: ' + error.message +
        (sent ? ' Kod otomatik yeniden gönderilmedi.' : ' Kod gönderilmedi.'));
      return false;
    } finally {
      if (!fromBatch) shortcutBusy = false;
    }
  };
  let macroBatchActive = false;
  let macroBatchCancel = false;
  const runMacroBatch = async (original, selected) => {
    if (shortcutBusy || outpatientRunning || macroBatchActive || !selected.length) return;
    if (new Set(selected.map(item => item.code)).size !== selected.length ||
        selected.some(item => !macroItems.some(allowed => allowed.code === item.code && allowed.label === item.label))) return;
    shortcutBusy = true;
    macroBatchActive = true;
    macroBatchCancel = false;
    closeMacroMenu();
    const progress = document.createElement('div');
    progress.style.cssText = 'position:fixed;left:12px;top:20%;z-index:2147483647;background:white;color:#111;border:2px solid #285c8c;padding:12px;font:14px Arial;display:flex;flex-direction:column;gap:8px';
    progress.setAttribute('role', 'status');
    const text = document.createElement('span');
    const stop = document.createElement('button');
    stop.type = 'button';
    stop.textContent = 'Sıradakileri durdur';
    stop.onclick = () => { macroBatchCancel = true; stop.disabled = true; };
    progress.append(text, stop);
    document.body.appendChild(progress);
    let completed = 0;
    let previousCode = null;
    try {
      for (const item of selected) {
        if (macroBatchCancel) break;
        text.textContent = (completed + 1) + '/' + selected.length + ' · ' + item.label;
        const context = await waitUntil(() => {
          if (macroBatchCancel) throw new Error('Kalan makrolar kullanıcı tarafından durduruldu.');
          if (!macroPatientStable(original)) return null;
          let latest;
          try { latest = macroContext(); } catch (_) { return null; }
          if (latest.doc !== original.doc || latest.patientSnapshot !== original.patientSnapshot) {
            throw new Error('Hasta veya başvuru değişti. Kalan makrolar gönderilmedi.');
          }
          return latest;
        }, 'Makro Kodu alanı yeniden hazır olmadı. Kalan makrolar gönderilmedi.');
        assertMacroContext(context);
        // Yalnızca az önce başarıyla doğruladığımız kod alanda kaldıysa temizle.
        if (previousCode && context.field.value.trim() === previousCode) {
          const setter = Object.getOwnPropertyDescriptor(
            context.doc.defaultView.HTMLInputElement.prototype, 'value'
          ).set;
          setter.call(context.field, '');
          context.field.dispatchEvent(new context.doc.defaultView.Event('input', { bubbles: true }));
          context.field.dispatchEvent(new context.doc.defaultView.Event('change', { bubbles: true }));
        }
        if (macroBatchCancel) break;
        const success = await enterMacro(context, item, true);
        if (!success) break;
        completed++;
        previousCode = item.code;
      }
    } catch (error) {
      alert('[3.6.25] Makro: ' + error.message);
    } finally {
      shortcutBusy = false;
      macroBatchActive = false;
      stop.remove();
      text.textContent = completed + '/' + selected.length + ' makro listede doğrulandı.' +
        (completed < selected.length ? ' Kalanlar gönderilmedi.' : '');
      setTimeout(() => progress.remove(), 5000);
    }
  };
  const toggleMacroMenu = () => {
    if (macroMenu) { closeMacroMenu(); return; }
    if (shortcutBusy || outpatientRunning) return;
    try {
      if (document.getElementById('form-teknik-panel')) throw new Error('Önce teknik raporu kapat.');
      const context = macroContext();
      assertMacroContext(context);
      const panel = document.createElement('div');
      panel.id = 'poliklinik-makro-menu';
      panel.style.cssText = 'position:fixed;left:12px;top:20%;z-index:2147483647;background:white;color:#111;border:2px solid #285c8c;border-radius:8px;padding:12px;font:14px Arial;box-shadow:0 3px 14px #0005;display:flex;flex-direction:column;gap:6px';
      const heading = document.createElement('strong');
      heading.textContent = 'Makrolar · Alt+5 / Esc ile kapat';
      panel.appendChild(heading);
      const selectedCodes = new Set();
      const submit = document.createElement('button');
      submit.type = 'button';
      submit.textContent = 'Seçilenleri ekle (0)';
      submit.disabled = true;
      for (const item of macroItems) {
        const row = document.createElement('label');
        row.style.cssText = 'padding:7px 10px;cursor:pointer;display:flex;gap:8px;align-items:center';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.addEventListener('change', () => {
          if (checkbox.checked) selectedCodes.add(item.code);
          else selectedCodes.delete(item.code);
          submit.disabled = selectedCodes.size === 0;
          submit.textContent = 'Seçilenleri ekle (' + selectedCodes.size + ')';
        });
        const label = document.createElement('span');
        label.textContent = item.code + ' · ' + item.label;
        row.append(checkbox, label);
        panel.appendChild(row);
      }
      submit.addEventListener('click', () => {
        if (submit.disabled) return;
        submit.disabled = true;
        void runMacroBatch(context, macroItems.filter(item => selectedCodes.has(item.code)));
      });
      panel.appendChild(submit);
      const close = document.createElement('button');
      close.type = 'button';
      close.textContent = 'Kapat';
      close.onclick = closeMacroMenu;
      panel.appendChild(close);
      macroMenu = panel;
      document.body.appendChild(panel);
    } catch (error) {
      alert('[3.6.25] Makro: ' + error.message);
    }
  };
  const isMacroKey = event => event.altKey && !event.ctrlKey && !event.shiftKey && !event.metaKey &&
    (['Digit5', 'Numpad5'].includes(event.code) || event.key === '5' || event.keyCode === 53 || event.keyCode === 101);

  const shortcutNumber = event => {
    if (!event.altKey || event.shiftKey || event.ctrlKey || event.metaKey) return 0;
    if (['Digit1', 'Numpad1'].includes(event.code) || event.key === '1' ||
        event.keyCode === 49 || event.keyCode === 97) return 1;
    if (['Digit2', 'Numpad2'].includes(event.code) || event.key === '2' ||
        event.keyCode === 50 || event.keyCode === 98) return 2;
    if (['Digit3', 'Numpad3'].includes(event.code) || event.key === '3' ||
        event.keyCode === 51 || event.keyCode === 99) return 3;
    if (['Digit4', 'Numpad4'].includes(event.code) || event.key === '4' ||
        event.keyCode === 52 || event.keyCode === 100) return 4;
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
        if ((event.key === 'Escape' || event.code === 'Escape') && macroBatchActive) {
          event.preventDefault();
          event.stopPropagation();
          macroBatchCancel = true;
          return;
        }
        if ((event.key === 'Escape' || event.code === 'Escape') && macroMenu) {
          event.preventDefault();
          event.stopPropagation();
          closeMacroMenu();
          return;
        }
        if (isMacroKey(event)) {
          event.preventDefault();
          event.stopPropagation();
          if (!event.repeat && !pressedShortcuts.has(5)) {
            pressedShortcuts.add(5);
            toggleMacroMenu();
          }
          return;
        }
        const number = shortcutNumber(event);
        if (number) {
          event.preventDefault();
          event.stopPropagation();
          if (event.repeat || pressedShortcuts.has(number)) return;
          pressedShortcuts.add(number);
          if (number === 4) void runOutpatient();
          else void runShortcut(number === 3 ? 'Acil Servis' : number === 2 ? 'Pansuman' : 'Enjeksiyon');
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
