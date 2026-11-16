# İki Chrome profili bağlantı testi

Bu paket yalnızca Hasta Kabul ve Poliklinik'ten elle gönderilen TC + İşlem No örneklerini karşılaştırır. **Kayıt oluşturmaz, alan doldurmaz, Kabul veya Kaydet düğmesine basmaz.** Tam otomatik Ctrl+Alt+1 akışı henüz eklenmemiştir.

## 1. Programı aç

1. ZIP dosyasını HBYS bilgisayarında bir klasöre çıkar. ZIP içinden doğrudan çalıştırma.
2. **BASLAT.cmd** dosyasına çift tıkla. Python kurulu olmalıdır; ek Python paketi gerekmez.
3. Küçük pencere açık kalsın. Programın gösterdiği **64 karakterlik yerel bağlantı anahtarını** kopyala.
4. Bu anahtarı yalnızca aşağıdaki Tampermonkey ayarlarına gir. Sohbete gönderme veya ekran görüntüsünde paylaşma.

Program çalışmazsa klasörde PowerShell açıp `python compare.py` komutunu çalıştır. Program yalnızca `127.0.0.1:8876` adresinde dinler. Ağdaki başka bilgisayarlara açılmaz; port yönlendirme, yönetici olarak çalıştırma veya güvenlik duvarını kapatma gerekmez.

## 2. İki profilde yükleyiciyi bir kez güncelle

Hasta Kabul'ün Chrome profilinde ve Poliklinik'in Chrome profilinde aşağıdaki bağlantıyı açıp mevcut **Form Doldur** betiğini güncelle:

https://raw.githubusercontent.com/oneraltintop/tampermonkey-formlar/main/form-doldur.user.js

Yeni yükleyici sürümü **3.4.2**, uygulama sürümü **3.6.32**. Yeni bir betik kopyası oluşturma. Güncelleme sırasında Tampermonkey `127.0.0.1` bağlantısı için izin isterse bu izin yalnızca kendi bilgisayarındaki test programı içindir.

Güncelleme sonrası iki HBYS penceresini de yenile. Normal doktor ayarı korunur.

## 3. Hasta Kabul profilini tanıt

Hasta Kabul penceresinde Tampermonkey menüsünü aç:

- **Bağlantı testi: bu profil Hasta Kabul** seç.
- **Bağlantı testi: yerel anahtarı gir** seç; programdaki 64 karakterlik anahtarı yapıştır.

## 4. Poliklinik profilini tanıt

Poliklinik penceresinde Tampermonkey menüsünü aç:

- **Bağlantı testi: bu profil Poliklinik** seç.
- **Bağlantı testi: yerel anahtarı gir** seç; aynı anahtarı yapıştır.

Bu iki ayar yalnızca ilgili Chrome profilinde tutulur. Her hasta için tekrar yapılmaz. Anahtar program yeniden açıldığında değişmez. Bilgisayarı yeniden açtığında BASLAT.cmd dosyasını yeniden çalıştırmak gerekir. Otomatik başlatma eklenmemiştir.

## 5. Kayıt yapmadan eşleştirmeyi dene

1. Önceden kaydedilmiş **aynı hasta ve aynı başvuruyu** iki profilde aç. Test için yeni veya sahte hasta kaydı oluşturma.
2. Hasta Kabul'de Kimlik No ve İşlem No dolu olsun; Poliklinik'te Muayene Bilgileri sekmesini aç.
3. Hasta Kabul'de **Ctrl+Alt+1** yap. Diğer profilin örneğinin beklendiği yazacak.
4. 60 saniye içinde Poliklinik'te **Ctrl+Alt+1** yap.
5. Sonuç, gönderilen örnekler için eşleşme veya farklılık gösterecek. Ekranlarda hiçbir kayıt işlemi yapılmayacak.

Mesajda hasta adı, TC veya İşlem No gösterilmez. Sonucun fotoğrafını paylaşırken çevredeki hasta bilgilerini gizle.

