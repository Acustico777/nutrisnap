import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface OpenFoodFactsResponse {
  status: number;
  product?: {
    product_name?: string;
    brands?: string;
    nutriments?: {
      'energy-kcal_100g'?: number;
      'proteins_100g'?: number;
      'carbohydrates_100g'?: number;
      'fat_100g'?: number;
      'fiber_100g'?: number;
      'sugars_100g'?: number;
      'sodium_100g'?: number;
    };
  };
}

export interface BarcodeResult {
  name: string;
  brand: string | null;
  calories_100g: number;
  protein_100g: number;
  carbs_100g: number;
  fat_100g: number;
  fiber_100g: number | null;
  sugar_100g: number | null;
  sodium_mg_100g: number | null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const barcode = searchParams.get('barcode');

    if (!barcode || !/^\d{8,13}$/.test(barcode)) {
      return NextResponse.json({ error: 'Barcode non valido (8-13 cifre)' }, { status: 400 });
    }

    const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'NutriSnap/1.0 (giulianodemail@gmail.com)' },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Prodotto non trovato' }, { status: 404 });
    }

    const data = await res.json() as OpenFoodFactsResponse;

    if (data.status !== 1 || !data.product) {
      return NextResponse.json({ error: 'Prodotto non trovato nel database' }, { status: 404 });
    }

    const p = data.product;
    const n = p.nutriments ?? {};

    const result: BarcodeResult = {
      name: p.product_name ?? 'Prodotto sconosciuto',
      brand: p.brands ?? null,
      calories_100g: Math.round(n['energy-kcal_100g'] ?? 0),
      protein_100g: Math.round((n['proteins_100g'] ?? 0) * 10) / 10,
      carbs_100g: Math.round((n['carbohydrates_100g'] ?? 0) * 10) / 10,
      fat_100g: Math.round((n['fat_100g'] ?? 0) * 10) / 10,
      fiber_100g: n['fiber_100g'] != null ? Math.round(n['fiber_100g'] * 10) / 10 : null,
      sugar_100g: n['sugars_100g'] != null ? Math.round(n['sugars_100g'] * 10) / 10 : null,
      sodium_mg_100g: n['sodium_100g'] != null ? Math.round(n['sodium_100g'] * 1000) : null,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error('GET /api/barcode error:', err);
    return NextResponse.json({ error: 'Errore ricerca barcode' }, { status: 500 });
  }
}
