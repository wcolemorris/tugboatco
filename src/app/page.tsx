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
  submitted_at: string | Date;
};

export default async function Page() {
  const sqlRows = (await sql/*sql*/`
    select di.image_url,
           e.value_text,
           e.submitted_at
    from daily_images di
    join entries e on di.entry_id = e.id
    order by di.image_day desc
    limit 1
  `) as EntryRow[];

  const imageUrl = sqlRows[0]?.image_url;
  const userValue = sqlRows[0]?.value_text;
  const submittedAtRaw = sqlRows[0]?.submitted_at;

  // Pretty timestamp (NY time), robust to string | Date
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

  const todayNY = DateTime.now().setZone('America/New_York').toFormat('yyyy-LL-dd');
  const submittedDay = (await cookies()).get('submitted_day')?.value;
  const alreadySubmitted = submittedDay === todayNY;

  // Detect if the media is a video (allowing querystrings)
  const isVideo = !!imageUrl && /\.(mp4|webm)(\?|$)/i.test(imageUrl);

  return (
    <main className="mx-auto max-w-xl p-6 space-y-6">
      <h1 className="text-3xl font-bold">Tugboat.co</h1>
      <p>Enter anything and you might just pick what gets tugged next.</p>

      {!alreadySubmitted && (
        <form action={saveEntry} className="flex flex-col gap-3 max-w-xl">
          <input
            name="value"
            placeholder="Describe what tomorrow&apos;s tugboat should tow..."
            className="border rounded p-2"
            required
          />
          <button className="border rounded px-4 py-2 w-fit">Submit</button>
        </form>
      )}

      {alreadySubmitted && (
        <p className="italic text-gray-600">
          Thanks for tugging. Check back tomorrow to see what we&apos;re pulling and tug again.
        </p>
      )}

      {imageUrl && (
        <div className="space-y-3">
          {alreadySubmitted ? (
            // Reveal media after user has submitted today
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
            // Placeholder “sponsor” box until submission
            <div className="w-full rounded border bg-gray-50 p-6 text-center">
              <p className="font-medium">
                Submit your tug to reveal today&apos;s pull.
              </p>
              <p className="mt-2 text-sm text-gray-600">
                Sponsored by the National Maritime Safety Association
              </p>
            </div>
          )}

          {alreadySubmitted && userValue && (
            <p className="text-center text-gray-300">
              “{userValue}”
              {submittedPretty && (
                <>
                  <br />
                  <span className="text-sm text-gray-500">
                    Submitted {submittedPretty}
                  </span>
                </>
              )}
            </p>
          )}
        </div>
      )}
    </main>
  );
}