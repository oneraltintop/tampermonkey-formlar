// ==UserScript==
// @name         Form Doldur
// @namespace    local.atv.form
// @version      3.4.0
// @description  Hasta kayıt ekranında pencere kapatma kodunu GitHub'dan yükler.
// @match        *://hbys.aydinism.gov.tr/hbys-web/desktop/desktop.html*
// @updateURL    https://raw.githubusercontent.com/oneraltintop/tampermonkey-formlar/main/form-doldur.user.js
// @downloadURL  https://raw.githubusercontent.com/oneraltintop/tampermonkey-formlar/main/form-doldur.user.js
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @connect      api.github.com
// @noframes
// ==/UserScript==

(() => {
  'use strict';
  if (!['http:', 'https:'].includes(location.protocol)) return;

  // Bu izin yalnızca bu tarayıcıda saklanır; adres GitHub isteğine eklenmez.
  const permissionKey = 'form-doldur:enabled:' + location.origin + location.pathname;
  const defaultEnabled = location.hostname === 'hbys.aydinism.gov.tr' &&
    location.pathname === '/hbys-web/desktop/desktop.html';
  if (!defaultEnabled) return;
  const enabled = GM_getValue(permissionKey, defaultEnabled) === true;

  GM_registerMenuCommand(
    enabled ? 'Bu sayfada Form Doldur’u kapat' : 'Bu sayfada Form Doldur’u etkinleştir',
    () => {
      GM_setValue(permissionKey, !enabled);
      alert(enabled
        ? 'Bu sayfada Form Doldur kapatıldı. Açık düğmeleri kaldırmak için sayfayı yenile.'
        : 'Bu sayfada Form Doldur etkinleştirildi. Sayfayı yenile. Bu formun doldurma kodu ayrıca hazırlanmalıdır.');
    }
  );
  if (!enabled) return;
  if (document.getElementById('a101-form-doldur') ||
      document.getElementById('a101-form-loader')) return;

  const status = document.createElement('button');
  status.id = 'a101-form-loader';
  status.type = 'button';
  status.textContent = 'Form Doldur yükleniyor…';
  status.disabled = true;
  status.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:2147483647;background:#000;color:#fff;border:0;border-radius:10px;padding:14px 20px;font:bold 16px Arial,sans-serif';
  document.body.appendChild(status);

  const fail = (message, label = 'Yüklenemedi · Sayfayı yenile') => {
    status.textContent = label;
    status.title = message;
    console.error('[Form Doldur]', message);
  };

  const start = Date.now();
  let finished = false;
  let request;
  // anonymous isteklerde tarayıcının timeout seçeneğine ek olarak süreyi kendimiz sınırla.
  const timer = setTimeout(() => {
    if (finished) return;
    finished = true;
    request?.abort();
    fail('GitHub bağlantısı 15 saniyede tamamlanamadı.');
  }, 15000);
  const finish = (callback) => (...args) => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    callback(...args);
  };

  try {
    request = GM_xmlhttpRequest({
      method: 'GET',
      // Raw dosya adresi yerine Contents API: önbelleksiz güncel içerik iste.
      url: 'https://api.github.com/repos/oneraltintop/tampermonkey-formlar/contents/form-doldur.app.js?ref=main&t=' + start,
      headers: {
        Accept: 'application/vnd.github.raw+json',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache'
      },
      nocache: true,
      revalidate: true,
      timeout: 15000,
      anonymous: true,
      onload: finish((response) => {
        if (response.status === 403 || response.status === 429) {
          fail('GitHub erişimi veya istek sınırı. HTTP ' + response.status,
            'GitHub erişimi sınırlı · Biraz bekle');
          return;
        }
        if (response.status !== 200) {
          fail('GitHub kodu alınamadı. HTTP ' + response.status);
          return;
        }
        try {
          const source = response.responseText;
          const version = typeof source === 'string' &&
            source.match(/^\/\/ Form Doldur uygulaması — sürüm ([0-9.]+)\r?\n/);
          if (!version) throw new Error('GitHub beklenen uygulama kodunu döndürmedi.');
          new Function(source + '\n//# sourceURL=form-doldur.app.js')();
          const button = document.getElementById('a101-form-doldur');
          if (!button) {
            fail('Bu sayfa için uygulama koduna henüz form desteği eklenmedi.',
              'Bu sayfa için form henüz hazırlanmadı');
            return;
          }
          button.title = 'Yükleyici 3.4.0 · Uygulama ' + version[1] +
            ' · ' + ((Date.now() - start) / 1000).toFixed(1) + ' sn';
          status.remove();
        } catch (error) {
          fail(error.message);
        }
      }),
      onerror: finish(() => fail('GitHub bağlantısı kurulamadı.')),
      ontimeout: finish(() => fail('GitHub bağlantısı zaman aşımına uğradı.'))
    });
  } catch (error) {
    finish(() => fail(error.message))();
  }
})();
