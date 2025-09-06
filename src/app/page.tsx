import { cookies } from 'next/headers';
import { sql } from '@/lib/db';
import { saveEntry } from './actions';
import Image from 'next/image';
import { DateTime } from 'luxon';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const rows = (await sql/*sql*/`
    select image_url from daily_images
    order by image_day desc
    limit 1
  `) as { image_url: string }[];
  const imageUrl = rows[0]?.image_url;

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
        <Image
          src={imageUrl}
          alt="Daily image"
          width={1200}
          height={800}
          className="w-full h-auto rounded"
          priority
        />
      )}
    </main>
  );
}