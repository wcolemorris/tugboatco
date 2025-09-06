'use server';

import { sql } from '@/lib/db';
import { DateTime } from 'luxon';
import crypto from 'crypto';
// optional: import { revalidatePath } from 'next/cache';

export async function saveEntry(formData: FormData): Promise<void> {
  const value = (formData.get('value') || '').toString().trim();
  if (!value) return;

  const nowNY = DateTime.now().setZone('America/New_York');
  const submitDay = nowNY.toISODate();

  const ip = (formData.get('ip') || '').toString();
  const ua = (formData.get('ua') || '').toString();
  const ipHash = ip ? crypto.createHash('sha256').update(ip).digest('hex') : null;

  await sql/*sql*/`
    insert into entries (value_text, submit_day, ip_hash, user_agent)
    values (${value}, ${submitDay}, ${ipHash}, ${ua})
  `;

  // optional: revalidate homepage after insert
  // revalidatePath('/');
}