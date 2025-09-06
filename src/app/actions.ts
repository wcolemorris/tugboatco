'use server';

import { sql } from '@/lib/db';
import { DateTime } from 'luxon';
import crypto from 'crypto';

export async function saveEntry(_: any, formData: FormData) {
  const value = (formData.get('value') || '').toString().trim();
  if (!value) return { ok: false, error: 'Please enter a value.' };

  // America/New_York calendar day
  const nowNY = DateTime.now().setZone('America/New_York');
  const submitDay = nowNY.toISODate(); // YYYY-MM-DD

  // very light anti-spam (optional)
  const ip = (formData.get('ip') || '').toString();
  const ua = (formData.get('ua') || '').toString();
  const ipHash = ip ? crypto.createHash('sha256').update(ip).digest('hex') : null;

  await sql/*sql*/`
    insert into entries (value_text, submit_day, ip_hash, user_agent)
    values (${value}, ${submitDay}, ${ipHash}, ${ua})
  `;

  return { ok: true };
}