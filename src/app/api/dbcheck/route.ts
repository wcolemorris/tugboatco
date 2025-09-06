// app/api/dbcheck/route.ts  (or src/app/api/dbcheck/route.ts)
import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);

    // ✅ Neon returns an array of rows
    const rows = await sql/*sql*/`select now() as now`;
    return NextResponse.json({ ok: true, now: rows[0].now });
  } catch (err: any) {
    console.error('dbcheck error:', err);
    return NextResponse.json(
      { ok: false, error: err?.message || String(err) },
      { status: 500 }
    );
  }
}