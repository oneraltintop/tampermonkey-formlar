// Form Doldur uygulaması — sürüm 3.2.0
(() => {
  'use strict';
  if (!['http:', 'https:'].includes(location.protocol)) return;
  if (['www.a101.com.tr', 'a101.com.tr'].includes(location.hostname) &&
      /^\/kariyer\/?$/.test(location.pathname)) return;
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
(() => {
  'use strict';
  if (!['www.a101.com.tr', 'a101.com.tr'].includes(location.hostname) ||
      !/^\/kariyer\/?$/.test(location.pathname)) return;
  if (document.getElementById('a101-form-doldur')) return;

  const button = document.createElement('button');
  button.id = 'a101-form-doldur';
  button.type = 'button';
  button.textContent = 'Yatalım artık';
  button.style.cssText = [
    'position:fixed', 'bottom:24px', 'left:24px',
    'z-index:2147483647', 'background:#000000', 'color:white',
    'border:0', 'border-radius:10px', 'padding:14px 20px',
    'font:bold 16px Arial,sans-serif', 'cursor:pointer',
    'box-shadow:0 3px 12px #0005'
  ].join(';');

  const waitFor = (find, timeout = 3000) => new Promise((resolve, reject) => {
    const start = Date.now();
    const poll = () => {
      const result = find();
      if (result) return resolve(result);
      if (Date.now() - start >= timeout) return reject(new Error('Alanlar beklenen değerlere getirilemedi.'));
      setTimeout(poll, 50);
    };
    poll();
  });

  button.addEventListener('click', async () => {
    if (button.disabled) return;
    button.disabled = true;
    button.textContent = 'Seçiliyor…';
    try {
      const military = document.getElementById('militaryStatus');
      const disability = document.getElementById('disabilityStatus-yes');
      const firstName = document.getElementById('firstName');
      if (!firstName || !military || !disability) throw new Error('Kişisel Bilgiler adımındaki alanlar bulunamadı.');
      // React'in kontrollü alan durumunu da güncelle.
      const view = firstName.ownerDocument.defaultView;
      const setValue = Object.getOwnPropertyDescriptor(view.HTMLInputElement.prototype, 'value').set;
      setValue.call(firstName, 'delioğlan');
      firstName.dispatchEvent(new view.Event('input', { bubbles: true }));
      firstName.dispatchEvent(new view.Event('change', { bubbles: true }));
      if (military.textContent.trim() !== 'Yapıldı') {
        if (military.getAttribute('aria-expanded') !== 'true') military.click();
        const option = await waitFor(() => {
          const list = document.querySelector('[role="listbox"][aria-label="Askerlik Durumu"]');
          return list && [...list.querySelectorAll('[role="option"]')]
            .find(item => item.textContent.trim() === 'Yapıldı');
        });
        option.click();
      }
      const yes = document.getElementById('disabilityStatus-yes');
      if (!yes) throw new Error('Engelli Durumu alanı bulunamadı.');
      if (!yes.checked) yes.click();
      // React güncellemesinden sonra sonuçları sayfadaki alanlardan doğrula.
      await waitFor(() =>
        document.getElementById('firstName')?.value === 'delioğlan' &&
        document.getElementById('militaryStatus')?.textContent.trim() === 'Yapıldı' &&
        document.getElementById('disabilityStatus-yes')?.checked
      );
      button.textContent = 'Seçildi ✓';
    } catch (error) {
      button.textContent = 'Yatalım artık';
      alert(error.message);
    } finally {
      button.disabled = false;
    }
  });
  const testButton = button.cloneNode(false);
  testButton.id = 'a101-form-deneme';
  testButton.textContent = 'DENEME';
  testButton.style.bottom = '84px';
  testButton.addEventListener('click', () => {
    testButton.textContent = 'Çalışıyor ✓';
  });
  document.body.appendChild(testButton);
  document.body.appendChild(button);
})();
