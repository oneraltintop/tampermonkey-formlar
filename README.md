# Tampermonkey Formlar

Form doldurma denemeleri için kişisel Tampermonkey betiği.

## Kurulum ve 3.1.0'a geçiş

1. Tarayıcıda Tampermonkey yüklü olsun.
2. [Form Doldur betiğini yükle veya güncelle](https://raw.githubusercontent.com/oneraltintop/tampermonkey-formlar/main/form-doldur.user.js).
3. Mevcut Form Doldur betiğini 3.1.0 sürümüne bir kez güncelle. Tampermonkey'in GitHub'dan kod almak için gösterdiği yeni bağlantı iznini kabul et.
4. Bağlantı yalnızca kod gösterirse Tampermonkey → Yönetim Paneli → Yardımcı Araçlar → URL'den içe aktar bölümüne aynı adresi yapıştır.
5. Eski yükleyici veya kopya betikleri kapat; yalnızca Form Doldur açık kalsın.
6. A101 kariyer sayfasını yenile. Siyah düğmede FORM DOLDUR · 3.1.0 görünmeli.

## Çalışma düzeni

- `form-doldur.user.js`: Tampermonkey'de kurulu kalan sabit yükleyici. Adı Form Doldur, namespace değeri local.atv.form olarak korunur.
- `form-doldur.app.js`: GitHub'da tutulan asıl form kodu. Ayrı bir Tampermonkey betiği olarak kurulmaz.
- Yükleyici yalnızca a101.com.tr ve www.a101.com.tr alan adlarında /kariyer sayfasında kod indirir. Diğer sayfalarda işlem yapmaz.
- Sayfa her açıldığında veya yenilendiğinde asıl kod sabit GitHub adresinden, zamana göre değişen bir sorgu ile indirilip çalıştırılır. İnternet gerekir. GitHub veya ağ kaynaklı gecikmeler tamamen ortadan kalkmaz.
- Kod alınamazsa sayfada Yüklenemedi · Sayfayı yenile mesajı görünür. Eski bir yerel uygulama kopyası çalıştırılmaz.

## Mevcut deneme

Siyah Form Doldur düğmesi askerlik durumunu Yapıldı ve engelli durumunu Evet seçer. Formu göndermez ve Devam düğmesine basmaz.

## Sonraki değişiklikler

Normal form ve görünüm değişiklikleri aynı depodaki `form-doldur.app.js` dosyasında yapılır. Uygulama sürümü ve düğmedeki sürüm yazısı artırılır. Kullanıcı yalnızca A101 sayfasını yeniler; Tampermonkey'deki yükleyici kodu değişmez.

Yükleyicinin kendisinde bir düzeltme gerekirse `form-doldur.user.js` sürümü ayrıca artırılır ve Tampermonkey güncellemesi gerekir. Güncelleme adresleri aynı dosyada kalır.

Depo herkese açıktır. Kişisel bilgiler, parolalar ve kuruma ait özel veriler bu depoya eklenmez.
