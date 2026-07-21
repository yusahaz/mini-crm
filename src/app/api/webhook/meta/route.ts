import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Meta Webhook doğrulama token'ı (İsteğe bağlı olarak .env'den alınabilir)
const VERIFY_TOKEN = 'mini-crm-secret-token';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Make/n8n veya özel bir entegrasyondan gelen basit payload'u işliyoruz
    // Beklenen format: { name: "...", phone: "...", email: "...", source: "..." }
    const { name, phone, email, source } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('leads')
      .insert([
        {
          name,
          phone: phone || null,
          email: email || null,
          source: source || 'Webhook',
        }
      ])
      .select();

    if (error) {
      console.error('Supabase Error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ success: true, lead: data[0] }, { status: 201 });
  } catch (err) {
    console.error('Webhook Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
