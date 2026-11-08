// ==UserScript==
// @name         Form Doldur
// @namespace    local.atv.form
// @version      3.1.0
// @description  A101 form kodunu GitHub'dan yükleyen sabit yükleyici.
// @match        *://*/*
// @updateURL    https://raw.githubusercontent.com/oneraltintop/tampermonkey-formlar/main/form-doldur.user.js
// @downloadURL  https://raw.githubusercontent.com/oneraltintop/tampermonkey-formlar/main/form-doldur.user.js
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @connect      raw.githubusercontent.com
// @noframes
// ==/UserScript==

(() => {
  'use strict';
  if (!['www.a101.com.tr', 'a101.com.tr'].includes(location.hostname) ||
      !/^\/kariyer\/?$/.test(location.pathname)) return;
  if (document.getElementById('a101-form-doldur') ||
      document.getElementById('a101-form-loader')) return;

  const status = document.createElement('button');
  status.id = 'a101-form-loader';
  status.type = 'button';
  status.textContent = 'Form Doldur yükleniyor…';
  status.disabled = true;
  status.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:2147483647;background:#000;color:#fff;border:0;border-radius:10px;padding:14px 20px;font:bold 16px Arial,sans-serif';
  document.body.appendChild(status);

  const fail = (message) => {
    status.textContent = 'Yüklenemedi · Sayfayı yenile';
    status.title = message;
    console.error('[Form Doldur]', message);
  };

  GM_xmlhttpRequest({
    method: 'GET',
    // Her açılışta yeni istek: tarayıcı önbelleğindeki eski kodu kullanma.
    url: 'https://raw.githubusercontent.com/oneraltintop/tampermonkey-formlar/main/form-doldur.app.js?t=' + Date.now(),
    timeout: 15000,
    anonymous: true,
    onload: (response) => {
      if (response.status !== 200 || !response.responseText.trim()) {
        fail('GitHub kodu alınamadı. HTTP ' + response.status);
        return;
      }
      try {
        // Yalnızca yukarıdaki sabit depodan gelen uygulama kodunu çalıştır.
        new Function(response.responseText + '\n//# sourceURL=form-doldur.app.js')();
        if (!document.getElementById('a101-form-doldur')) {
          throw new Error('Form düğmesi oluşturulamadı.');
        }
        status.remove();
      } catch (error) {
        fail(error.message);
      }
    },
    onerror: () => fail('GitHub bağlantısı kurulamadı.'),
    ontimeout: () => fail('GitHub bağlantısı zaman aşımına uğradı.')
  });
})();
