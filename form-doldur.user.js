// ==UserScript==
// @name         Form Doldur
// @namespace    local.atv.form
// @version      3.4.2
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
// @connect      127.0.0.1
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
  const doctorSettingKey = 'form-doldur:duty-doctor';
  const doctorSettings = {
    getLinkTestConfig: () => ({
      role: GM_getValue('form-doldur:link-test-role', ''),
      keyConfigured: /^[a-f0-9]{64}$/u.test(GM_getValue('form-doldur:link-test-key', ''))
    }),
    compareLinkFields: data => new Promise((resolve, reject) => {
      const key = GM_getValue('form-doldur:link-test-key', '');
      const role = GM_getValue('form-doldur:link-test-role', '');
      if (!/^[a-f0-9]{64}$/u.test(key) || !['registration', 'outpatient'].includes(role)) {
        reject(new Error('Bağlantı testi için profil görevi ve yerel anahtar ayarlanmalı.'));
        return;
      }
      GM_xmlhttpRequest({
        method: 'POST', url: 'http://127.0.0.1:8876/compare',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
        data: JSON.stringify({ role, client: data.client, tc: data.tc, encounter: data.encounter }),
        timeout: 4000, anonymous: true,
        onload: response => {
          try {
            if (response.status !== 200) throw new Error(response.status === 401 ?
              'Yerel bağlantı anahtarı uyuşmuyor.' : 'Yerel program isteği kabul etmedi.');
            const value = JSON.parse(response.responseText);
            if (value.mode !== 'snapshot_only') throw new Error('Beklenen test programı yanıtı alınamadı.');
            resolve(value);
          } catch (error) { reject(error); }
        },
        onerror: () => reject(new Error('Yerel programla bağlantı kurulamadı. BASLAT dosyası açık mı?')),
        ontimeout: () => reject(new Error('Yerel program yanıt vermedi.'))
      });
    }),
    getDutyDoctor: () => {
      const stored = GM_getValue(doctorSettingKey, 'Sevgi Sever');
      if (typeof stored !== 'string' || /[\r\n]/u.test(stored)) {
        throw new Error('Nöbetçi doktor ayarını menüden yeniden gir.');
      }
      const name = stored.replace(/\s+/g, ' ').trim();
      if (!name || name.length > 120) throw new Error('Geçerli bir nöbetçi doktor adı gir.');
      return name;
    }
  };
  GM_registerMenuCommand('Nöbetçi doktoru değiştir', () => {
    let current = '';
    try { current = doctorSettings.getDutyDoctor(); } catch (_) {}
    const input = prompt('Doktorun listede görünen tam adını yaz. Bu ayar yalnızca bu Chrome profilinde saklanır.', current);
    if (input === null) return;
    const name = input.replace(/\s+/g, ' ').trim();
    if (!name || name.length > 120 || /[\r\n]/u.test(input)) {
      alert('Ad boş bırakılamaz ve tek satır olmalıdır. Önceki ayar korundu.');
      return;
    }
    GM_setValue(doctorSettingKey, name);
    alert('Nöbetçi doktor: ' + name + '. Alt+1, Alt+2 ve Alt+3 bu doktoru kullanacak. Sayfayı yenilemene gerek yok.');
  });

  GM_registerMenuCommand('Bağlantı testi: yerel anahtarı gir', () => {
    const value = prompt('BASLAT penceresindeki 64 karakterlik yerel anahtarı yapıştır. Buraya hasta bilgisi girme.');
    if (value === null) return;
    const key = value.trim();
    if (!/^[a-f0-9]{64}$/u.test(key)) { alert('Yerel anahtar geçersiz. Eski ayar korundu.'); return; }
    GM_setValue('form-doldur:link-test-key', key);
    alert('Yerel test anahtarı kaydedildi. Sayfayı yenilemene gerek yok.');
  });
  for (const [role, label] of [['registration', 'Hasta Kabul'], ['outpatient', 'Poliklinik']]) {
    GM_registerMenuCommand('Bağlantı testi: bu profil ' + label, () => {
      GM_setValue('form-doldur:link-test-role', role);
      alert('Bu profil ' + label + ' olarak ayarlandı. Ctrl+Alt+1 yalnızca eşleştirme testi yapacak.');
    });
  }

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
          new Function('formDoldurSettings', source + '\n//# sourceURL=form-doldur.app.js')(doctorSettings);
          const button = document.getElementById('a101-form-doldur');
          if (!button) {
            fail('Bu sayfa için uygulama koduna henüz form desteği eklenmedi.',
              'Bu sayfa için form henüz hazırlanmadı');
            return;
          }
          button.title = 'Yükleyici 3.4.2 · Uygulama ' + version[1] +
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
