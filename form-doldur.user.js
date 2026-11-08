// ==UserScript==
// @name         Form Doldur
// @namespace    local.atv.form
// @version      3.0.0
// @description  Tek düğmeyle askerlik ve engelli durumu seçer.
// @match        *://*/*
// @updateURL    https://raw.githubusercontent.com/oneraltintop/tampermonkey-formlar/main/form-doldur.user.js
// @downloadURL  https://raw.githubusercontent.com/oneraltintop/tampermonkey-formlar/main/form-doldur.user.js
// @run-at       document-idle
// @grant        none
// @noframes
// ==/UserScript==

(() => {
  'use strict';
  if (!['www.a101.com.tr', 'a101.com.tr'].includes(location.hostname) ||
      !/^\/kariyer\/?$/.test(location.pathname)) return;
  if (document.getElementById('a101-form-doldur')) return;

  const button = document.createElement('button');
  button.id = 'a101-form-doldur';
  button.type = 'button';
  button.textContent = 'Seçimleri Doldur';
  button.style.cssText = [
    'position:fixed', 'bottom:24px', 'right:24px',
    'z-index:2147483647', 'background:#007e91', 'color:white',
    'border:0', 'border-radius:10px', 'padding:14px 20px',
    'font:bold 16px Arial,sans-serif', 'cursor:pointer',
    'box-shadow:0 3px 12px #0005'
  ].join(';');

  const waitFor = (find, timeout = 3000) => new Promise((resolve, reject) => {
    const start = Date.now();
    const poll = () => {
      const result = find();
      if (result) return resolve(result);
      if (Date.now() - start >= timeout) return reject(new Error('Askerlik seçenekleri bulunamadı.'));
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
      if (!military || !disability) throw new Error('Kişisel Bilgiler adımındaki alanlar bulunamadı.');
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
        document.getElementById('militaryStatus')?.textContent.trim() === 'Yapıldı' &&
        document.getElementById('disabilityStatus-yes')?.checked
      );
      button.textContent = 'Seçildi ✓';
    } catch (error) {
      button.textContent = 'Seçimleri Doldur';
      alert(error.message);
    } finally {
      button.disabled = false;
    }
  });
  document.body.appendChild(button);
})();
