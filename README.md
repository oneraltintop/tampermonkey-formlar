# Tampermonkey Formlar

Form doldurma denemeleri için kişisel Tampermonkey betiği.

## Kurulum ve 3.2.0'a geçiş

1. Tarayıcıda Tampermonkey yüklü olsun.
2. [Form Doldur betiğini yükle veya güncelle](https://raw.githubusercontent.com/oneraltintop/tampermonkey-formlar/main/form-doldur.user.js).
3. Mevcut Form Doldur betiğini 3.2.0 sürümüne bir kez güncelle. Tampermonkey api.github.com bağlantısı için izin sorarsa kabul et. Sonraki normal uygulama değişiklikleri yalnızca sayfayı yenileyerek alınır.
4. Bağlantı yalnızca kod gösterirse Tampermonkey → Yönetim Paneli → Yardımcı Araçlar → URL'den içe aktar bölümüne aynı adresi yapıştır.
5. Eski yükleyici veya kopya betikleri kapat; yalnızca Form Doldur açık kalsın.
6. A101 kariyer sayfasını yenile. Siyah düğmede başardık görünmeli. Fareyi düğmede bekletince yükleyici sürümü, uygulama sürümü ve yükleme süresi görünür.

## Çalışma düzeni

- `form-doldur.user.js`: Tampermonkey'de kurulu kalan sabit yükleyici. Adı Form Doldur, namespace değeri local.atv.form olarak korunur.
- `form-doldur.app.js`: GitHub'da tutulan asıl form kodu. Ayrı bir Tampermonkey betiği olarak kurulmaz.
- Yükleyici yalnızca a101.com.tr ve www.a101.com.tr alan adlarında /kariyer sayfasında kod indirir. Diğer sayfalarda işlem yapmaz.
- Sayfa her açıldığında veya yenilendiğinde asıl kod GitHub Contents API üzerinden raw yanıt biçiminde, zamana göre değişen sorgu ve önbellek kullanmama seçenekleriyle indirilip çalıştırılır. İnternet gerekir. GitHub veya ağ kaynaklı gecikmeler tamamen ortadan kalkmaz.
- Kod alınamazsa sayfada Yüklenemedi · Sayfayı yenile mesajı görünür. Eski bir yerel uygulama kopyası çalıştırılmaz.

## Mevcut deneme

Siyah başardık düğmesi Ad alanına delioğlan yazar, askerlik durumunu Yapıldı ve engelli durumunu Evet seçer. Formu göndermez ve Devam düğmesine basmaz.

## 3.2.0 yükleyicisi

Raw dosya adresi yerine GitHub Contents API kullanılır. Bu değişiklik önceki gecikmenin kesin nedenine dair bir teşhis değildir; kullanıcının tarayıcısındaki hız farkı ayrıca denenmelidir. API istek sınırına ulaşılırsa veya erişim engellenirse düğmede uyarı gösterilir; eski Raw koduna sessizce dönülmez. İstekler 15 saniye ile sınırlandırılır. Parola veya erişim anahtarı kullanılmaz.

## Sonraki değişiklikler

Normal form ve görünüm değişiklikleri aynı depodaki `form-doldur.app.js` dosyasında yapılır. Uygulama dosyasının ilk satırındaki sürüm artırılır; düğmedeki yazı kullanıcı isteğine göre korunur. Kullanıcı yalnızca A101 sayfasını yeniler; Tampermonkey'deki yükleyici kodu değişmez.

Yükleyicinin kendisinde bir düzeltme gerekirse `form-doldur.user.js` sürümü ayrıca artırılır ve Tampermonkey güncellemesi gerekir. Güncelleme adresleri aynı dosyada kalır.

Depo herkese açıktır. Kişisel bilgiler, parolalar ve kuruma ait özel veriler bu depoya eklenmez.
