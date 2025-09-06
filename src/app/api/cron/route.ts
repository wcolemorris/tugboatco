// src/app/api/cron/route.ts
import { NextResponse } from 'next/server';
import { DateTime } from 'luxon';
import { neon } from '@neondatabase/serverless';

export const runtime = 'nodejs';

type EntryRow = { id: string; value_text: string };

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);

    const nowNY = DateTime.utc().setZone('America/New_York');
    const targetDay = nowNY.minus({ days: 1 }).toISODate();

    // ✅ No generic here; cast the array result
    const rows = (await sql/*sql*/`
      select id, value_text
      from entries
      where submit_day = ${targetDay}
      order by random()
      limit 1
    `) as EntryRow[];

    if (!rows.length) {
      return NextResponse.json({ ok: true, msg: 'No entries for day' });
    }

    const entry = rows[0];
    // TODO: fire Replicate using entry.value_text / entry.id

    return NextResponse.json({ ok: true, day: targetDay, picked: entry.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('cron error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}