import { cookies } from 'next/headers';
import { sql } from '@/lib/db';
import { saveEntry } from './actions';
import Image from 'next/image';
import { DateTime } from 'luxon';

export const dynamic = 'force-dynamic';

export default async function Page() {
  // ⬇️ Pull the latest image *and* the entry that generated it
  const rows = (await sql/*sql*/`
    select di.image_url,
           e.value_text,
           e.submitted_at
    from daily_images di
    join entries e on di.entry_id = e.id
    order by di.image_day desc
    limit 1
  `) as { image_url: string; value_text: string; submitted_at: string }[];

  const imageUrl = rows[0]?.image_url;
  const userValue = rows[0]?.value_text;
  const submittedAt = rows[0]?.submitted_at;

  // Nice timestamp in New York time
  const submittedPretty = submittedAt
    ? DateTime.fromISO(submittedAt, { zone: 'America/New_York' }).toFormat('MMM d, yyyy h:mm a')
    : null;

  const todayNY = DateTime.now().setZone('America/New_York').toFormat('yyyy-LL-dd'); // ✅ string
  const submittedDay = (await cookies()).get('submitted_day')?.value;
  const alreadySubmitted = submittedDay === todayNY;

  return (
    <main className="mx-auto max-w-xl p-6 space-y-6">
      <h1 className="text-3xl font-bold">Tugboat.co</h1>
      <p>Enter anything. Each day, one entry is picked at random for what gets tugged next.</p>

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
          You&apos;ve already submitted today — come back tomorrow!
        </p>
      )}

      {imageUrl && (
        <div className="space-y-3">
          <Image
            src={imageUrl}
            alt="Daily image"
            width={1200}
            height={800}
            className="w-full h-auto rounded"
            priority
          />
          {userValue && (
            <p className="text-center text-gray-700">
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