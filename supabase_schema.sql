-- Supabase SQL Schema for Mini CRM

-- 1. Leads Tablosu (Müşteri Adayları)
CREATE TABLE leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    source TEXT, -- Örn: Facebook, Instagram
    status TEXT DEFAULT 'Yeni' CHECK (status IN ('Yeni', 'Arandı', 'Ulaşılamadı', 'İlgileniyor', 'İptal', 'Satışa Döndü')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Notes Tablosu (Görüşme Notları ve Loglar)
CREATE TABLE notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    user_email TEXT, -- Hangi temsilci islem yapti
    type TEXT DEFAULT 'note', -- 'note' veya 'status_change'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- (Opsiyonel) RLS (Row Level Security) Ayarları
-- Şimdilik geliştirme aşamasında olduğumuz için RLS'i devre dışı bırakıyoruz veya okuma/yazmaya açık hale getiriyoruz.
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read access on leads" ON leads FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert access on leads" ON leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update access on leads" ON leads FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous read access on notes" ON notes FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert access on notes" ON notes FOR INSERT WITH CHECK (true);
