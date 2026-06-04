# SacYer — Offline DXF Nesting V1

SacYer, küçük atölyeler ve prototip çalışmalarında hızlı sac yerleşimi ve yaklaşık fire hesabı için hazırlanmış, tamamen offline çalışan tek dosyalık bir web uygulamasıdır. Kurulum, backend, veritabanı, bulut veya CDN gerektirmez. `index.html` dosyasını modern bir tarayıcıda açmak yeterlidir.

## Mimari

Uygulama dağıtım kolaylığı için tüm modülleri `index.html` içinde tutar:

- **DXF parser:** ASCII DXF içindeki `LWPOLYLINE`, `POLYLINE`, birleşebilen `LINE`/`ARC` segmentleri, `CIRCLE`, `ELLIPSE`, polyline sınırlı `HATCH` ve açık/kapalı NURBS `SPLINE` objelerini okur. Eksik kapalı bayrağı ve küçük uç nokta yuvarlama farkları için toleranslı kurtarma uygular. En büyük konturu dış sınır, diğerlerini görsel delik kabul eder.
- **Geometri ve çakışma:** Kontur alanı/bounding-box hesabı, dönüşüm, stok sınırı, gerçek poligon kesişimi ve dış konturlar arasındaki minimum clearance kontrolünü yürütür.
- **Nesting motoru:** Parçaları bounding-box alanına göre büyükten küçüğe sıralar; dönüş varyantlarını önceden hesaplar; stok kenarları ile mevcut parçaların clearance kadar ötelenmiş sağ/üst kenarlarından aday noktalar üretir; normalize edilmiş kompaktlık, hizalama, parçalanma ve büyük artık skoruyla en iyi geçerli adayı seçer.
- **Fire ve artık alan:** Fire oranı, stok alanından yerleşen gerçek parça alanı ve daha sonra kullanılabilir en büyük artık dikdörtgen alanı düşülerek net fire olarak hesaplanır.
- **Artık alan kestirimi:** Stok alanını adaptif bir grid'e böler, gerçek dış kontur ve clearance mesafesine göre hücreleri işaretler ve histogram tabanlı en büyük boş dikdörtgen algoritmasıyla yaklaşık kullanılabilir artığı bulur.
- **Renderer ve UI state:** Canvas üzerinde ölçekli çizim, zoom, pan, sürükleme, manuel 90° döndürme ve yeniden doğrulama sağlar.
- **Exporter:** Gerçek dış/iç konturları yerleşim dönüşümüyle SVG ve ASCII DXF olarak; ölçü ve koordinatları CSV olarak dışa aktarır.

## Algoritma yaklaşımı ve sınırlar

V1 yerleşim motoru, gerçek dış konturlar arasında poligon kesişimi ve minimum kenar mesafesi kontrolü kullanır. Bounding-box yalnızca hızlı ön eleme, sıralama ve raporlama amacıyla kullanılır. Böylece tamamlayıcı üçgenler gibi parçalar aynı dikdörtgen alan içerisinde birbirine geçebilir. Motor tek bir greedy geçiş yerine alan, yükseklik, genişlik, uzun kenar ve en-boy oranı önceliklerinden türetilen çoklu başlangıçları karşılaştırır; farklı dönüş tercihlerini dener ve seçilen sonucu yerleşim sonrası tekrar sıkıştırır. Global skor, hizalama modlarında karşı kenarda kalan başıboş parçaları ve en yakın komşusundan kopuk duran parçaları güçlü biçimde cezalandırır. Yerleşmeyen parçalar için doğrudan yeniden ekleme ve gerektiğinde tek yerleşmiş parçayı çıkarıp ikisini yeniden yerleştiren kurtarma geçişi uygulanır. Skor; normalize edilmiş kullanılan bounding alanı, seçili kenara uzaklık, parçalanma yaklaşımı ve en büyük artık şeridini birlikte değerlendirir. Aday koordinatlarına parça boşluğu doğrudan eklenir; böylece boşluk pozitifken kenar adaylarının yanlışlıkla çakışmalı sayılması önlenir. “En büyük artık alan” modu parçaları bir tarafta kompakt tutarak büyük tek parça artığı teşvik eder.

Nesting NP-hard olduğundan tüm olası DXF kümeleri için matematiksel %95 optimum garantisi verilemez; V1 süre bütçesi içinde bilinen düzenli kalite senaryolarında optimum yerleşimi doğrulayan regresyonlar kullanır ve genel durumda güçlü bir yaklaşık sonuç hedefler.

Performans için görsel ve dışa aktarma konturları eksiksiz korunurken nesting çakışma konturları en fazla 48 noktaya sadeleştirilir; sadeleştirme hatası güvenlik mesafesine eklenir. Aday konumlar önceliklendirilip sınırlandırılır ve tek yerleşim çalışması 52 saniyelik hesaplama bütçesiyle sınırlandırılır; böylece artık alan hesabı ve UI güncellemesiyle birlikte toplam süre 60 saniyenin altında tutulur.

Bu yapı ileride no-fit polygon, genetik arama, çoklu stok ve takım yolu üretimiyle genişletilebilir.

## Kullanım

1. `index.html` dosyasını çift tıklayarak açın.
2. İstediğiniz sayıda DXF dosyası yükleyin. Uygulama sabit bir dosya sayısı üst sınırı koymaz; pratik kapasite tarayıcı belleği ve parça karmaşıklığına bağlıdır.
3. Stok, margin, parça boşluğu, hizalama ve döndürme seçeneklerini belirleyin.
4. **Otomatik yerleştir** düğmesine basın.
5. Gerekirse parçaları sürükleyin veya seçili parçayı 90° döndürün.
6. Sonucu SVG, DXF ya da CSV olarak dışa aktarın.


## DXF uyumluluk notları

Parser; kapalı bayrağı unutulmuş fakat çok köşeli tek bir polyline'ı uyarı vererek kapatabilir, sırasız LINE/ARC zincirlerini iki uçtan birleştirir ve CAD dışa aktarımlarındaki küçük koordinat yuvarlama farklarını toleranslı değerlendirir. SPLINE geometrileri DXF degree, knot ve weight verileriyle gerçek NURBS/B-spline eğrisinden örneklenir; açık SPLINE parçaları da diğer eğri segmentleriyle kapalı kontura birleştirilir. Eksik knot verisinde kontrol veya fit noktaları yedek olarak kullanılır. Binary DXF dosyaları desteklenmez; bu dosyalar CAD programından ASCII DXF olarak kaydedilmelidir. Bir kontur yine bulunamazsa hata mesajı dosyada algılanan obje tiplerini listeler.
