// app/api/cron/route.ts
import { NextResponse } from 'next/server';
import { DateTime } from 'luxon';
import { sql } from '@/lib/db';

export const runtime = 'nodejs'; // or 'edge' — Node is fine here

export async function GET() {
  // Cron timezone is always UTC; convert to NY and pick "yesterday"
  const nowNY = DateTime.utc().setZone('America/New_York');
  const targetDay = nowNY.minus({ days: 1 }).toISODate();

  const { rows } = await sql/*sql*/`
    select id, value_text from entries
    where submit_day = ${targetDay}
    order by random()
    limit 1
  `;

  if (!rows[0]) return NextResponse.json({ ok: true, msg: 'No entries for day' });

  // Kick off Replicate (async) with webhook back to this app
  const entry = rows[0] as { id: string; value_text: string };
  const base = process.env.NEXT_PUBLIC_BASE_URL!;
  await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      // choose a model you like; SDXL is a solid default
      model: 'stability-ai/sdxl',
      input: { prompt: entry.value_text },
      webhook: `${base}/api/replicate-webhook?entryId=${entry.id}`,
      webhook_events_filter: ['completed'],
    }),
  });

  return NextResponse.json({ ok: true, day: targetDay });
}