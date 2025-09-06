// app/api/replicate-webhook/route.ts
import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { sql } from '@/lib/db';
import { DateTime } from 'luxon';

export async function POST(req: Request) {
  const url = new URL(req.url);
  const entryId = url.searchParams.get('entryId');
  if (!entryId) return NextResponse.json({ ok: false, error: 'missing entryId' }, { status: 400 });

  const payload = await req.json();
  // some models return a string, others an array of urls
  const output = payload.output;
  const outputUrl: string =
    Array.isArray(output) ? output[0] : typeof output === 'string' ? output : '';

  if (!outputUrl) return NextResponse.json({ ok: false, error: 'no image url' }, { status: 400 });

  // fetch remote image and re-upload to your Blob store
  const imgResp = await fetch(outputUrl);
  const buffer = Buffer.from(await imgResp.arrayBuffer());

  const todayNY = DateTime.now().setZone('America/New_York').toISODate();
  const blob = await put(`daily/${todayNY}.png`, buffer, {
    access: 'public',
    contentType: 'image/png',
    addRandomSuffix: false,
  });

  await sql/*sql*/`
    insert into daily_images (image_day, entry_id, prompt_used, image_url)
    values (${todayNY}, ${entryId}, ${payload.input?.prompt || ''}, ${blob.url})
    on conflict (image_day) do nothing
  `;

  return NextResponse.json({ ok: true, url: blob.url });
}