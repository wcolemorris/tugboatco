import { sql } from "@/lib/db";
import { saveEntry } from "./actions";
import Image from "next/image";

export default async function Page() {
  const rows = (await sql/*sql*/`
    select image_url from daily_images
    order by image_day desc
    limit 1
  `) as { image_url: string }[];
  const imageUrl = rows[0]?.image_url;

  return (
    <main className="mx-auto max-w-xl p-6 space-y-6">
      <h1 className="text-3xl font-bold">Tugboat.co</h1>
      <p>
        Enter anything. Each day, one entry is picked at random to generate the
        day&apos;s tugboat.
      </p>

      <form action={saveEntry} className="flex flex-col gap-3 max-w-xl">
        <input
          name="value"
          placeholder="Describe tomorrow&apos;s tugboat..."
          className="border rounded p-2"
          required
        />
        <input type="hidden" name="ip" value="" />
        <input type="hidden" name="ua" value="" />
        <button className="border rounded px-4 py-2 w-fit">Submit</button>
      </form>

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