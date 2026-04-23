import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { createClient } from '@/lib/supabase/server';
import { openai, NUTRITION_SYSTEM_PROMPT } from '@/lib/openai';
import type { AnalyzeResponse } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    let imageBase64: string | null = null;
    let mimeType = 'image/jpeg';

    const contentType = req.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      const body = await req.json() as { imageBase64?: string };
      imageBase64 = body.imageBase64 ?? null;
    } else if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('image') as File | null;
      if (file) {
        mimeType = file.type || 'image/jpeg';
        const buf = await file.arrayBuffer();
        imageBase64 = Buffer.from(buf).toString('base64');
      }
    }

    if (!imageBase64) {
      return NextResponse.json({ error: 'Nessuna immagine ricevuta' }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: NUTRITION_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
                detail: 'high',
              },
            },
            {
              type: 'text',
              text: 'Analyze this food image and return the nutritional information as JSON.',
            },
          ],
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    let parsed: AnalyzeResponse;

    try {
      parsed = JSON.parse(raw) as AnalyzeResponse;
    } catch {
      return NextResponse.json(
        { error: 'Risposta AI non valida. Riprova.' },
        { status: 502 }
      );
    }

    if (!Array.isArray(parsed.items)) {
      parsed.items = [];
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error('analyze-meal error:', err);
    const message = err instanceof Error ? err.message : 'Errore sconosciuto';
    return NextResponse.json({ error: `Errore analisi: ${message}` }, { status: 500 });
  }
}
