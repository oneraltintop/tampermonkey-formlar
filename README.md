# Tampermonkey Formlar

Form doldurma denemeleri için kişisel Tampermonkey betiği.

## Kurulum ve 3.3.0'a geçiş

1. Tarayıcıda Tampermonkey yüklü olsun.
2. [Aynı Form Doldur betiğini yükle veya güncelle](https://raw.githubusercontent.com/oneraltintop/tampermonkey-formlar/main/form-doldur.user.js).
3. Mevcut betiği 3.3.0'a bir kez güncelle. Sorulursa betiğe özgü yerel ayar ve menü izinlerini kabul et. Yeni bir betik oluşturma.
4. Bağlantı yalnızca kod gösterirse Tampermonkey → Yönetim Paneli → Yardımcı Araçlar → URL'den içe aktar bölümüne aynı adresi yapıştır.
5. Eski yükleyici veya kopya betikleri kapat; yalnızca Form Doldur açık kalsın.
6. A101 kariyer sayfasını yenile. Sol altta Biz harikayız, onun üzerinde DENEME düğmesi görünür. Ana düğmenin üzerinde fareyi bekletince yükleyici ve uygulama sürümleri ile yükleme süresi görünür.

## Yeni form sayfasında etkinleştirme

Yeni form sayfasını aç. Tampermonkey menüsünden Form Doldur altındaki **Bu sayfada Form Doldur’u etkinleştir** komutunu seç ve sayfayı yenile. İzni yalnızca o sayfanın origin ve yoluna verirsin; sorgu parametreleri izin anahtarına dahil değildir. Başka sayfalara veya alt alan adlarına otomatik izin verilmez.

Bu izin yalnızca o tarayıcıdaki Tampermonkey betik ayarında saklanır. Her bilgisayarda bir kez etkinleştirilir. Kapatmak için aynı menüdeki kapatma komutunu seçip sayfayı yenile.

Etkinleştirme tek başına formu tanımaz. İlgili formun doldurma mantığı ayrıca hazırlanmalıdır. Şu anda yalnızca A101 kariyer formunun doldurma kodu vardır. Hazırlanmamış sayfada açıklayıcı mesaj gösterilir.

## Çalışma düzeni

- `form-doldur.user.js`: Aynı ad ve namespace ile kurulu kalan yükleyici.
- `form-doldur.app.js`: GitHub'da tutulan asıl form kodu. Ayrı bir Tampermonkey betiği olarak kurulmaz.
- Yükleyici sayfalarda yerel etkinleştirme menüsünü sunar; izin verilmeyen sayfalarda GitHub'a istek yapmaz, uzak kod çalıştırmaz ve sayfaya düğme eklemez.
- A101 kariyer sayfası varsayılan olarak etkindir; menüden kapatılabilir.
- Etkin sayfalarda güncel kod GitHub Contents API'den önbellek kullanmama seçenekleriyle alınır. İstekte sayfanın URL'si veya form değerleri gönderilmez. GitHub bağlantısı IP adresi gibi olağan ağ bilgilerini içerir.
- İnternet gerekir. GitHub veya ağ kaynaklı gecikmeler tamamen ortadan kalkmaz. API erişimi veya istek sınırı hataları kullanıcıya gösterilir. Eski Raw koda sessizce dönülmez. İstek süresi 15 saniyeyle sınırlıdır.
- Uzak kod, etkinleştirilen sayfanın içeriğine erişebilir. Bu nedenle yalnızca kendi yönettiğin bu depodan kod yüklenir. Gizli bilgiler veya erişim anahtarları kullanılmaz.

## Mevcut deneme

Sol alttaki siyah Biz harikayız düğmesi Ad alanına delioğlan yazar, askerlik durumunu Yapıldı ve engelli durumunu Evet seçer. Formu göndermez ve Devam düğmesine basmaz. Üstteki DENEME düğmesi tıklanınca Çalışıyor ✓ yazar.

## Sonraki değişiklikler ve gizlilik

Normal form ve görünüm değişiklikleri aynı `form-doldur.app.js` dosyasında yapılır; ilk satırdaki uygulama sürümü artırılır. Kullanıcı sayfayı yeniler. Yeni bir sayfayı etkinleştirmek için yükleyici kodunu değiştirmek gerekmez. Yükleyicinin kendisinde düzeltme gerekirse sürümü artırılır ve Tampermonkey güncellemesi gerekir.

Depo herkese açıktır. İşyeri adresleri yerel izinde tutulabilir; ancak formu tanıyan kodun da özel adres, kurum bilgisi veya özel alan kimlikleri içermemesi gerekir. İşyerine özel form kodunu yayımlamadan önce bu bilgilerin nerede tutulacağı ayrıca kararlaştırılmalıdır. Kişisel bilgiler, parolalar ve kuruma ait özel veriler açık depoya eklenmez.
