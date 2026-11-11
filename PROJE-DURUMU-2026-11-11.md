# HBYS kısayolları — güncel durum ve devam notu

Tarih: 11 Kasım 2026  
Depo: https://github.com/oneraltintop/tampermonkey-formlar  
Dal: main

Bu belge 11 Kasım 2026 tarihinde GitHub'daki gerçek dosyalar ve depo ayarları okunarak hazırlanmıştır. Önceki 9 Kasım notunun yerine güncel devam referansı olarak kullanılmalıdır. Hasta bilgileri ve oturum sırları içermez.

## Güncel sürümler ve korunacak referans

| Bileşen | Sürüm | Görev |
|---|---|---|
| form-doldur.app.js | **3.6.9** | Asıl uygulama, kısayollar ve form işlemleri |
| form-doldur.user.js | **3.4.0** | Tampermonkey'de kurulu yükleyici |

Uygulama kodunun son yayımlandığı commit:
https://github.com/oneraltintop/tampermonkey-formlar/commit/165a2b876d77fc7c4a0f0d035313b6b636345f50

Uygulama blob SHA: 99f089e3a0d34df7cb4d83f315247e65054686d2  
Yükleyici blob SHA: e8c57f9b986d432ee4c7d253a50bb4b85691c606

Bu belge eklenirken uygulama sürümü veya kodu değiştirilmemiştir. Commit bir geri dönüş referansıdır; ayrıca release veya kararlı sürüm etiketi oluşturulmamıştır.

## Önemli: depo şu anda gizli

- Kullanıcı depoyu 10 Kasım'da Private yaptı.
- 11 Kasım'da GitHub üzerinden visibility=private olduğu yeniden doğrulandı.
- Mevcut yükleyici GitHub Contents API'ye kimlik doğrulamasız bağlanır. Depo gizliyken sayfa yenilendiğinde uygulama kodunu indiremez; kısayollar yüklenmez.
- Daha önce açık kalmış sayfada yüklenmiş kodun çalışması, gizli depodan yeni kod indirilebildiği anlamına gelmez.
- Kullanıcı depoyu yeniden Public yaparsa mevcut yükleyiciyle ilgili HBYS sayfalarını yenilemek yeterlidir; yükleyiciyi yeniden kurmak gerekmez.
- Depo bu belge hazırlanırken gizli bırakılmıştır. Kullanıcı açıkça istemeden görünürlük değiştirilmemelidir.
- GitHub telefon uygulaması zorunlu değildir; depo ayarları tarayıcıdan yönetilebilir.
- Codex'in yetkili GitHub bağlantısı depoya erişebilmektedir. Bu, anonim Tampermonkey yükleyicisinin erişebildiği anlamına gelmez.

## Kısayollar

| Kısayol | Ekran | İşlem |
|---|---|---|
| Çift Ctrl | Hasta Kayıt | Kimlik No alanına odaklanır; değeri değiştirmez |
| Alt+1 | Hasta Kayıt | Araç → Yeşil → Enjeksiyon → Sevgi Sever → Kaydet |
| Alt+2 | Hasta Kayıt | Araç → Yeşil → Pansuman → Sevgi Sever → Kaydet |
| Alt+3 | Hasta Kayıt | Araç → Yeşil → Acil Servis → Sevgi Sever → Kaydet |
| Alt+4 | Poliklinik | Kabul → birime göre tanı → birime göre doktor notu → Kaydet |
| Alt+Shift+T | Teknik inceleme | Yerel teknik alan raporunu açar |

- Çift Ctrl: art arda iki kez basıp bırakılır; iki basış arası en fazla 500 ms.
- Ctrl+C gibi birleşimler çift Ctrl sayılmaz.
- Alt+1, Alt+2, Alt+3 ve Alt+4 **otomatik kaydeder**.
- E, P, Poliklinik ve T deneme düğmeleri kaldırılmıştır.
- Ek “Kontrol ettim, kaydet” adımı ve “Kaydet düğmesine basıldı” bilgi kutusu kaldırılmıştır.
- Tuş tekrarları ve aynı anda ikinci işlem başlatılması engellenir.
- İşlem bittikten sonra aynı hasta için yeniden çalıştırmayı kalıcı biçimde engelleyen kontrol henüz yoktur.

