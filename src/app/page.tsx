import { cookies } from 'next/headers';
import { sql } from '@/lib/db';
import { saveEntry } from './actions';
import Image from 'next/image';
import { DateTime } from 'luxon';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type EntryRow = {
  image_url: string;
  value_text: string;
  artist_text: string;
  submitted_at: string | Date;
};

export default async function Page() {
  // Load latest media + generating entry (includes artist)
  const rows = (await sql/*sql*/`
    select di.image_url,
           e.value_text,
           e.artist_text,
           e.submitted_at
    from daily_images di
    join entries e on di.entry_id = e.id
    order by di.image_day desc
    limit 1
  `) as EntryRow[];

  const imageUrl = rows[0]?.image_url ?? null;
  const userValue = rows[0]?.value_text ?? null;
  const artistText = rows[0]?.artist_text || 'Unknown';
  const submittedAtRaw = rows[0]?.submitted_at ?? null;

  // Pretty timestamp (NY time), robust for string | Date
  let submittedPretty: string | null = null;
  if (submittedAtRaw) {
    let iso: string | null = null;
    if (typeof submittedAtRaw === 'string') iso = submittedAtRaw;
    else if (submittedAtRaw instanceof Date) iso = submittedAtRaw.toISOString();
    if (iso) {
      submittedPretty = DateTime.fromISO(iso, { zone: 'utc' })
        .setZone('America/New_York')
        .toFormat('MMM d, yyyy h:mm a');
    }
  }

  // Cookie-based gating
  const nowNY = DateTime.now().setZone('America/New_York');
  const todayNY = nowNY.toFormat('yyyy-LL-dd');
  const yesterdayNY = nowNY.minus({ days: 1 }).toFormat('yyyy-LL-dd');

  const submittedCookie = (await cookies()).get('submitted_day')?.value;
  const submittedToday = submittedCookie === todayNY;
  const submittedYesterday = submittedCookie === yesterdayNY;

  // Detect if media is a video (allow querystrings)
  const isVideo = !!imageUrl && /\.(mp4|webm)(\?|$)/i.test(imageUrl);

  return (
    <main className="mx-auto max-w-xl p-6 space-y-6">
      <h1 className="text-3xl font-bold">Tugboat.co</h1>
      <p>Enter anything and you might just pick what gets tugged next.</p>

      {/* FORM VISIBILITY RULES:
          - If user has NOT submitted today → show the form.
          - If user submitted yesterday (but not today) → also show the Artist field.
          - After submission today → hide all inputs. */}
      {!submittedToday && (
        <form action={saveEntry} className="flex flex-col gap-3 max-w-xl">
          <input
            name="value"
            placeholder="Describe what tomorrow&apos;s tugboat should tow..."
            className="border rounded p-2"
            required
          />
          {submittedYesterday && (
            <input
              name="artist"
              placeholder="Artist (perk for yesterday’s tug!)"
              className="border rounded p-2"
            />
          )}
          <button className="border rounded px-4 py-2 w-fit">Submit</button>
        </form>
      )}

      {submittedToday && (
        <p className="italic text-gray-600">
          Thanks for tugging. Check back tomorrow to tug again and see what we&apos;re pulling.
        </p>
      )}

      {/* MEDIA VISIBILITY RULES:
          - Show media ONLY if user has submitted today.
          - Otherwise, show the static sponsor block. */}
      {imageUrl && (
        <div className="space-y-3">
          {submittedToday ? (
            isVideo ? (
              <video
                src={imageUrl}
                className="w-full h-auto rounded"
                autoPlay
                muted
                loop
                playsInline
                controls
                preload="metadata"
              />
            ) : (
              <Image
                src={imageUrl}
                alt="Daily image"
                width={1200}
                height={800}
                className="w-full h-auto rounded"
                priority
              />
            )
          ) : (
            <div className="w-full rounded border bg-gray-50 p-6 text-center">
              <p className="font-medium">
                Submit your tug to reveal today&apos;s pull.
              </p>
              <p className="mt-2 text-sm text-gray-600">
                Sponsored by the National Maritime Safety Association
              </p>
            </div>
          )}

          {/* Caption: only when media is visible (i.e., submitted today) */}
          {submittedToday && userValue && (
            <div className="text-center">
              <p className="text-gray-300">“{userValue}”</p>
              <p className="text-sm text-gray-400">Artist: {artistText || 'Unknown'}</p>
              {submittedPretty && (
                <p className="text-sm text-gray-500">Submitted {submittedPretty}</p>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  );
}