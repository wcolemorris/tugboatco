// src/app/api/dbcheck/route.ts
import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const rows = await sql/*sql*/`select now() as now`;
    return NextResponse.json({ ok: true, now: rows[0].now });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('dbcheck error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}