**Bu sonuç canlı takip değildir.** Örneği gönderdikten sonra diğer penceredeki hasta değişmiş olabilir. Sonuç yalnızca son 60 saniyede elle gönderilen iki örneği karşılaştırır; otomatik işlem için izin veya sürekli hasta doğrulaması yerine geçmez. Örneklerin süresi dolunca yeniden gönderilmelidir.

Ctrl+Alt+1 bu sürümde teknik rapor açmak yerine bu yerel testi yapar. Normal teknik rapor **Alt+Shift+T** ile açılmaya devam eder. Alt+1, Alt+2, Alt+3, Alt+4, Alt+5 ve çift Ctrl akışları değiştirilmemiştir.

## Sonuçların anlamı

- **Diğer profil bekleniyor:** O profilde de Ctrl+Alt+1 yap.
- **Örnekler eşleşiyor:** Son gönderilen TC ve İşlem No değerleri aynı.
- **Hasta farklı:** İki ekranı kontrol et.
- **Hasta aynı, İşlem No farklı:** Aynı kişinin farklı başvuruları açık; devam etme.
- **Birden fazla pencere örneği:** Aynı göreve atanmış fazla pencereleri kapat; 60 saniye sonra yeniden dene.
- **Yerel programla bağlantı kurulamadı:** BASLAT.cmd açık mı ve anahtar iki profilde aynı mı kontrol et. Tarayıcı/kurum politikası yerel bağlantıyı engelliyorsa korumaları kapatma; hata metni üzerinden teşhis gerekir.
- **Alan bulunamadı:** Profil görevi ve doğru HBYS ekranını kontrol et. Kod değişen ext-comp numaralarına dayanmaz; alan adlarını, aktif ekranı ve Poliklinik'te salt okunur alanları kullanır.

## Veriler nasıl işleniyor?

- Testi yalnızca Ctrl+Alt+1 başlatır; arka planda hasta bilgisi aktarımı veya otomatik komut yoktur.
- TC ve İşlem No, yerel anahtarla doğrulanan bir istekle **aynı bilgisayardaki** programa gönderilir. Harici sunucuya, Telegram'a veya GitHub'a gönderilmez.
- Program bunları kendi anahtarıyla HMAC-SHA256 özetlerine dönüştürür. Saklanan örneklerde yalnızca özetler, profil görevi, rastgele pencere kimliği ve süre bilgisi bulunur.
- Program hasta bilgilerini veya istek gövdelerini diske/günlüğe yazmaz. Özet örnekler 60 saniye içinde geçersizleşir ve sonraki istekte temizlenir; program kapanınca bellekteki tüm örnekler silinir.
- `yerel-anahtar.txt` dosyası yalnızca yerel bağlantı anahtarını içerir. Paylaşma veya GitHub'a yükleme. Windows kullanıcı hesabı/klasör erişimini koru; Python dosya izni Windows ACL yapılandırmasının yerine geçmez.
- Anahtarın kaybolması halinde program kapalıyken yerel anahtar dosyasını kaldırıp programı tekrar açarak yeniden oluşturabilirsin. İki profilde yeni anahtarı girmen gerekir.
- Mevcut GitHub yükleme düzeni sürer: depo gizliyse anonim yükleyici uygulamayı indiremez.

## Ne henüz yapılmadı?

- Hasta Kabul kaydının sunucuda gerçekten başarılı olduğunu doğrulama.
- Poliklinik'te doğru başvuruyu arayıp açma.
- İki aşamayı tek Ctrl+Alt+1 komutuyla kaydetme.
- Arka planda görev kuyruğu veya canlı hasta izleme.

Bu aşamalar ancak eşleştirme testi gerçek bilgisayarda doğrulandıktan sonra hazırlanacak.

## Test kaydı

Gerçek HBYS/Telegram bağlantısı veya gerçek hasta bilgisi kullanılmadan 8 Python testi ve 10 tarayıcı işlev senaryosu kontrol edildi. Python testleri:

```
python -m unittest -v test_compare.py
```

Gerçek bilgisayardaki iki profil testi henüz kullanıcı tarafından yapılmamıştır.