## Hasta Kayıt ayrıntıları

Doğrulanmış teknik alan adları:

| Alan | HTML name |
|---|---|
| Acil Geliş Şekli | acilGelisSekli |
| Triaj Kodu | triaj |
| Birim | birim |
| Doktor | personel |

- Birim adının sonundaki parantezli yer eki eşleştirmede kabul edilir.
- Seçim listesinde birden fazla eşleşme varsa işlem durur.
- Dört alanın seçimi doğrulanmadan Kaydet'e basılmaz.
- Seçim penceresi açılınca alttaki alanları kaybetmemek için işlem başında bulunan alan referansları korunur.
- Kimlik No alanı etiketinden bulunur; belirsizse odaklama yapılmaz.
- Bu akışta form öğelerinin değişmesi kontrol edilir. Poliklinikteki seçili hasta satırı karşılaştırmasının aynısı Hasta Kayıt'a henüz eklenmemiştir.

## Poliklinik / Alt+4

### Birime göre kurallar

| Poliklinik birimi | Hedef tanı | Eklenecek not |
|---|---|---|
| Enjeksiyon | Z54 | Enjeksiyon yapıldı |
| Pansuman | Z54 | Pansuman yapıldı |
| Diğer dolu birimler | Z00.0 | Dr yönlendirildi |

- Birim boş veya belirsizse işlem durur.
- Bu kurallar kullanıcının açık talebidir; betik klinik değerlendirme yapmaz.
- İşlem tamamlandığını belirten notlar için kısayol ilgili uygulama yapıldıktan sonra kullanılmalıdır.
- Var olan tanılar silinmez. Hedef tanı zaten varsa yeniden eklenmez.
- Mevcut doktor notu silinmez. İfade yeni satıra eklenir.
- Aynı ifade zaten ayrı bir satırdaysa tekrar eklenmez.
- Önceki sürümden kalan “Dr yönlendirildi” gibi mevcut notlar kendiliğinden silinmez veya değiştirilmez.

### İşlem sırası

1. Tek Poliklinik ekranı ve seçili hasta belirlenir.
2. Kabul düğmesi etkinse tıklanır; kabul edilmiş hastada mevcut Kaydet durumu kontrol edilir.
3. Muayene Bilgileri sekmesine geçilir.
4. Birim okunur ve hedef tanı seçilir.
5. Gerekiyorsa Ekle → Tanı Ekleme Listesi → hedef tanı → Tamam uygulanır.
6. Doktor Notları sekmesindeki textarea[name="sikayet"] alanına uygun not eklenir.
7. Seçili hasta satırı, birim, not ve hedef tanı yeniden kontrol edilir.
8. Kaydet'e bir kez basılır.

Tanı penceresi başlığından güvenilir biçimde bulunamadığı için gerçek raporla şu yapı doğrulanmıştır: aynı x-window içindeki Tamam düğmesi, input[type="search"][name="name"] arama alanı ve desteklenen tanı satırı.

Ext JS'nin ext-comp / ext-gen sayıları değişkendir; örnek raporlardaki sayılar sabit kimlik olarak kullanılmaz.

## Pencere kapatma ve raporlama

- Mevcut otomatik kapatma yalnızca “Hasta Geçmiş Listesi” başlığını hedefler.
- Bütün uyarıları veya bütün pencereleri kapatan genel bir işlev yoktur.
- Pencere kapatma işlevinde ayrıca sol/sağ ekran ayrımı uygulanmış değildir.
- Teknik rapor alan değerlerini ve doktor notu içeriğini dışarı aktarmaz; kullanıcı yerel panelden kopyalar.
- Tanı raporunda diagnosisStructure, Z00.0 satırı ve Tamam düğmesinin üst öğelerinin teknik yapısını içerir.
- Aynı kaynaklı iframe'ler kısayol ve inceleme için taranır; farklı kaynaklara tarayıcı erişim sınırı korunur.
- Kodda kalan a101-form-doldur gibi adlar yükleyici uyumluluğu içindir. A101 işlevi kaldırılmıştır.

## İki Chrome profili ve Ctrl+Alt+1 fikri

Hasta Kayıt ve Poliklinik **iki farklı Chrome profilinde** açılmaktadır.

