'use server';

import { cookies } from 'next/headers';
import { sql } from '@/lib/db';
import { DateTime } from 'luxon';
import crypto from 'crypto';

export async function saveEntry(formData: FormData): Promise<void> {
  const value = (formData.get('value') || '').toString().trim();
  if (!value) return;

  // Optional artist field; default to "Unknown" if not provided/empty
  const artistRaw = (formData.get('artist') || '').toString().trim();
  const artist = artistRaw.length > 0 ? artistRaw.slice(0, 120) : 'Unknown';

  const nowNY = DateTime.now().setZone('America/New_York');
  const submitDay = nowNY.toFormat('yyyy-LL-dd'); // always a string

  const ip = (formData.get('ip') || '').toString();
  const ua = (formData.get('ua') || '').toString();
  const ipHash = ip ? crypto.createHash('sha256').update(ip).digest('hex') : null;

  await sql/*sql*/`
    insert into entries (value_text, artist_text, submit_day, ip_hash, user_agent)
    values (${value}, ${artist}, ${submitDay}, ${ipHash}, ${ua})
  `;

  // Mark that the user has submitted today (used to show media & hide form)
  const jar = await cookies();
  jar.set('submitted_day', submitDay, {
    path: '/',
    httpOnly: false,
    maxAge: 60 * 60 * 24, // 1 day
  });
}