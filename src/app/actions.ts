'use server';

import { cookies } from 'next/headers';
import { sql } from '@/lib/db';
import { DateTime } from 'luxon';
import crypto from 'crypto';

export async function saveEntry(formData: FormData): Promise<void> {
  const value = (formData.get('value') || '').toString().trim();
  if (!value) return;

  const nowNY = DateTime.now().setZone('America/New_York');
  // ✅ always a string (yyyy-MM-dd)
  const submitDay = nowNY.toFormat('yyyy-LL-dd');

  const ip = (formData.get('ip') || '').toString();
  const ua = (formData.get('ua') || '').toString();
  const ipHash = ip ? crypto.createHash('sha256').update(ip).digest('hex') : null;

  await sql/*sql*/`
    insert into entries (value_text, submit_day, ip_hash, user_agent)
    values (${value}, ${submitDay}, ${ipHash}, ${ua})
  `;

  // In Server Actions, cookies() may be async in your setup → await it
  const jar = await cookies();
  jar.set('submitted_day', submitDay, {
    path: '/',
    httpOnly: false,
    maxAge: 60 * 60 * 24, // 1 day
  });
}