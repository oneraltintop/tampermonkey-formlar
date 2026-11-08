// Form Doldur uygulaması — sürüm 3.1.4
(() => {
  'use strict';
  if (!['www.a101.com.tr', 'a101.com.tr'].includes(location.hostname) ||
      !/^\/kariyer\/?$/.test(location.pathname)) return;
  if (document.getElementById('a101-form-doldur')) return;

  const button = document.createElement('button');
  button.id = 'a101-form-doldur';
  button.type = 'button';
  button.textContent = 'başardık';
  button.style.cssText = [
    'position:fixed', 'bottom:24px', 'right:24px',
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
      button.textContent = 'başardık';
      alert(error.message);
    } finally {
      button.disabled = false;
    }
  });
  document.body.appendChild(button);
})();
