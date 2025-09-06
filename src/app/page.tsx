// app/page.tsx
import { sql } from '@/lib/db';
import { saveEntry } from './actions';

export default async function Page() {
  const { rows } = await sql/*sql*/`
    select image_url from daily_images
    order by image_day desc
    limit 1
  `;
  const imageUrl = rows[0]?.image_url as string | undefined;

  return (
    <main className="mx-auto max-w-xl p-6 space-y-6">
      <h1 className="text-3xl font-bold">Daily Image</h1>
      <p>Enter anything. Each day, one entry is picked at random and turned into an AI image.</p>

      <form action={saveEntry} className="flex flex-col gap-3 max-w-xl">
        <input
          name="value"
          placeholder="Describe today's idea..."
          className="border rounded p-2"
          required
        />
        {/* pass IP/UA if you want to store them */}
        <input type="hidden" name="ip" value="" />
        <input type="hidden" name="ua" value="" />
        <button className="border rounded px-4 py-2 w-fit">Submit</button>
      </form>

      {imageUrl && <img src={imageUrl} alt="Daily image" className="w-full rounded" />}
    </main>
  );
}