İstenen gelecek akış:
Ctrl+Alt+1 → Hasta Kayıt'ta Enjeksiyon kaydı → aynı hasta/başvuruyu Poliklinik'te doğrula → kabul → Z54 → Enjeksiyon yapıldı → Kaydet.

**Bu özellik eklenmemiştir.**

- Mevcut betikler iki Chrome profili arasında doğrudan haberleşmez.
- Aynı bilgisayarda çalışan yerel bağlantı programı fikri konuşulmuştur.
- PowerShell/yerel program kurulumu yapılmamıştır.
- Kullanıcı bu denemeyi daha sonraya bırakmıştır.
- Başlamadan önce kurumun yerel program çalıştırma kuralları, kaydın gerçekten başarılı olduğunu belirleme ve iki tarafta aynı hasta/başvuruyu eşleştirme çözülmelidir.
- Oturum şifreleri paylaşılmamalı; hasta bilgilerini üçüncü taraf bir sunucuya göndererek bağlantı kurulmamalıdır.

## Son değişiklikler

| Sürüm | Değişiklik |
|---|---|
| 3.6.4 | Tanı penceresini raporlanan gerçek yapıyla bulma |
| 3.6.5 | Poliklinikte ek onayı kaldırıp otomatik kaydetme |
| 3.6.6 | Alt+4 ekleme, Poliklinik ve T düğmelerini kaldırma |
| 3.6.7 | Enjeksiyon/Pansuman biriminde Z54, diğerlerinde Z00.0 |
| 3.6.8 | Enjeksiyon/Pansuman için işlem notlarını ayırma |
| 3.6.9 | Hasta Kayıt için Alt+3 Acil Servis akışı |

## Bekleyen işler

- Ctrl+Alt+1 ile iki profil arasında birleşik işlem.
- Makro ekleme.
- İlaç düşümü; ilaç, miktar ve birimlerin açıkça belirlenmesi.
- Aynı başvuruda tamamlanan işlemin yanlışlıkla tekrar kaydedilmesini önleme.
- Ayrı GitHub release/kararlı sürüm etiketi.
- README.md'nin eski A101 açıklamalarını güncelleme.
- Hasta Triaj ekranı otomasyonu eklenmemiştir; rastgele yaşamsal bulgu üreten kod yoktur.

## Bilinen doğrulama sınırları

- Yayımlanan kod GitHub'dan yeniden okunarak doğrulanmıştır.
- Uygun yerlerde klavye, eşleştirme ve akış korumaları taklit DOM testleriyle kontrol edilmiştir.
- Gerçek HBYS oturumuna geliştirme ortamından doğrudan erişim yoktur; gerçek ekran denemeleri kullanıcı tarafından yapılmıştır.
- Kullanıcı Hasta Kayıt ve Poliklinik akışlarının çalıştığını bildirmiştir.
- Son Alt+3 için yayımlama ve eşleştirme kontrolleri yapılmıştır; ayrıca kullanıcıdan gerçek ekran başarı bildirimi alınmamıştır.
- Kaydet'e tıklanması, sunucuda kaydın kesin oluştuğunun otomatik doğrulaması değildir. HBYS sonucu kontrol edilmelidir.
- Görülen java.lang.NullPointerException betik kurulu olmayan bilgisayarda da oluşmuştur; sistem/giriş sorunu olarak bilgi işleme bildirilmesi önerilmiştir.

## Sonraki oturumda devam talimatı

1. Bu belgeyi oku; sonra main üzerindeki gerçek uygulama ve yükleyiciyi yeniden oku.
2. Repo görünürlüğünü kontrol et; şu anda gizli olduğu için anonim yükleyicinin çalışmayacağını unutma.
3. Kullanıcı istemeden görünürlüğü değiştirme.
4. Mevcut kısayolları ve otomatik kaydetme tercihini koru.
5. Yeni uygulama değişikliklerinde sürümü artır; yalnızca gerektiğinde yükleyiciyi değiştir.
6. Yayınlanan dosyayı yeniden okuyup doğrula.
7. Hasta bilgilerini, fotoğrafları, parolaları ve oturum anahtarlarını depoya ekleme.
8. Eski kodu geri almak gerekiyorsa commit geçmişinden içeriği alıp yeni commit ile yayımla; geçmişi silme.
