# Mini CRM

Meta (Facebook, Instagram) reklamlarından veya Make.com / n8n gibi otomasyon araçlarından gelen müşteri adaylarını (lead) tek bir ekrandan yönetebileceğiniz, hafif ve modern bir CRM uygulaması.

## 🚀 Özellikler

- **Gerçek Zamanlı Senkronizasyon:** Supabase Realtime sayesinde yeni gelen müşteriler anında (sayfa yenilenmeden) tabloya düşer.
- **Webhook Entegrasyonu:** Dış sistemlerden veri almak için hazır `/api/webhook/meta` uç noktası.
- **Güvenli Kimlik Doğrulama:** Supabase Auth ile admin girişi.
- **Gelişmiş Veri Tablosu:**
  - Excel tarzı anlık sütun filtreleme (Ad, E-posta, Telefon, Kaynak, Durum)
  - Sütun başlıklarına tıklayarak sıralama (Sorting)
  - Sayfalama (Pagination)
- **Detaylı İşlem Geçmişi:** Müşteri durumu her değiştiğinde veya yeni bir not eklendiğinde işlemi kimin yaptığı tarihle birlikte loglanır.
- **Mobil Uyumlu Tasarım (Responsive):** Telefondan ve tabletten tam uyumlu, akıcı kullanıcı deneyimi.

## 🛠️ Kullanılan Teknolojiler

- **Frontend & Backend:** [Next.js](https://nextjs.org/) (App Router, React)
- **Veritabanı & Auth:** [Supabase](https://supabase.com/) (PostgreSQL)
- **Stil:** Saf (Vanilla) CSS tabanlı modern UI sistemi

## 📦 Kurulum ve Çalıştırma

Projeyi bilgisayarınızda yerel olarak çalıştırmak için aşağıdaki adımları izleyin:

### 1. Depoyu Klonlayın
```bash
git clone https://github.com/yusahaz/mini-crm.git
cd mini-crm
```

### 2. Gerekli Paketleri Yükleyin
```bash
npm install
```

### 3. Çevre Değişkenlerini Ayarlayın
Proje dizininde `.env.local` adında bir dosya oluşturun ve Supabase bilgilerinizi ekleyin:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Veritabanını Hazırlayın
Supabase SQL editörünü açın ve projenin kök dizinindeki `supabase_schema.sql` dosyasının içeriğini kopyalayıp çalıştırarak `leads` ve `notes` tablolarını oluşturun.

### 5. Uygulamayı Başlatın
```bash
npm run dev
```

Uygulama `http://localhost:3000` adresinde çalışmaya başlayacaktır. 

## 🔗 Webhook Testi Yapmak

Sistemin çalışıp çalışmadığını test etmek için uygulamanız açıkken bilgisayarınızın terminalinden aşağıdaki komutu çalıştırabilirsiniz:

```bash
curl -X POST http://localhost:3000/api/webhook/meta \
-H "Content-Type: application/json" \
-d '{"name":"Ahmet Test","phone":"+90 555 123 4567","email":"test@example.com","source":"Webhook Test"}'
```

Bu komutu çalıştırdıktan hemen sonra verinin panele düştüğünü görebilirsiniz.
